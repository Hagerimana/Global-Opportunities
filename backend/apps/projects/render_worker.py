"""Bounded PDF rendering worker, launched as a separate process."""

import json
import math
from pathlib import Path
import sys

import pypdfium2 as pdfium


def render_document(source_path, output_directory, limits):
    output_directory = Path(output_directory)
    output_directory.mkdir(parents=True, exist_ok=True)

    scale = float(limits["scale"])
    max_pages = int(limits["max_pages"])
    max_page_pixels = int(limits["max_page_pixels"])
    max_total_pixels = int(limits["max_total_pixels"])
    max_output_bytes = int(limits["max_output_bytes"])

    document = pdfium.PdfDocument(source_path)

    try:
        page_count = len(document)

        if page_count < 1 or page_count > max_pages:
            raise ValueError("Page count exceeds reader limits.")

        total_pixels = 0
        total_bytes = 0
        pages = []

        for index in range(page_count):
            page = document[index]

            try:
                width_points, height_points = page.get_size()

                if (
                    not math.isfinite(width_points)
                    or not math.isfinite(height_points)
                    or width_points <= 0
                    or height_points <= 0
                ):
                    raise ValueError("Invalid page dimensions.")

                width = math.ceil(width_points * scale)
                height = math.ceil(height_points * scale)
                pixels = width * height

                if pixels > max_page_pixels:
                    raise ValueError("Page exceeds reader image limits.")

                total_pixels += pixels

                if total_pixels > max_total_pixels:
                    raise ValueError("Document exceeds total image limits.")

                bitmap = page.render(scale=scale)

                try:
                    image = bitmap.to_pil()

                    try:
                        output_path = output_directory / f"{index + 1}.png"
                        image.save(output_path, format="PNG")

                        actual_width, actual_height = image.size
                    finally:
                        image.close()
                finally:
                    bitmap.close()

                total_bytes += output_path.stat().st_size

                if total_bytes > max_output_bytes:
                    raise ValueError("Rendered output exceeds storage limits.")

                pages.append(
                    {
                        "page_number": index + 1,
                        "width": actual_width,
                        "height": actual_height,
                    }
                )

            finally:
                page.close()

        manifest = {"pages": pages}

        (output_directory / "manifest.json").write_text(
            json.dumps(manifest),
            encoding="utf-8",
        )

    finally:
        document.close()


def main():
    if len(sys.argv) != 4:
        raise ValueError("Expected source, output directory, and limits.")

    render_document(
        source_path=sys.argv[1],
        output_directory=sys.argv[2],
        limits=json.loads(sys.argv[3]),
    )


if __name__ == "__main__":
    main()
