"""Download common-fish candidate thumbnails and make a visual review sheet."""

import io
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "content/research/common-photo-candidates.json"
REVIEW = ROOT / "content/research/common-photo-review"
AGENT = "FishAtlas/0.5 (educational atlas; photo identity review)"


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    rows = json.loads(CANDIDATES.read_text())
    selected = []
    for row in rows:
        photo = next((photo for photo in row["photos"] if photo["eligible"]), None)
        if not photo:
            continue
        slug = row["scientific"].lower().replace(" ", "-")
        suffix = Path(photo["fileTitle"]).suffix.lower()
        path = REVIEW / (slug + suffix)
        if not path.exists():
            try:
                request = urllib.request.Request(photo["url"], headers={"User-Agent": AGENT})
                with urllib.request.urlopen(request, timeout=50) as response:
                    content = response.read()
                with Image.open(io.BytesIO(content)) as image:
                    image.verify()
                path.write_bytes(content)
                print("Downloaded", row["scientific"], flush=True)
                time.sleep(0.7)
            except urllib.error.HTTPError as error:
                print("Stopped at HTTP", error.code, row["scientific"], flush=True)
                if error.code == 429:
                    break
                continue
        try:
            with Image.open(path) as image:
                if image.format not in ("JPEG", "PNG", "WEBP") or min(image.size) < 300:
                    raise ValueError("Invalid image")
        except (OSError, ValueError) as error:
            print("Invalid", row["scientific"], error)
            continue
        selected.append({"scientific": row["scientific"], "fileTitle": photo["fileTitle"], "path": str(path)})

    (REVIEW / "downloaded.json").write_text(json.dumps(selected, ensure_ascii=False, indent=2) + "\n")
    columns = 5
    cell_w, cell_h = 320, 280
    sheet = Image.new("RGB", (columns * cell_w, ((len(selected) + columns - 1) // columns) * cell_h), "#f3f5f7")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
    for i, entry in enumerate(selected):
        x, y = (i % columns) * cell_w, (i // columns) * cell_h
        with Image.open(entry["path"]) as original:
            thumbnail = original.convert("RGB")
            thumbnail.thumbnail((cell_w - 16, cell_h - 58))
            sheet.paste(thumbnail, (x + (cell_w - thumbnail.width) // 2, y + 3))
        draw.text((x + 8, y + cell_h - 48), entry["scientific"], font=font, fill="#111827")
        draw.text((x + 8, y + cell_h - 25), f"#{i+1} {entry['fileTitle'][:34]}", font=font, fill="#4b5563")
    sheet.save(REVIEW / "contact-sheet.jpg", quality=88)
    print(f"Review sheet: {len(selected)} images at {REVIEW / 'contact-sheet.jpg'}")


if __name__ == "__main__":
    main()
