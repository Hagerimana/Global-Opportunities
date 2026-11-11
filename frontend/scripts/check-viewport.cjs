/*
 * Clipping and horizontal-scroll audit.
 *
 * Two distinct defects, checked separately because they look alike and have
 * opposite causes:
 *
 *   1. Page-level horizontal scroll. `scrollWidth > clientWidth` on the root.
 *      The user cannot see what is past the right edge and has to drag the page
 *      sideways to reach it. This is the one the request is about.
 *
 *   2. Clipped content. An element whose own `scrollWidth` exceeds its
 *      `clientWidth` while its `overflow-x` is `visible` or `hidden`. Nothing
 *      scrolls and nothing leaks, but content is simply not there -- text
 *      truncated with no ellipsis, a chip half outside a card. Silent, and worse
 *      than a scrollbar because there is no signal at all.
 *
 * A deliberate scroll container (`overflow-x: auto|scroll`) is a containment
 * boundary and is neither. It is reported separately so an intentional one can
 * be confirmed rather than assumed.
 *
 * The measurement is only reported when the page is verifiably rendered, and
 * each viewport is asserted against the page's own `innerWidth` first. An
 * earlier version of this harness measured before the emulation override had
 * applied and reported a `position: fixed` header as 771px too wide, which is
 * not a possible layout; it also read a blank document as zero overflow. Both
 * are guarded against below.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || process.env.PAGE_URL || "http://127.0.0.1:3123/";
const PORT = 9371;

/*
 * Width and viewport height only.
 *
 * Deliberately not emulating touch. `Emulation.setDeviceMetricsOverride` with
 * `mobile: true` does not honour the requested width: measured against this
 * page it reported an innerWidth of 336 for a requested 320, 422 for 412, and
 * 388 for 375. A viewport that is not the width under test cannot answer the
 * question being asked, and no amount of retrying fixes a systematic 6-16px
 * inflation. With `mobile: false` every width is reported exactly.
 *
 * Nothing about the layout is lost. Tailwind's breakpoints are width-based, the
 * page sets `width=device-width`, and the only other thing `mobile` changes is
 * `hover`/`pointer` media features and touch events -- and a `hover:` rule does
 * not apply to a headless page that is not being hovered.
 */
const DEVICES = [
  [320, 568], [360, 800], [375, 667], [390, 844],
  [393, 852], [412, 915], [430, 932], [540, 720],
  [640, 900], [768, 1024], [820, 1180], [912, 1368],
  [1024, 768], [1180, 820], [1280, 800], [1366, 768],
  [1440, 900], [1600, 900], [1920, 1080],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws = null, child = null, profile = null, nextId = 0;
const pending = new Map();

function send(method, params = {}, sessionId) {
  nextId += 1;
  const id = nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}

// Async because the skip-link check waits two animation frames for the focus
// styles to apply before measuring. Evaluated with awaitPromise.
const AUDIT = `(async () => {
  const doc = document.scrollingElement;
  const describe = (el) => {
    const c = (el.className && typeof el.className === 'string')
      ? el.className.trim().split(/\\s+/).filter(Boolean).slice(0, 6).join(' ') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '');
  };

  const pageScroll = [];
  const clipped = [];
  const benign = [];
  const scrollers = [];

  const overflows = (el) => el.scrollWidth > el.clientWidth + 1;
  const isScroller = (el) => {
    const x = getComputedStyle(el).overflowX;
    return x === 'auto' || x === 'scroll';
  };

  /*
   * Walks down from an element that overflows to the innermost child that
   * causes it. Reporting every ancestor is noise: a 2px overhang shows up on
   * the card, its grid, its section, the main element and the root, and all
   * five are the same defect. The leaf is the one that can be changed.
   *
   * Descends on either signal. A child that overflows itself is the obvious
   * candidate, but a child can also stick out through a border or padding box
   * without overflowing on its own, so the rect comparison catches what the
   * scrollWidth comparison misses. Comparing rects alone was tried first and
   * stopped at the first ancestor: nothing in the chain is wider than the
   * page, the chain is just progressively narrower boxes, so the walk gave up
   * at <body> and blamed the page for its own clip.
   *
   * Note: this script is a template literal, so no backticks in this comment.
   */
  const leafCause = (el) => {
    let current = el;
    for (let depth = 0; depth < 16; depth += 1) {
      let next = null;
      for (const child of current.children) {
        if (isScroller(child)) continue;
        if (overflows(child)) { next = child; break; }
        const cr = child.getBoundingClientRect();
        const pr = current.getBoundingClientRect();
        if (cr.right > pr.right + 1 || cr.left < pr.left - 1) { next = child; break; }
      }
      if (!next) break;
      current = next;
    }
    const cs = getComputedStyle(current);
    // Opacity is cumulative down the ancestor chain: a child of a faded
    // container is as invisible as its own opacity says.
    let currentOpacity = 1;
    for (let n = current; n; n = n.parentElement) {
      const o = Number(getComputedStyle(n).opacity);
      if (!Number.isNaN(o)) currentOpacity *= o;
    }
    // Decoration is aria-hidden by contract. A bleed from something decorative
    // is not lost content, and flagging it as such buries the real findings.
    const decorative =
      current.getAttribute('aria-hidden') === 'true' ||
      (current.closest('[aria-hidden="true"]') !== null);
    // clip / clip-path is the deliberate "not for sighted eyes" recipe. It is
    // how sr-only hides text from the screen while leaving it for assistive
    // tech, and how an off-screen skip link stays out of the way until it
    // takes focus. Such an element is *supposed* to have a scrollWidth far
    // larger than its 1px box, so reporting it would be reporting the
    // accessibility feature as a layout bug.
    const clippedAway =
      (cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none');
    // An ellipsis is a visible signal that text continues, which a silent clip
    // is not, so it is reported as a distinct category rather than treated as a
    // defect or waved through. Worth seeing: on a 360px screen the mock app
    // window is the only place it appears, and a real list that grows one will
    // be caught here.
    const ellipsis = cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap';
    // Not yet on screen. A scroll reveal parks its element at opacity 0 with a
    // transform until an IntersectionObserver fires, so before the page is
    // scrolled those boxes exist but nothing is visible. Content nobody can see
    // *yet* is not content that has been lost, and treating it as clipped
    // buries the findings that matter under every entrance animation on the
    // page. The audit scrolls the page first so this rarely triggers; it is a
    // backstop, not the primary mechanism.
    const notYetVisible = Number(currentOpacity) < 0.05;
    return {
      element: describe(current),
      decorative,
      clippedAway,
      ellipsis,
      notYetVisible,
      opacity: currentOpacity,
      position: cs.position,
      transform: cs.transform === 'none' ? '' : cs.transform,
      left: cs.left, right: cs.right, top: cs.top,
      marginLeft: cs.marginLeft, marginRight: cs.marginRight,
      text: (current.textContent || '').trim().slice(0, 40),
    };
  };

  /*
   * <html> and <body> must be candidates in their own right.
   *
   * querySelectorAll('*') only returns descendants, so an earlier version
   * never examined body. That is not academic: when a clip propagates up to
   * body and stops there -- the common case, because the vertical scrollbar
   * makes <html> wider than <body> -- the outermost overflowing element is
   * body, body was never a candidate, and the inner element was discarded as
   * having an overflowing parent. The result was a page with genuinely
   * truncated text reporting a clean audit. A negative test caught it; a
   * passing sweep is what would not have.
   */
  const candidates = [document.documentElement, document.body, ...document.body.querySelectorAll('*')].filter(Boolean);

  // Climb to the outermost overflowing ancestor, so one defect is one finding
  // rather than one per level, then report that ancestor once.
  const outermost = (el) => {
    let top = el;
    while (top.parentElement && overflows(top.parentElement)) top = top.parentElement;
    return top;
  };

  const seen = new Set();
  for (const el of candidates) {
    if (!overflows(el)) continue;
    if (isScroller(el)) {
      const key = 'scroll:' + describe(el);
      if (seen.has(key)) continue;
      seen.add(key);
      scrollers.push({ element: describe(el), client: el.clientWidth, scroll: el.scrollWidth });
      continue;
    }
    const top = outermost(el);
    if (top !== el) continue;
    const cause = leafCause(top);
    const finding = {
      element: describe(top),
      client: top.clientWidth,
      scroll: top.scrollWidth,
      overflowX: getComputedStyle(top).overflowX,
      cause,
    };
    // Deliberately-hidden content is not a defect, and neither is decoration.
    // Classified by mechanism, not by name, so a new sr-only or a new
    // decorative layer is recognised without editing this file.
    if (cause.decorative) {
      finding.reason = 'decorative (aria-hidden)';
      benign.push(finding);
    } else if (cause.clippedAway) {
      finding.reason = 'deliberately hidden from view (clip/clip-path)';
      benign.push(finding);
    } else if (cause.ellipsis) {
      finding.reason = 'truncated with a visible ellipsis';
      benign.push(finding);
    } else if (cause.notYetVisible) {
      finding.reason = 'not yet revealed (opacity 0), scrolls into view on load pass';
      benign.push(finding);
    } else {
      clipped.push(finding);
    }
  }

  /*
   * The skip link is deliberately hidden until it takes focus, so it is
   * expected to be clipped in its resting state. What must not be true is that
   * it stays hidden after focus -- an sr-only skip link that never comes back
   * is invisible to the keyboard user it exists for. Verified here rather than
   * trusted, because "we classified it as benign" is exactly the kind of claim
   * that hides a real accessibility bug.
   */
  const skip = document.querySelector('a.skip-link');
  let skipLink = null;
  if (skip) {
    skip.focus();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const s = getComputedStyle(skip);
    const r = skip.getBoundingClientRect();
    skipLink = {
      focused: document.activeElement === skip,
      clipped: skip.scrollWidth > skip.clientWidth + 1,
      width: Math.round(r.width),
      visible: r.width > 8 && r.height > 8 && s.visibility !== 'hidden' && s.display !== 'none',
      onScreen: r.left >= -1 && r.right <= window.innerWidth + 1,
    };
    skip.blur();
  }

  return {
    readyState: document.readyState,
    sections: document.querySelectorAll('section').length,
    innerWidth: window.innerWidth,
    clientWidth: doc.clientWidth,
    scrollWidth: doc.scrollWidth,
    overflow: doc.scrollWidth - doc.clientWidth,
    pageScroll, clipped: clipped.slice(0, 12), benign: benign.slice(0, 12), scrollers, skipLink,
  };
})()`;

/**
 * A fresh target per viewport.
 *
 * This looks wasteful and was tried the other way round: a single reused tab
 * looked tidier and was measurably worse. Reusing one tab failed
 * non-deterministically, with a different set of viewports "not rendering" on
 * each run. The failing documents always had a constant 10134-byte body
 * containing nothing but the Next.js RSC flight <script> tags, a correct URL,
 * and readyState "complete" -- the streaming shell with no markup in it, which
 * would have audited as a clean 0px overflow. That is a document Next.js
 * streams; a half-populated one must never be measured.
 *
 * One target per viewport avoids the shared state entirely. The page is a
 * prerender served from cache, so the cost is a small cache hit, not a render.
 */
async function check(width, height) {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  /*
   * The override is applied before the navigation and re-applied after the page
   * reports itself loaded. Setting it on about:blank can be silently dropped
   * when the navigation commits, which shows up as "emulation did not apply"
   * with innerWidth stuck at the window default -- and on the retry path, where
   * a browser is launched per viewport, that was most of them.
   */
  const applyOverride = () =>
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);

  await applyOverride();
  await send("Page.navigate", { url: BASE }, sessionId);

  // Guard 1: the override must have taken effect before anything is measured.
  const innerWidthIs = async () => {
    const r = await send("Runtime.evaluate", { expression: "String(window.innerWidth)", returnByValue: true }, sessionId);
    return r.result.value;
  };
  let applied = false;
  for (let i = 0; i < 25 && !applied; i += 1) {
    if (i === 10) await applyOverride();
    await sleep(200);
    applied = Number(await innerWidthIs()) === width;
  }
  if (!applied) {
    await applyOverride();
    await sleep(400);
    applied = Number(await innerWidthIs()) === width;
  }
  if (!applied) {
    const innerWidth = await innerWidthIs();
    await send("Target.closeTarget", { targetId }).catch(() => {});
    return { invalid: true, innerWidth };
  }

  // Guard 2: the page must actually be there *and actually be styled*.
  //
  // Both halves are required. A blank document is 0x0 and audits as a perfect
  // score. An unstyled document is worse: it also audits clean, because with
  // no Tailwind every box is a plain full-width block that happens to fit,
  // while the real layout is never exercised at all. That is not
  // hypothetical. A stale `next start` served a stylesheet URL that no longer
  // existed on disk, the browser was handed a 400 error page instead of CSS,
  // and a full 19-viewport sweep cheerfully reported "no horizontal scrolling
  // and no clipped content" for a page that was not the page. The version
  // that ships is the styled one, so the audit must refuse the unstyled one.
  const READY =
    "document.readyState === 'complete' && " +
    "document.querySelectorAll('section').length >= 16 && " +
    "document.styleSheets.length > 0 && " +
    "getComputedStyle(document.querySelector('header')).position === 'fixed' && " +
    "getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'";

  let ready = false;
  for (let i = 0; i < 120 && !ready; i += 1) {
    await sleep(250);
    const r = await send("Runtime.evaluate", { expression: READY, returnByValue: true }, sessionId);
    ready = r.result.value === true;
  }
  if (!ready) {
    const diag = await send(
      "Runtime.evaluate",
      {
        expression:
          "JSON.stringify({ state: document.readyState, sections: document.querySelectorAll('section').length, styleSheets: document.styleSheets.length, headerPosition: document.querySelector('header') ? getComputedStyle(document.querySelector('header')).position : null, bodyBg: getComputedStyle(document.body).backgroundColor, bodyLength: document.body ? document.body.innerHTML.length : -1, url: location.href })",
        returnByValue: true,
      },
      sessionId
    );
    await send("Target.closeTarget", { targetId }).catch(() => {});
    return { invalid: true, notReady: true, diag: diag.result.value };
  }

  /*
   * Scroll the whole page before measuring, then return to the top.
   *
   * Sections reveal on intersection, and an unrevealed element sits at its
   * entrance transform -- `translate3d(32px, 0, 0)` for a right-hand reveal.
   * That is a transient state a reader never inspects, but it is a real box
   * position, and measuring it produced a clipped-content failure in the AI
   * assistant panel that disappeared the moment the section was scrolled into
   * view. Walking the page fires every observer, the transitions complete, and
   * what gets measured is the settled layout.
   */
  await send(
    "Runtime.evaluate",
    {
      expression: `(async () => {
        const scroller = document.scrollingElement;
        const step = Math.max(200, Math.floor(window.innerHeight * 0.75));
        for (let y = 0; y <= scroller.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
        window.scrollTo(0, scroller.scrollHeight);
        await new Promise((r) => setTimeout(r, 250));
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 150));
        return scroller.scrollHeight;
      })()`,
      returnByValue: true,
      awaitPromise: true,
    },
    sessionId
  );

  // The reveal transition is 1000ms; wait it out so transforms land on none.
  await sleep(1200);

  // Guard 3: settle. Webfont loading and any late layout both move boxes.
  let prev = null;
  let stable = 0;
  for (let i = 0; i < 20 && stable < 3; i += 1) {
    const r = await send("Runtime.evaluate", { expression: "String(document.scrollingElement.scrollWidth)", returnByValue: true }, sessionId);
    stable = r.result.value === prev ? stable + 1 : 0;
    prev = r.result.value;
    await sleep(110);
  }

  const r = await send("Runtime.evaluate", { expression: AUDIT, returnByValue: true, awaitPromise: true }, sessionId);
  await send("Target.closeTarget", { targetId }).catch(() => {});
  return { invalid: false, ...r.result.value };
}

/**
 * Boots Chrome, hands the connection to `body`, then tears everything down.
 * A fresh browser per batch, because a single long-lived one degrades: the
 * same widths that render on the first pass start returning a 10134-byte body
 * of bare RSC flight scripts later on. Retrying a failure against a fresh
 * browser is what makes the result deterministic.
 */
async function withBrowser(body) {
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "clip-"));
  child = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "about:blank",
  ], { stdio: "ignore" });

  let url = null;
  for (let i = 0; i < 60 && !url; i += 1) {
    try { url = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; }
    catch { await sleep(250); }
  }
  if (!url) throw new Error("no devtools endpoint");

  ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
  });

  try {
    return await body();
  } finally {
    await send("Browser.close").catch(() => {});
    try { ws.close(); } catch {}
    try { child.kill(); } catch {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    ws = null; child = null; profile = null;
    await sleep(500);
  }
}

function report(d, width) {
  const skipBad = d.skipLink && (!d.skipLink.visible || d.skipLink.clipped || !d.skipLink.onScreen);
  const clean = d.overflow <= 0 && d.clipped.length === 0 && !skipBad;
  console.log(
    `${clean ? "ok  " : "FAIL"} ${String(width).padStart(4)}px  client=${String(d.clientWidth).padStart(4)} scroll=${String(d.scrollWidth).padStart(4)} overflow=${String(d.overflow).padStart(3)}px  clipped=${d.clipped.length}  hidden=${d.benign.length}  scrollers=${d.scrollers.length}  sections=${d.sections}`
  );
  for (const c of d.clipped) {
    const cause = c.cause;
    console.log(`        CLIPPED ${c.client}->${c.scroll} ovfX=${c.overflowX}  <<< content the user cannot see`);
    console.log(`          container  ${c.element.slice(0, 72)}`);
    console.log(`          leaf       ${cause.element.slice(0, 72)}`);
    console.log(`          leaf pos=${cause.position} inset=${cause.left}/${cause.right} margin=${cause.marginLeft}/${cause.marginRight} transform=${cause.transform || "none"}`);
    if (cause.text) console.log(`          text       "${cause.text}"`);
  }
  if (skipBad) {
    console.log(`        SKIP LINK stays hidden on focus: ${JSON.stringify(d.skipLink)}`);
  }
  return clean;
}

async function main() {
  const results = new Map();
  const invalid = new Set(DEVICES.map((d) => d[0]));

  // Pass 1: five viewports per browser, so no instance handles enough loads to
  // start returning half-streamed documents.
  for (let i = 0; i < DEVICES.length; i += 5) {
    const batch = DEVICES.slice(i, i + 5);
    await withBrowser(async () => {
      for (const [width, height] of batch) {
        const d = await check(width, height);
        if (d.invalid) {
          console.log(`BAD  ${String(width).padStart(4)}px  ${d.notReady ? "page did not render: " + d.diag : "emulation did not apply (innerWidth " + d.innerWidth + ")"} -- will retry in a fresh browser`);
          continue;
        }
        invalid.delete(width);
        results.set(width, d);
        report(d, width);
      }
    });
  }

  // Pass 2: anything still unmeasured gets a second, isolated attempt. A
  // viewport that still cannot be measured is a real problem and is reported
  // as one, never quietly counted as clean.
  if (invalid.size) {
    console.log(`\nretrying ${invalid.size} viewport(s) in a fresh browser...`);
    for (const width of [...invalid]) {
      const device = DEVICES.find((d) => d[0] === width);
      const d = await withBrowser(() => check(device[0], device[1]));
      if (d.invalid) {
        console.log(`BAD  ${String(width).padStart(4)}px  still unmeasurable: ${d.notReady ? d.diag : "emulation did not apply"}`);
        continue;
      }
      invalid.delete(width);
      results.set(width, d);
      report(d, width);
    }
  }

  let pageOverflow = 0;
  let clipCount = 0;
  const scrollerSeen = new Set();
  for (const [width, d] of [...results].sort((a, b) => a[0] - b[0])) {
    if (d.overflow > 0) { pageOverflow += 1; console.log(`OVERFLOW ${width}px  scrolls horizontally by ${d.overflow}px`); }
    if (d.clipped.length) clipCount += 1;
    for (const s of d.scrollers) scrollerSeen.add(s.element);
  }

  console.log(`\nmeasured ${results.size}/${DEVICES.length} viewports`);
  console.log(`intentional horizontal scroll containers found: ${scrollerSeen.size}`);
  for (const s of scrollerSeen) console.log(`  ${s}`);

  if (invalid.size) console.log(`${invalid.size} viewport(s) could not be measured: ${[...invalid].join(", ")}`);
  if (pageOverflow) console.log(`${pageOverflow} viewport(s) scroll horizontally`);
  if (clipCount) console.log(`${clipCount} viewport(s) have clipped content`);
  if (!invalid.size && !pageOverflow && !clipCount) console.log("\nNo horizontal scrolling and no clipped content at any tested width");
  process.exit(invalid.size || pageOverflow || clipCount ? 1 : 0);
}

// Exported so the audit can be exercised against a known-bad page in tests
// without spawning the whole sweep or needing a server.
module.exports = { AUDIT, DEVICES };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    try { if (child) child.kill(); } catch {}
    process.exit(2);
  });
}
