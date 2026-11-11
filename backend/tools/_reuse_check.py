import json
from pathlib import Path

base = Path(__file__).resolve().parents[2] / "frontend" / "messages"
msgids = json.loads(
    (Path(__file__).resolve().parents[1] / ".." / "docs" / "i18n" / "backend-msgids.json")
    .resolve()
    .read_text(encoding="utf-8")
)

locales = ["en", "fr", "rn", "sw"]
trees = {}
for locale in locales:
    data = {}
    for name in ("app.json", "common.json", "landing.json"):
        path = base / locale / name
        if path.exists():
            data[name] = json.loads(path.read_text(encoding="utf-8"))
    trees[locale] = data


def walk(node, prefix=()):
    if isinstance(node, dict):
        for key, value in node.items():
            yield from walk(value, prefix + (key,))
    elif isinstance(node, str):
        yield prefix, node


index = {}
for name, tree in trees["en"].items():
    for path, value in walk(tree):
        index.setdefault(value, []).append((name,) + path)

found = {}
for msgid in msgids:
    matches = index.get(msgid)
    if not matches:
        continue
    name, *path = matches[0]
    values = {locale: trees[locale][name] for locale in locales}
    resolved = {}
    for locale in locales:
        node = values[locale]
        try:
            for key in path:
                node = node[key]
            resolved[locale] = node
        except (KeyError, TypeError):
            resolved[locale] = None
    found[msgid] = resolved

print(f"{len(found)} of {len(msgids)} msgids reused from frontend catalogues")
print(json.dumps(found, ensure_ascii=False, indent=2))
