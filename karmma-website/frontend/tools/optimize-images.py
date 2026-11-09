"""Regenerate the optimised web images from the untouched originals.

Usage (from karmma-website/frontend):
    python -I tools/optimize-images.py

Reads the original photos from karmma-website/_archive/original-assets/ (they were moved
there, never deleted) and writes the optimised copies into frontend/assets/:
  - food and restaurant photos as WebP at roughly 2x display size
  - one 320 px (longest side) WebP per menu photo that menu-data.js uses
  - brand icons (favicon.ico, 192/512 PNG, 180 apple-touch icon) and a 256 px logo
  - 1200x630 Open Graph share images (assets/og/)
Needs Pillow only (pip install pillow). Safe to re-run; outputs are overwritten.
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

FRONTEND = Path(__file__).resolve().parents[1]
ARCHIVE = FRONTEND.parent / "_archive" / "original-assets"
ASSETS = FRONTEND / "assets"
LOGO = ASSETS / "brand" / "karmma-kocktails.jpg"
LOGO_NOBG = ASSETS / "brand" / "karmma-kocktails-nobg.png"  # transparent logo, made from LOGO by cutout_logo()


def save_webp(img, dest, quality=80, max_w=None, max_side=None):
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = ImageOps.exif_transpose(img)
    if max_w and img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    if max_side and max(img.size) > max_side:
        scale = max_side / max(img.size)
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    img.save(dest, "WEBP", quality=quality, method=6)
    print(f"  {dest.relative_to(FRONTEND)}  {img.width}x{img.height}  {dest.stat().st_size // 1024} KB")
    return img.size


def content_images():
    print("Content photos")
    save_webp(Image.open(ARCHIVE / "food" / "thali.png"), ASSETS / "food" / "thali.webp", 82, max_w=720)
    save_webp(Image.open(ARCHIVE / "food" / "momos-bamboo-steamer.png"), ASSETS / "food" / "momos-bamboo-steamer.webp", 80, max_w=900)
    # Real Grapevine photos (replaced the earlier stock-style room photo on 2026-11-09)
    bar = Image.open(ARCHIVE / "restaurant" / "grapevine-bar.jpg")
    save_webp(bar, ASSETS / "restaurant" / "hero-bar.webp", 62, max_w=1600)  # home hero background (tinted, so moderate quality is fine)
    save_webp(Image.open(ARCHIVE / "restaurant" / "grapevine-storefront.jpg"), ASSETS / "restaurant" / "storefront-900.webp", 78, max_w=900)
    save_webp(Image.open(ARCHIVE / "restaurant" / "grapevine-bar-wide.jpg"), ASSETS / "restaurant" / "bar-900.webp", 78, max_w=900)
    dining = ImageOps.exif_transpose(Image.open(ARCHIVE / "restaurant" / "grapevine-dining-room.jpg"))
    dining = dining.crop((0, 1274, dining.width, 1274 + round(dining.width * 3 / 4)))  # 4:3 landscape crop of the portrait photo
    save_webp(dining, ASSETS / "restaurant" / "dining-room-900.webp", 78, max_w=900)
    save_webp(Image.open(ARCHIVE / "restaurant" / "catering.jpg"), ASSETS / "restaurant" / "catering-900.webp", 78, max_w=900)


# Crop (left, top, right, bottom as fractions) applied before the 320 px resize: removes the decorative maroon frame, squiggles and
# blurred bands from the supplied square promo-style images, and frames the steamer in the portrait momo photo.
CROPS = {
    "3 - Main Course/Kids Feast.jpg": (0.10, 0.115, 0.97, 0.885),
    "3 - Main Course/2 - Entrees/Himalayan Fish Curry or Shrimp.jpg": (0.03, 0.17, 0.97, 0.83),
    "1 - Appetisers/Steam Momo.jpg": (0.0, 0.0, 1.0, 0.79),
}


def menu_images():
    print("Menu photos (320 px longest side)")
    source = (FRONTEND / "src" / "menu-data.js").read_text(encoding="utf-8")
    block = source.split("const photos = {", 1)[1].split("};", 1)[0]
    pattern = re.compile(r"'([^']+\.(?:jpe?g|png))'|\"([^\"]+\.(?:jpe?g|png))\"", re.I)
    paths = [a or b for a, b in pattern.findall(block)]
    total = 0
    for rel in sorted(set(paths)):
        src = ARCHIVE / "menu" / rel
        if not src.exists():
            sys.exit(f"missing original: {src}")
        dest = (ASSETS / "menu" / rel).with_suffix(".webp")
        pic = Image.open(src).convert("RGB")
        if rel in CROPS:
            l, tp, r, b = CROPS[rel]
            pic = pic.crop((round(l * pic.width), round(tp * pic.height), round(r * pic.width), round(b * pic.height)))
        save_webp(pic, dest, 76, max_side=320)
        total += dest.stat().st_size
    print(f"  {len(set(paths))} menu photos, {total // 1024} KB in total")


def cutout_logo():
    """Remove the cream square behind the logo. Only background connected to the image border is removed,
    so the cream lettering inside the bowl stays. Writes a square transparent PNG (assets/brand/karmma-kocktails-nobg.png)."""
    im = Image.open(LOGO).convert("RGB")
    w, h = im.size
    work = im.copy()
    mark = (255, 0, 255)
    for pt in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if work.getpixel(pt) != mark:
            ImageDraw.floodfill(work, pt, mark, thresh=34)
    r, g, b = work.split()
    is_bg = ImageChops.multiply(ImageChops.multiply(r.point(lambda v: 255 if v == 255 else 0), g.point(lambda v: 255 if v == 0 else 0)),
                                b.point(lambda v: 255 if v == 255 else 0))
    mask = ImageChops.invert(is_bg).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))  # pull edge in 1 px (no cream halo), then soften
    rgba = im.convert("RGBA")
    rgba.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 14
    rgba = rgba.crop((max(box[0] - pad, 0), max(box[1] - pad, 0), min(box[2] + pad, w), min(box[3] + pad, h)))
    side = max(rgba.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2))
    square.save(LOGO_NOBG, optimize=True)
    print(f"  {LOGO_NOBG.relative_to(FRONTEND)}  {square.width}x{square.height}  {LOGO_NOBG.stat().st_size // 1024} KB")
    return square


def brand_images():
    print("Brand icons")
    logo = Image.open(LOGO).convert("RGB")
    nobg = cutout_logo()
    save_webp(nobg, ASSETS / "brand" / "karmma-kocktails-256.webp", 90, max_w=256)  # UI logo: transparent
    for size, name in [(192, "favicon-192.png"), (512, "favicon-512.png"), (180, "apple-touch-icon-180.png")]:
        dest = ASSETS / "brand" / name
        logo.resize((size, size), Image.LANCZOS).save(dest, "PNG", optimize=True)
        print(f"  {dest.relative_to(FRONTEND)}  {dest.stat().st_size // 1024} KB")
    ico = FRONTEND / "favicon.ico"
    logo.resize((256, 256), Image.LANCZOS).save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"  favicon.ico  {ico.stat().st_size // 1024} KB")


def font(size, bold=False):
    for name in (["georgiab.ttf", "timesbd.ttf", "DejaVuSerif-Bold.ttf"] if bold else ["georgia.ttf", "times.ttf", "DejaVuSerif.ttf"]):
        for folder in ("C:/Windows/Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            candidate = Path(folder) / name
            if candidate.exists():
                return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


# file, photo (relative to _archive/original-assets), title, subtitle
OG = [
    ("og-home.jpg", "restaurant/grapevine-bar.jpg", "Karmma & Kocktails", "Nepali & Indian restaurant and bar  |  Grapevine and Dallas, TX"),
    ("og-grapevine.jpg", "food/thali.png", "Karmma & Kocktails", "Nepali & Indian restaurant and bar  |  Grapevine, TX"),
    ("og-dallas.jpg", "food/momos-bamboo-steamer.png", "Karmma & Kocktails", "Nepali & Indian restaurant and bar  |  Trinity Groves, Dallas"),
    ("og-menu.jpg", "food/thali.png", "Menus", "Grapevine and Dallas  |  Karmma & Kocktails"),
    ("og-menu-grapevine.jpg", "food/momos-bamboo-steamer.png", "Grapevine Menu", "Momos, curries, biryani, tandoori  |  Karmma & Kocktails"),
    ("og-menu-dallas.jpg", "food/thali.png", "Dallas Menu", "Momos, cocktails, happy hour  |  Karmma & Kocktails"),
    ("og-happy-hour.jpg", "food/momos-bamboo-steamer.png", "Happy Hour", "Trinity Groves, Dallas  |  Karmma & Kocktails"),
    ("og-catering.jpg", "restaurant/catering.jpg", "Indian & Nepali Catering", "Grapevine, Dallas and DFW  |  Call to order"),
    ("og-events.jpg", "restaurant/grapevine-bar-wide.jpg", "Private Events", "Grapevine and Dallas  |  Karmma & Kocktails"),
    ("og-about.jpg", "restaurant/grapevine-storefront.jpg", "Our Story", "Nepali flavors in Texas  |  Karmma & Kocktails"),
]


def og_images():
    print("Open Graph images (1200x630)")
    W, H = 1200, 630
    logo = Image.open(LOGO_NOBG).convert("RGBA").resize((120, 120), Image.LANCZOS)
    for name, photo, title, sub in OG:
        base = ImageOps.fit(Image.open(ARCHIVE / photo).convert("RGB"), (W, H), Image.LANCZOS)
        shade = Image.new("RGBA", (W, H))
        px = shade.load()
        for x in range(W):
            alpha = int(235 * max(0.0, 1 - x / (W * 0.95)) ** 0.8) + 30
            for y in range(H):
                px[x, y] = (53, 11, 25, min(alpha, 245))
        base = Image.alpha_composite(base.convert("RGBA"), shade).convert("RGB")
        draw = ImageDraw.Draw(base)
        base.paste(logo, (70, 70), logo)
        tf, sf = font(64, True), font(30)
        y = 250
        for line in wrap(draw, title, tf, 720):
            draw.text((70, y), line, font=tf, fill=(246, 223, 160))
            y += 78
        y += 14
        for line in wrap(draw, sub, sf, 700):
            draw.text((70, y), line, font=sf, fill=(255, 245, 229))
            y += 42
        dest = ASSETS / "og" / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        base.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
        print(f"  {dest.relative_to(FRONTEND)}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if not ARCHIVE.exists():
        sys.exit(f"originals not found at {ARCHIVE}")
    content_images()
    menu_images()
    brand_images()
    og_images()
