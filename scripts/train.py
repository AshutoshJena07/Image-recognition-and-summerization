"""Train a transfer-learning classifier from CIFAR-10/100 or a folder-per-class image dataset."""

from __future__ import annotations

import argparse
import random
import ssl
import sys
from pathlib import Path

# Disable SSL verification for dataset downloads
ssl._create_default_https_context = ssl._create_unverified_context

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
from torchvision.models import ResNet18_Weights, resnet18

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=str,
        choices=["cifar10", "cifar100", "folder"],
        default="cifar10",
        help="Dataset to train on ('cifar10', 'cifar100', or 'folder')",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=None,
        help="Folder containing class subfolders (required if --dataset=folder)",
    )
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--output", type=Path, default=None)
    return parser.parse_args()


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> float:
    correct = total = 0
    model.eval()
    with torch.inference_mode():
        for images, targets in loader:
            predictions = model(images.to(device)).argmax(dim=1).cpu()
            correct += (predictions == targets).sum().item()
            total += targets.size(0)
    return correct / total if total else 0.0


def load_data(args: argparse.Namespace, transform: transforms.Compose):
    cache_dir = PROJECT_ROOT / "data" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    if args.dataset == "cifar10":
        train_set = datasets.CIFAR10(root=str(cache_dir), train=True, download=True, transform=transform)
        test_set = datasets.CIFAR10(root=str(cache_dir), train=False, download=True, transform=transform)
        classes = train_set.classes
        return train_set, test_set, classes

    if args.dataset == "cifar100":
        train_set = datasets.CIFAR100(root=str(cache_dir), train=True, download=True, transform=transform)
        test_set = datasets.CIFAR100(root=str(cache_dir), train=False, download=True, transform=transform)
        classes = train_set.classes
        return train_set, test_set, classes

    if not args.data_dir or not args.data_dir.is_dir():
        raise SystemExit(f"Please provide a valid --data-dir path for folder dataset.")

    dataset = datasets.ImageFolder(str(args.data_dir), transform=transform)
    if len(dataset.classes) < 2:
        raise SystemExit("Add images in at least two class subfolders.")

    val_size = max(1, int(len(dataset) * args.validation_split))
    train_size = len(dataset) - val_size
    train_set, test_set = random_split(dataset, [train_size, val_size])
    return train_set, test_set, dataset.classes


def main() -> None:
    args = parse_args()
    torch.manual_seed(42)
    random.seed(42)

    weights = ResNet18_Weights.DEFAULT
    transform = weights.transforms()

    print(f"Preparing {args.dataset.upper()} dataset...")
    train_set, val_set, classes = load_data(args, transform)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=0)

    print(f"Initializing ResNet18 classifier for {len(classes)} classes: {classes}")
    model = resnet18(weights=weights)
    for parameter in model.parameters():
        parameter.requires_grad = False

    model.fc = nn.Linear(model.fc.in_features, len(classes))
    model.to(device)

    optimizer = torch.optim.Adam(model.fc.parameters(), lr=args.learning_rate)
    criterion = nn.CrossEntropyLoss()
    best_accuracy = 0.0

    output_path = args.output or (PROJECT_ROOT / "models" / f"{args.dataset}_resnet18.pt")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Training on {device} | {len(train_set)} train samples, {len(val_set)} validation samples.")
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        for images, targets in train_loader:
            optimizer.zero_grad()
            outputs = model(images.to(device))
            loss = criterion(outputs, targets.to(device))
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * targets.size(0)

        val_acc = evaluate(model, val_loader, device)
        avg_loss = running_loss / len(train_set)
        print(f"Epoch {epoch}/{args.epochs} | Loss: {avg_loss:.4f} | Val Accuracy: {val_acc:.2%}")

        if val_acc >= best_accuracy:
            best_accuracy = val_acc
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "class_names": classes,
                    "dataset": args.dataset,
                    "val_accuracy": best_accuracy,
                },
                output_path,
            )

    print(f"\nTraining complete! Best model saved to: {output_path} (Accuracy: {best_accuracy:.2%})")


if __name__ == "__main__":
    main()
