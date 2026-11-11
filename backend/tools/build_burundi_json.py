"""Export one candidate JSON per commune and a combined dataset. No DB writes."""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path


def group_communes(records, flags, audit, expected):
    grouped = defaultdict(list)
    for row in records:
        grouped[(row["province"], row["commune"])].append({
            "name": row["name"],
            "kind": row["kind"],
            "source_zone": row["source_zone"],
            "source_page": row["source_page"],
            "source_number": row["source_number"],
            "raw_text": row["raw_text"],
            "ocr_confidence": row["ocr_confidence"],
            "is_verified": False,
        })
    audit_index = {(r["province"], r["commune"]): r for r in audit}
    output = []
    for province, communes in expected.items():
        for commune in communes:
            locality_rows = grouped[(province, commune)]
            relevant_flags = [
                flag for flag in flags
                if flag.get("province") == province and flag.get("commune") == commune
            ]
            output.append({
                "province": province,
                "commune": commune,
                "verification_status": "UNVERIFIED_OCR_CANDIDATES",
                "import_ready": False,
                "counts": audit_index[(province, commune)],
                "review_flags": relevant_flags,
                "collines_quartiers": locality_rows,
            })
    return output


def write_json(path, value):
    with path.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("json_path")
    parser.add_argument("--out", default="../docs/burundi_locations")
    args = parser.parse_args()
    try:
        # Keep audit_burundi_localities.py beside this script in backend/tools/.
        from audit_burundi_localities import EXPECTED, parse
        source = Path(args.json_path)
        data = json.loads(source.read_text(encoding="utf-8"))
        if data.get("format") != "burundi-law-ocr-v1":
            raise ValueError("Unexpected input format; use the existing OCR JSON.")
        if sorted(page["page_number"] for page in data["pages"]) != list(range(1, 79)):
            raise ValueError("Input must contain all 78 pages exactly once.")
        out = Path(args.out)
        if out.exists() and any(out.iterdir()):
            raise ValueError("Output directory is not empty; choose another --out directory to preserve existing files.")
        records, flags, audit = parse(data)
        communes = group_communes(records, flags, audit, EXPECTED)
        out.mkdir(parents=True, exist_ok=True)
        commune_directory = out / "communes"
        commune_directory.mkdir()
        for commune in communes:
            filename = re.sub(r"[^a-z0-9]+", "_", (commune["province"] + "_" + commune["commune"]).lower()).strip("_")
            write_json(commune_directory / (filename + ".json"), commune)
        summary = {
            "commune_files": len(communes),
            "candidate_localities": len(records),
            "expected_localities": 3044,
            "communes_with_matching_counts": sum(bool(row["counts_match"]) for row in audit),
            "review_flags": len(flags),
            "database_modified": False,
            "import_ready": False,
        }
        payload = {
            "format": "burundi-locality-candidates-v1",
            "source_filename": data.get("source_filename"),
            "source_sha256": data.get("source_sha256"),
            "verification_status": "UNVERIFIED_OCR_CANDIDATES",
            "notice": "Matching counts do not verify spelling or administrative assignments. Missing rows are not invented.",
            "summary": summary,
            "communes": communes,
        }
        write_json(out / "burundi_communes_localities.json", payload)
        write_json(out / "review_flags.json", flags)
        write_json(out / "summary.json", summary)
        print(json.dumps(summary, indent=2))
        print(f"JSON files saved in: {out.resolve()}")
    except (ImportError, OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f"JSON export failed: {exc}\n")


if __name__ == "__main__":
    main()
