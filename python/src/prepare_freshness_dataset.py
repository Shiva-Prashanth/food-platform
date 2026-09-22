import os
import shutil
import random

SOURCE_DIR = "../data/freshness"
OUTPUT_DIR = "../data/freshness_dataset"

TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

random.seed(42)

classes = ["good", "bad"]

for class_name in classes:
    source_folder = os.path.join(SOURCE_DIR, class_name)

    images = [
        file for file in os.listdir(source_folder)
        if file.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ]

    random.shuffle(images)

    total = len(images)

    train_end = int(total * TRAIN_RATIO)
    val_end = train_end + int(total * VAL_RATIO)

    train_images = images[:train_end]
    val_images = images[train_end:val_end]
    test_images = images[val_end:]

    splits = {
        "train": train_images,
        "validation": val_images,
        "test": test_images
    }

    for split, split_images in splits.items():

        destination_folder = os.path.join(
            OUTPUT_DIR,
            split,
            class_name
        )

        os.makedirs(destination_folder, exist_ok=True)

        for image in split_images:
            source_path = os.path.join(source_folder, image)
            destination_path = os.path.join(destination_folder, image)

            shutil.copy2(source_path, destination_path)

    print(
        class_name,
        "->",
        "Train:", len(train_images),
        "Validation:", len(val_images),
        "Test:", len(test_images)
    )

print("\nDataset preparation completed.")