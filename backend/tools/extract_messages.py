"""Extract gettext message ids from the backend source tree.

The project deliberately has no gettext tooling dependency (no xgettext, polib,
or babel). This small AST walker collects every literal passed to ``_``,
``gettext``, ``gettext_lazy``, ``ngettext`` or ``ngettext_lazy`` so the message
catalogues can be generated and verified from Python alone.
"""

from __future__ import annotations

import argparse
import ast
from pathlib import Path


ROOTS = ("apps", "config")
GETTEXT_NAMES = {
    "_",
    "_lazy",
    "gettext",
    "gettext_lazy",
    "gettext_noop",
    "ngettext",
    "ngettext_lazy",
    "pgettext",
    "pgettext_lazy",
}


def _callee_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def extract_from_file(path: Path) -> list[tuple[int, str]]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    found: list[tuple[int, str]] = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if _callee_name(node.func) not in GETTEXT_NAMES:
            continue
        if not node.args:
            continue
        first = node.args[0]
        if isinstance(first, ast.Constant) and isinstance(first.value, str):
            found.append((node.lineno, first.value))

    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print a JSON array of unique message ids.",
    )
    args = parser.parse_args()

    messages: dict[str, list[str]] = {}

    for root_name in ROOTS:
        base = args.root / root_name
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.py")):
            relative = path.relative_to(args.root).as_posix()
            for line, text in extract_from_file(path):
                messages.setdefault(text, []).append(f"{relative}:{line}")

    if args.json:
        import json

        print(json.dumps(sorted(messages), ensure_ascii=False, indent=2))
    else:
        print(f"{len(messages)} unique message ids")
        print()
        for text in sorted(messages):
            locations = ", ".join(messages[text])
            print(f"{text!r}\n    {locations}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
