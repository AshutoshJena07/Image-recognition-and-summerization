"""Download and export CIFAR-10 dataset into organized class image folders."""

from __future__ import annotations

import argparse
import ssl
from pathlib import Path
from PIL import Image
from torchvision.datasets import CIFAR10

# Disable SSL verification for Toronto University server download
ssl._create_default_https_context = ssl._create_unverified_context

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "data" / "raw" / "cifar10",
        help="Folder where train and test images will be extracted by class",
    )
    parser.add_argument(
        "--max-images-per-class",
        type=int,
        default=None,
        help="Optional limit on how many images to export per class (default: export all)",
    )
    return parser.parse_args()


def export_split(dataset: CIFAR10, split_dir: Path, max_per_class: int | None = None) -> None:
    counts: dict[str, int] = {cls: 0 for cls in dataset.classes}
    split_dir.mkdir(parents=True, exist_ok=True)

    for i, (img, target) in enumerate(dataset):
        class_name = dataset.classes[target]
        if max_per_class and counts[class_name] >= max_per_class:
            continue

        class_folder = split_dir / class_name
        class_folder.mkdir(parents=True, exist_ok=True)

        counts[class_name] += 1
        img_path = class_folder / f"{class_name}_{counts[class_name]:05d}.png"
        img.save(img_path)

        if (i + 1) % 5000 == 0 or (i + 1) == len(dataset):
            print(f"Exported {i + 1}/{len(dataset)} images to {split_dir}...")

    print(f"Done exporting {sum(counts.values())} images to {split_dir}.")


def main() -> None:
    args = parse_args()
    raw_cifar_cache = PROJECT_ROOT / "data" / "cache"
    raw_cifar_cache.mkdir(parents=True, exist_ok=True)

    print("Downloading CIFAR-10 dataset (if not already cached)...")
    train_data = CIFAR10(root=str(raw_cifar_cache), train=True, download=True)
    test_data = CIFAR10(root=str(raw_cifar_cache), train=False, download=True)

    print(f"Classes: {train_data.classes}")
    print(f"Exporting training images to {args.output_dir / 'train'}...")
    export_split(train_data, args.output_dir / "train", args.max_images_per_class)

    print(f"Exporting testing images to {args.output_dir / 'test'}...")
    export_split(test_data, args.output_dir / "test", args.max_images_per_class)

    print(f"\nCIFAR-10 dataset successfully created at: {args.output_dir}")


if __name__ == "__main__":
    main()
