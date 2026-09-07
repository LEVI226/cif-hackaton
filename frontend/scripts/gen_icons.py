from PIL import Image, ImageDraw, ImageFont

TEAL = (14, 107, 96, 255)


def make_icon(size: int, path: str) -> None:
    img = Image.new("RGBA", (size, size), TEAL)
    draw = ImageDraw.Draw(img)
    text = "S"
    font_size = int(size * 0.55)
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]),
        text,
        fill="white",
        font=font,
    )
    img.save(path)


make_icon(192, "public/pwa-192.png")
make_icon(512, "public/pwa-512.png")
print("icons written")
