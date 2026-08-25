"""Run image classification on a local image using a trained model checkpoint."""

from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image
import torch
from torch import nn
from torchvision.models import resnet18, ResNet18_Weights

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True, help="Path to an image file")
    parser.add_argument(
        "--model",
        type=Path,
        default=PROJECT_ROOT / "models" / "cifar10_resnet18.pt",
        help="Path to trained PyTorch model checkpoint",
    )
    parser.add_argument("--top-k", type=int, default=3, help="Show top-k predicted classes")
    return parser.parse_args()


def load_classifier(checkpoint_path: Path, device: torch.device):
    if not checkpoint_path.is_file():
        raise SystemExit(f"Model checkpoint not found: {checkpoint_path}. Train it first using scripts/train.py")

    checkpoint = torch.load(checkpoint_path, map_location=device)
    class_names = checkpoint.get("class_names", [])

    model = resnet18()
    model.fc = nn.Linear(model.fc.in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device).eval()

    return model, class_names


def classify_image(image_path: Path, checkpoint_path: Path, top_k: int = 3):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, class_names = load_classifier(checkpoint_path, device)

    weights = ResNet18_Weights.DEFAULT
    transform = weights.transforms()

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.inference_mode():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1).squeeze(0)

    top_probs, top_indices = torch.topk(probs, min(top_k, len(class_names)))

    print(f"\n--- Predictions for {image_path.name} ---")
    for prob, idx in zip(top_probs, top_indices):
        print(f"• {class_names[idx]}: {prob.item():.2%}")


def main() -> None:
    args = parse_args()
    classify_image(args.image, args.model, args.top_k)


if __name__ == "__main__":
    main()
