const fs = require("fs");
const dir = ".next/static/css";
const file = `${dir}/${fs.readdirSync(dir)[0]}`;
const css = fs.readFileSync(file, "utf8");

// Literal CSS class selectors, as Tailwind emits them (dots and colons escaped).
const wanted = [
  ".h-4\\.5",
  ".h-5\\.5",
  ".w-4\\.5",
  ".mt-18",
  ".grid-lines",
  ".btn-gold",
  ".skip-link",
  ".lg\\:order-3",
  ".lg\\:row-start-3",
  ".lg\\:col-start-3",
  ".grid-rows-\\[0fr\\]",
  ".lg\\:grid-rows-3",
  ".sm\\:min-w-44",
  ".lg\\:grid-cols-\\[1fr_auto_1\\.15fr\\]",
  ".animate-caret",
  ".animate-grow-y",
  ".animate-grow-x",
  ".animate-spin-slow",
  ".text-balance",
  ".text-pretty",
  ".glass-dark",
  ".chip-muted",
  ".btn-ghost-light",
  ".btn-outline",
  ".btn-light",
  ".btn-primary",
  ".ring-conic",
  ".text-gradient-light",
  ".eyebrow-light",
  ".container-x",
];

/*
 * Assertions on behaviour that a class list cannot express.
 *
 * The skip link is the case that matters most and is the easiest to break
 * silently: it is `sr-only` in the markup, so the *absence* of a `.not-sr-only`
 * rule is correct -- `not-sr-only` reaches the output through `@apply` inside
 * `.skip-link:focus-visible`. What has to be checked is that the focus state
 * really does undo the hiding, because a skip link that stays invisible is
 * invisible to exactly the keyboard users it exists for. These are the
 * declarations that undo `sr-only`.
 */
const behaviour = [
  [
    "skip link becomes visible on focus",
    /\.skip-link:focus-visible\{[^}]*width:auto/,
  ],
  ["skip link is clipped no more", /\.skip-link:focus-visible\{[^}]*clip:auto/],
  [
    "skip link keeps its fixed placement",
    /\.skip-link:focus-visible\{[^}]*position:fixed/,
  ],
  // A gradient-clipped heading needs `color: transparent`, or the paint is
  // invisible. Checking the pair is cheaper than checking it in the browser.
  ["gradient text is transparent", /\.text-gradient-light\{[^}]*color:transparent/],
  ["gradient text clips to background", /\.text-gradient-light\{[^}]*-webkit-background-clip:text/],
];

let missing = 0;
for (const name of wanted) {
  const count = css.split(name).length - 1;
  if (!count) {
    missing += 1;
    console.log(`MISSING  ${name}`);
  }
}
for (const [label, pattern] of behaviour) {
  if (!pattern.test(css)) {
    missing += 1;
    console.log(`MISSING  behaviour: ${label}`);
  }
}

const total = wanted.length + behaviour.length;
console.log(
  missing
    ? `\n${missing} of ${total} expected rules absent from ${file}`
    : `All ${total} expected rules present in ${file} (${css.length} bytes)`
);
process.exit(missing ? 1 : 0);
