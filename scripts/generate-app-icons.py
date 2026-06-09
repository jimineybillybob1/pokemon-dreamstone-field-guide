import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "icons" / "app-icon-master.png"
ICONS = [
    ("app-icon-512.png", 512),
    ("app-icon-192.png", 192),
    ("apple-touch-icon.png", 180),
    ("apple-touch-icon-167x167.png", 167),
    ("apple-touch-icon-152x152.png", 152),
    ("apple-touch-icon-120x120.png", 120),
    ("favicon-32x32.png", 32),
    ("favicon-16x16.png", 16),
]

with Image.open(SOURCE) as source:
    source = source.convert("RGB")
    for filename, size in ICONS:
        icon = source.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(SOURCE.parent / filename, "PNG", optimize=True)

print(
    json.dumps(
        {
            "source": str(SOURCE.relative_to(ROOT)),
            "icons": [{"filename": filename, "size": size} for filename, size in ICONS],
        },
        indent=2,
    )
)
