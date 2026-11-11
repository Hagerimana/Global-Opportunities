/**
 * Checks that every `<Stagger>` actually staggers.
 *
 * The mechanism is that `Stagger` clones its direct children with
 * `staggerIndex` and `staggerStep`, which only works if each direct child is a
 * component that accepts those two props and hands them to a `<Reveal>`. Two
 * things break that quietly, and both have shipped here at least once:
 *
 *   1. A host element as the direct child. `<Stagger><div>...</div></Stagger>`
 *      makes React put `staggerIndex` on a DOM node, which warns in the console
 *      and does nothing useful -- the real `<Reveal>` inside is never reached.
 *   2. A wrapper component that accepts `staggerIndex` and forgets it, or
 *      forwards only one of the two. Nothing warns. `Reveal` defaults
 *      `staggerStep` to 70, so the grid keeps cascading and nobody finds out
 *      until the `step` on the `Stagger` is changed and the timing stops
 *      responding to it.
 *
 * Both are invisible in review, because the markup reads correctly and the
 * effect is a missing animation rather than an error. So this is a check, not
 * a lint rule: a cascade that silently stops is the kind of regression that
 * ships.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dir = path.join(root, "components");

const files = [];
(function walk(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith(".tsx")) files.push(full);
  }
})(dir);

const PROPS = ["staggerIndex", "staggerStep"];

/** Host elements: lowercase, and not a member expression like `motion.div`. */
function isHostElement(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

/** Component names defined in a file, as `function Name(` or `const Name =`. */
function localComponents(source) {
  const names = new Set();
  for (const match of source.matchAll(/(?:function|const)\s+([A-Z][A-Za-z0-9]*)/g)) {
    names.add(match[1]);
  }
  return names;
}

/** The text of a `type X = { ... };` block, for an inline or named props type. */
function typeAliasBody(source, name) {
  const start = source.search(new RegExp(`\\btype\\s+${name}\\s*=\\s*\\{`, "m"));
  if (start === -1) return "";
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace, index + 1);
    }
  }
  return source.slice(brace);
}

/**
 * Everything about one component: the signature, its props type, and its body.
 *
 * The props type is included whether it is inline (`}: { foo: string }) =>` or a
 * named alias (`}: CardProps) {`) -- `discovery.tsx` and `features.tsx` disagree
 * on this, and both are reasonable, so the check has to cope with either.
 */
function componentText(source, name) {
  const start = source.search(
    new RegExp(`(?:function\\s+${name}\\s*\\(|(?:const|let)\\s+${name}\\s*=)`, "m")
  );
  if (start === -1) return { signature: "", body: "" };

  const rest = source.slice(start);
  // Stop at the next top-level declaration: a line at column zero that starts a
  // new statement or a comment banner.
  const stop = rest.slice(1).search(/\n(?:export\s+)?(?:function|const|let|type|\/\*)/);
  const declaration = stop === -1 ? rest : rest.slice(0, stop + 1);

  // The signature runs to the arrow or the body brace, whichever comes first.
  const signatureEnd = declaration.search(/=>\s*\{|\)\s*\{/);
  const signature = signatureEnd === -1 ? declaration : declaration.slice(0, signatureEnd);
  const body = signatureEnd === -1 ? "" : declaration.slice(signatureEnd);

  const named = signature.match(/:\s*([A-Z][A-Za-z0-9]*)\s*\)?\s*$/);
  const propsType = named ? typeAliasBody(source, named[1]) : signature;

  return { propsType, body };
}

/**
 * The first JSX element beneath a `<Stagger>` opening tag, skipping the tag
 * itself and any JSX comment wrapper on the way.
 */
function firstChildTag(lines, startLine) {
  let pending = lines[startLine].replace(/<Stagger\b[^>]*>?/, "").replace(/^\s*/, "");
  for (let index = startLine; index < Math.min(startLine + 40, lines.length); index += 1) {
    if (index > startLine) pending = lines[index];
    const match = pending.match(/<([A-Za-z][A-Za-z0-9.]*)\b/);
    if (match) return match[1].split(".")[0];
  }
  return null;
}

let problems = 0;
let staggerSites = 0;

for (const file of files) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n");
  const defined = localComponents(source);

  lines.forEach((line, index) => {
    if (!/<Stagger\b/.test(line)) return;
    // Skip the prose: a doc comment that mentions `<Stagger>` is not a usage.
    if (/^\s*(\*|\/\/|\{?\/\*)/.test(line)) return;

    staggerSites += 1;
    const tag = firstChildTag(lines, index);
    const where = `${relative}:${index + 1}`;

    if (!tag) {
      problems += 1;
      console.log(`NO CHILD  ${where}  <Stagger> has no element child to stagger`);
      return;
    }

    if (isHostElement(tag)) {
      problems += 1;
      console.log(
        `HOST TAG  ${where}  <Stagger> > <${tag}>\n` +
          `          A host element cannot take staggerIndex, so the reveal inside it is never\n` +
          `          staggered and React warns about the unknown prop. Make the child a\n` +
          `          <Reveal> that carries the ${tag}'s classes, or a component that forwards both props.`
      );
      return;
    }

    // Not a local component: imported from a primitive or an icon set, so this
    // file cannot be the one that drops the props. Trust the import.
    if (!defined.has(tag)) return;

    const { propsType, body } = componentText(source, tag);

    const undeclared = PROPS.filter(
      (prop) => !new RegExp(`\\b${prop}\\s*\\??:`).test(propsType)
    );
    if (undeclared.length) {
      problems += 1;
      console.log(
        `NO PROPS  ${where}  <Stagger> > <${tag}>, whose props type does not accept ` +
          `${undeclared.join(" and ")}.\n` +
          `          Add them to the type and forward them to the internal <Reveal>.`
      );
      return;
    }

    // Declared, but never mentioned again in the body. That is the "accepts and
    // forgets" case: it renders correctly and simply does not cascade.
    const dropped = PROPS.filter(
      (prop) => !new RegExp(`<Reveal[\\s\\S]{0,400}?\\b${prop}=`, "m").test(body)
    );
    if (dropped.length) {
      problems += 1;
      console.log(
        `DROPPED   ${where}  <${tag}> accepts ${dropped.join(" and ")} but never passes ` +
          `${dropped.length > 1 ? "them" : "it"} to its <Reveal>.`
      );
    }
  });
}

console.log(
  problems
    ? `\n${problems} problem(s) across ${staggerSites} <Stagger> site(s) in ${files.length} file(s).`
    : `All ${staggerSites} <Stagger> site(s) in ${files.length} file(s) forward both stagger props.`
);
process.exit(problems ? 1 : 0);
