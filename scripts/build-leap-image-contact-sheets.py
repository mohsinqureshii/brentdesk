#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content" / "leap-deepfest-2026" / "images" / "final"
OUT = ROOT / "content" / "leap-deepfest-2026" / "images" / "qa-sheets"

OUT.mkdir(parents=True, exist_ok=True)
files = sorted(SOURCE.glob("*.webp"))
font = ImageFont.load_default()
for sheet_index in range(4):
    subset = files[sheet_index * 25:(sheet_index + 1) * 25]
    sheet = Image.new("RGB", (1600, 1000), "#08111f")
    draw = ImageDraw.Draw(sheet)
    for index, file_path in enumerate(subset):
        row, col = divmod(index, 5)
        with Image.open(file_path) as image:
            thumb = image.convert("RGB").resize((310, 174), Image.Resampling.LANCZOS)
        x, y = col * 320 + 5, row * 200 + 5
        sheet.paste(thumb, (x, y))
        label = file_path.name.split("-", 1)[0]
        draw.rectangle((x, y + 174, x + 310, y + 194), fill="#111d31")
        draw.text((x + 6, y + 178), label, fill="white", font=font)
    sheet.save(OUT / f"images-{sheet_index * 25 + 1:03d}-{(sheet_index + 1) * 25:03d}.jpg", quality=88)
print(f"created=4 images={len(files)} output={OUT}")
