"""Export page-image OCR with positions. Does not write to the database."""
import argparse
import hashlib
import json
import sys
from pathlib import Path


def select_pages(spec, total):
    if spec == "all":
        return list(range(1, total + 1))
    selected = set()
    try:
        for part in spec.split(","):
            ends = part.strip().split("-")
            if len(ends) == 1:
                selected.add(int(ends[0]))
            elif len(ends) == 2:
                first, last = map(int, ends)
                if first > last:
                    raise ValueError("Reversed page range")
                selected.update(range(first, last + 1))
            else:
                raise ValueError("Invalid page range")
    except ValueError as exc:
        raise ValueError("Use --pages all, 4-5, or 4,5,6.") from exc
    if not selected or min(selected) < 1 or max(selected) > total:
        raise ValueError(f"Pages must be between 1 and {total}.")
    return sorted(selected)


def normalize_blocks(result):
    blocks = []
    for box, text, score in result or []:
        points = [[float(x), float(y)] for x, y in box]
        blocks.append({
            "text": str(text),
            "confidence": float(score),
            "box": points,
            "x_min": min(point[0] for point in points),
            "y_min": min(point[1] for point in points),
            "x_max": max(point[0] for point in points),
            "y_max": max(point[1] for point in points),
        })
    return sorted(blocks, key=lambda block: (block["y_min"], block["x_min"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf_path")
    parser.add_argument("--output", required=True)
    parser.add_argument("--pages", default="all")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    source = Path(args.pdf_path).resolve()
    destination = Path(args.output).resolve()
    if not source.is_file():
        parser.error(f"PDF not found: {source}")
    if destination == source:
        parser.error("The output must not replace the original PDF.")
    if destination.exists() and not args.overwrite:
        parser.error("Output already exists. Use a different filename or --overwrite.")

    try:
        import numpy as np
        from pypdf import PdfReader
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as exc:
        parser.exit(1, f"Missing dependency: {exc}. Install the listed OCR dependencies first.\n")

    try:
        reader = PdfReader(str(source))
        page_numbers = select_pages(args.pages, len(reader.pages))
        engine = RapidOCR()
        pages = []
        for number in page_numbers:
            page = reader.pages[number - 1]
            images = list(page.images)
            if len(images) != 1:
                raise ValueError(
                    f"Page {number} has {len(images)} images, not one full-page scan. "
                    "Stop: this exporter is intentionally limited to single-image scanned pages."
                )
            image = images[0].image.convert("RGB")
            # RapidOCR's NumPy image input uses OpenCV BGR channel order.
            pixels = np.asarray(image)[:, :, ::-1].copy()
            result, _elapsed = engine(pixels)
            blocks = normalize_blocks(result)
            if not blocks:
                raise ValueError(f"OCR found no text on page {number}; no export was written.")
            pages.append({
                "page_number": number,
                "width": image.width,
                "height": image.height,
                "blocks": blocks,
            })
            print(f"Page {number}/{len(reader.pages)}: {len(blocks)} text blocks", flush=True)

        payload = {
            "format": "burundi-law-ocr-v1",
            "source_filename": source.name,
            "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "source_page_count": len(reader.pages),
            "exported_page_numbers": page_numbers,
            "exported_page_count": len(pages),
            "ocr_engine": "rapidocr-onnxruntime",
            "verified": False,
            "notice": "OCR candidates only. No administrative assignments or names are verified.",
            "pages": pages,
        }
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
        print(f"Export complete: {len(pages)} pages. Output: {destination}", flush=True)
        print("No database changes were made.", flush=True)
    except Exception as exc:
        parser.exit(1, f"OCR export failed: {type(exc).__name__}: {exc}\n")


if __name__ == "__main__":
    main()
