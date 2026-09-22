from pathlib import Path
from PIL import Image

# Project root
PROJECT_DIR = Path(__file__).resolve().parent

# Your image dataset
DATASET_DIR = PROJECT_DIR / "data" / "images"

FORMAT_EXTENSIONS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
    "GIF": ".gif",
    "BMP": ".bmp",
    "TIFF": ".tiff",
}

total = 0
renamed = 0
failed = 0
skipped = 0

print("Scanning:", DATASET_DIR)
print()

for file_path in DATASET_DIR.rglob("*"):

    if not file_path.is_file():
        continue

    total += 1

    # Skip files that already have an extension
    if file_path.suffix:
        skipped += 1
        continue

    try:
        with Image.open(file_path) as img:
            image_format = img.format

        if image_format not in FORMAT_EXTENSIONS:
            print(f"Unknown format: {file_path}")
            failed += 1
            continue

        extension = FORMAT_EXTENSIONS[image_format]

        new_path = file_path.with_name(
            file_path.name + extension
        )

        if new_path.exists():
            print(f"Already exists: {new_path}")
            failed += 1
            continue

        file_path.rename(new_path)

        renamed += 1

        print(
            f"[OK] {file_path.parent.name}: "
            f"{file_path.name} -> {new_path.name}"
        )

    except Exception as e:
        print(f"[FAILED] {file_path}")
        print(f"Reason: {e}")
        failed += 1


print()
print("=" * 40)
print("DONE")
print("=" * 40)
print(f"Total files scanned : {total}")
print(f"Files renamed       : {renamed}")
print(f"Already had extension: {skipped}")
print(f"Failed/unknown      : {failed}")