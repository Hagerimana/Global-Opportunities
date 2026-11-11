"use client";

/**
 * The interface language selector.
 *
 * A listbox rather than a `<select>`. The native control cannot be styled to
 * match the rest of the navbar, cannot show each language in its own script
 * alongside a gloss, and on mobile renders as a wheel the platform decides the
 * look of. This is a custom one, which means the keyboard and focus behaviour
 * are on us:
 *
 *   - the trigger is a real `<button>` with `aria-haspopup` and `aria-expanded`;
 *   - the list is `role="listbox"` with `role="option"` children and
 *     `aria-selected` on the active locale, which is what makes a screen reader
 *     announce "selected" rather than just "checked"-ish;
 *   - Arrow keys move the highlight, Enter and Space commit, Escape closes and
 *     returns focus to the trigger, and a click anywhere outside closes;
 *   - Tab closes the menu and moves on, rather than trapping focus.
 */
import { useEffect, useRef, useState } from "react";
import { locales, useI18n, type LocaleCode } from "@/lib/i18n";
import { Icon } from "@/components/ui/icon";

export function LanguageMenu({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // Refs for the two nodes the outside-click and focus-return logic needs.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = locales.find((item) => item.code === locale) ?? locales[0];

  /** Closes the menu, optionally putting focus back on the trigger. */
  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  /** Commits a choice and closes. */
  function choose(code: LocaleCode) {
    setLocale(code);
    close(true);
  }

  // Move the roving highlight with the arrow keys while the listbox is open.
  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setHighlighted(locales.findIndex((item) => item.code === locale));
      setOpen(true);
    }
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((index) => (index + 1) % locales.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((index) => (index - 1 + locales.length) % locales.length);
        break;
      case "Home":
        event.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        event.preventDefault();
        setHighlighted(locales.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(locales[highlighted].code);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        // No focus trap: Tab should leave the menu and continue down the page.
        close();
        break;
    }
  }

  // A click or a focus landing outside the menu closes it. The `focusin` branch
  // matters for keyboard users, who can move focus without ever clicking.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onFocusIn(event: FocusEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  // Keep the highlighted option focused as the arrow keys move it, so a screen
  // reader follows the highlight and not just the listbox' announcement.
  useEffect(() => {
    if (open) optionRefs.current[highlighted]?.focus();
  }, [open, highlighted]);

  const triggerTone =
    tone === "light"
      ? "border-white/20 text-white hover:bg-white/10"
      : "border-pine-900/10 text-ink-muted hover:border-pine-700/25 hover:text-pine-800";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("a11y.languageMenu")}
        className={`tap gap-1.5 px-3 text-sm font-medium backdrop-blur transition-all duration-300 ease-premium ${triggerTone}`}
      >
        <Icon name="globe" className="h-4 w-4" />
        <span>{active.name}</span>
        <Icon
          name="chevronDown"
          className={`h-3.5 w-3.5 transition-transform duration-300 ease-premium ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("a11y.languageMenu")}
          // The list opens downward and is right-aligned on wide viewports, but
          // flips up when the trigger is near the bottom of a short viewport.
          className="glass-strong absolute right-0 z-50 mt-2 w-56 origin-top-right animate-bloom-in overflow-hidden rounded-2xl p-1.5"
          onKeyDown={onListKeyDown}
        >
          {locales.map((item, index) => {
            const selected = item.code === locale;
            return (
              <li key={item.code}>
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={index === highlighted ? 0 : -1}
                  onClick={() => choose(item.code)}
                  className={`tap w-full gap-3 rounded-xl px-3 text-left transition-colors duration-200 ${
                    index === highlighted ? "bg-pine-50" : "hover:bg-pine-50/70"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold uppercase ${
                      selected ? "bg-pine-800 text-white" : "bg-pine-100 text-pine-700"
                    }`}
                    // The two-letter code is decorative: the language's own name
                    // beside it is what the reader needs.
                    aria-hidden
                  >
                    {item.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-pine-950">
                      {item.name}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">{item.englishName}</span>
                  </span>
                  {selected && <Icon name="check" className="h-4 w-4 shrink-0 text-pine-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
