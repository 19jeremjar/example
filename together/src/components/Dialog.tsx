import { type ReactNode, useEffect, useRef } from "react";
import { useColourway } from "../lib/colourway";

/** Full-screen modal with Escape to close, focus moved in and restored on close, and a simple focus trap. */
export function Dialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { colourway } = useColourway();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const initial = el.querySelector<HTMLElement>("[data-autofocus]") ?? el;
    initial.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab") return;
      const focusable = [...el.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex]:not([tabindex='-1'])")].filter(
        (n) => !n.hasAttribute("disabled"),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className="fixed inset-0 z-30 flex flex-col overflow-y-auto outline-none"
      style={{ background: colourway.value, color: colourway.text }}
    >
      {children}
    </div>
  );
}
