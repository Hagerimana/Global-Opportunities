"""Inventory user-facing strings in the backend.

The Django API returns English text in validation errors, service failures and
notification bodies. This script finds those literals so they can be wrapped in
gettext and translated. It is deliberately conservative: docstrings, comments,
SQL, URLs and identifiers are excluded, and only strings that look like prose
are reported.

Usage:
    python tools/i18n_inventory.py

Writes ``docs/i18n/backend-messages.json`` relative to the repository root and
prints a short summary.
"""

from __future__ import annotations

import ast
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
OUTPUT = REPO_ROOT / "docs" / "i18n" / "backend-messages.json"

SKIP_PARTS = {
    "migrations",
    "management",
    "tests",
    "__pycache__",
    "demo_reference",
}

# Constructs whose arguments are shown to an API client or written into a
# notification. Strings elsewhere (logging, admin help, internal asserts) are
# left alone.
USER_FACING_CALLS = {
    "ValidationError",
    "DjangoValidationError",
    "serializers.ValidationError",
    "PermissionDenied",
    "NotFound",
    "NotAuthenticated",
    "AuthenticationFailed",
    "ParseError",
    "UnsupportedMediaType",
    "Throttled",
    "APIException",
    "ProjectRequestError",
    "SessionError",
}

USER_FACING_KEYWORDS = {
    "detail",
    "message",
    "title",
    "body",
    "help_text",
    "error",
    "reason",
    "label",
}


def looks_like_prose(value: str) -> bool:
    """True for a human sentence, not a format string or an identifier."""

    text = value.strip()
    if len(text) < 4:
        return False
    if " " not in text:
        return False
    if text.startswith(("{", "%", "/", "http", "SELECT", "INSERT", "UPDATE")):
        return False
    if "\n" in text and len(text.split()) < 4:
        return False
    # A ratio of letters is the simplest way to reject paths, regexes and
    # dotted import names that happen to contain a space.
    letters = sum(character.isalpha() for character in text)
    return letters >= len(text) * 0.55


def call_name(node: ast.Call) -> str:
    function = node.func
    if isinstance(function, ast.Name):
        return function.id
    if isinstance(function, ast.Attribute):
        parts = []
        current: ast.AST = function
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name):
            parts.append(current.id)
        return ".".join(reversed(parts))
    return ""


def string_nodes(node: ast.AST):
    """Yield every string literal that contributes to a value."""

    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        yield node
    elif isinstance(node, ast.JoinedStr):
        # f-strings are user-facing prose too; report the literal parts so a
        # translator can see the sentence. The placeholders are preserved by
        # gettext at runtime.
        for value in node.values:
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                yield value
    elif isinstance(node, (ast.List, ast.Tuple)):
        for element in node.elts:
            yield from string_nodes(element)
    elif isinstance(node, ast.Dict):
        for element in [*node.keys, *node.values]:
            if element is not None:
                yield from string_nodes(element)
    elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        yield from string_nodes(node.left)
        yield from string_nodes(node.right)


def literal_text(node: ast.Constant, source: str) -> str:
    return node.value


def collect(path: Path) -> list[dict]:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    lines = source.splitlines()
    found: list[dict] = []
    seen: set[tuple[int, str]] = set()

    docstring_nodes: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(
            node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)
        ):
            body = getattr(node, "body", [])
            if (
                body
                and isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and isinstance(body[0].value.value, str)
            ):
                docstring_nodes.add(id(body[0].value))

    def record(node: ast.Constant, kind: str) -> None:
        if id(node) in docstring_nodes:
            return
        value = literal_text(node, source)
        if not looks_like_prose(value):
            return
        key = (getattr(node, "lineno", 0), value)
        if key in seen:
            return
        seen.add(key)
        line = lines[node.lineno - 1].strip() if node.lineno else ""
        found.append(
            {
                "line": node.lineno,
                "kind": kind,
                "text": value,
                "source": line,
            }
        )

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = call_name(node)
            if name in USER_FACING_CALLS:
                for argument in node.args:
                    for string in string_nodes(argument):
                        record(string, name)
                for keyword in node.keywords:
                    if keyword.arg in USER_FACING_KEYWORDS:
                        for string in string_nodes(keyword.value):
                            record(string, f"{name}({keyword.arg}=)")

            # notify/email helpers take title= and message= (or body=).
            for keyword in node.keywords:
                if keyword.arg in USER_FACING_KEYWORDS:
                    for string in string_nodes(keyword.value):
                        record(string, f"{name}({keyword.arg}=)")

        # Any ``raise SomeError("...")`` is an API error unless it is clearly
        # internal; report it so a reviewer can decide.
        if isinstance(node, ast.Raise) and isinstance(node.exc, ast.Call):
            for argument in node.exc.args:
                for string in string_nodes(argument):
                    record(string, f"raise {call_name(node.exc)}")

        # ``obj.detail = "..."`` on an exception or response.
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Attribute) and target.attr in {
                    "detail",
                    "message",
                    "title",
                    "body",
                }:
                    for string in string_nodes(node.value):
                        record(string, f"{target.attr}=")

    return found


def main() -> None:
    results: list[dict] = []
    for path in sorted(BASE_DIR.glob("apps/**/*.py")):
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        try:
            found = collect(path)
        except SyntaxError as error:
            print(f"skip {path}: {error}")
            continue
        if found:
            results.append(
                {
                    "file": str(path.relative_to(BASE_DIR)).replace("\\", "/"),
                    "strings": found,
                }
            )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    total = sum(len(item["strings"]) for item in results)
    OUTPUT.write_text(
        json.dumps(
            {
                "generated_by": "backend/tools/i18n_inventory.py",
                "total": total,
                "files": results,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{total} strings across {len(results)} files")
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
