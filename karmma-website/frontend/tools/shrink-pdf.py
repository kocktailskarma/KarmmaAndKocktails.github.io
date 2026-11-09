"""Shrink a menu PDF by down-sampling its embedded photos (needs PyMuPDF: pip install pymupdf).

Usage (from karmma-website/frontend):
    python -I tools/shrink-pdf.py ../_archive/original-assets/menus/grapevine-menu.pdf assets/menus/grapevine-menu.pdf

The Grapevine PDF embeds ~3900 px page images for a 5 x 7 inch page; 170 dpi keeps the
print look and the text layer and cuts 5.1 MB to about 1 MB.
"""
import sys

import pymupdf

if len(sys.argv) != 3:
    sys.exit(__doc__)
doc = pymupdf.open(sys.argv[1])
doc.rewrite_images(dpi_threshold=200, dpi_target=170, quality=75)
doc.save(sys.argv[2], garbage=4, deflate=True, clean=True)
