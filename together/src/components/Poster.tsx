import type { CSSProperties, ReactNode } from "react";
import { POSTER } from "../config/palette";
import { TOGETHER_LOGO } from "../config/togetherLogo";

/**
 * The official TOGETHER sticker wordmark as inline SVG: white sticker, ink linework, as on the
 * posters. `word` picks the top arc, the bottom arc, or both.
 */
export function TogetherMark({ word = "both", className, style }: { word?: "top" | "bottom" | "both"; className?: string; style?: CSSProperties }) {
  const half = TOGETHER_LOGO.height / 2;
  const keep = (m: number[]) => word === "both" || (word === "top") === m[5] < half;
  const sticker = TOGETHER_LOGO.sticker.filter((p) => keep(p.m));
  const lines = TOGETHER_LOGO.lines.filter((p) => keep(p.m));
  // Crop the viewBox to the chosen word(s).
  const viewBox =
    word === "top"
      ? `0 0 ${TOGETHER_LOGO.width} ${half * 0.68}`
      : word === "bottom"
        ? `0 ${half * 1.38} ${TOGETHER_LOGO.width} ${TOGETHER_LOGO.height - half * 1.38}`
        : `0 0 ${TOGETHER_LOGO.width} ${TOGETHER_LOGO.height}`;
  return (
    <svg viewBox={viewBox} className={className} style={style} role="img" aria-label="Together">
      {sticker.map((p, i) => (
        <path key={`s${i}`} d={p.d} transform={`matrix(${p.m.join(",")})`} fill="#ffffff" />
      ))}
      {lines.map((p, i) => (
        <path key={`l${i}`} d={p.d} transform={`matrix(${p.m.join(",")})`} fill={POSTER.ink} />
      ))}
    </svg>
  );
}

/** Letters spread edge to edge, like the poster's guest boxes ("F O U S H E É"). */
export function Spaced({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`flex justify-between ${className ?? ""}`} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** The handwritten aside from the posters ("with very special guest:"). */
export function Script({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <p className={`font-script text-[1.9rem] leading-none tracking-wide ${className ?? ""}`} style={style}>
      {children}
    </p>
  );
}

/** Two-line corner label, as in the poster corners ("TOGETHER / TOGETHER", "TOUR / 2026"). */
export function Corner({ lines, align = "left" }: { lines: [string, string]; align?: "left" | "right" }) {
  return (
    <p className={`text-[11px] leading-[1.15] font-bold tracking-wider ${align === "right" ? "text-right" : ""}`}>
      {lines[0]}
      <br />
      {lines[1]}
    </p>
  );
}

/** The column of LIVEs from the poster's lower corners. */
export function LiveStack({ align = "left" }: { align?: "left" | "right" }) {
  return (
    <p aria-hidden className={`text-[11px] leading-[1.15] font-bold tracking-wider ${align === "right" ? "text-right" : ""}`}>
      LIVE
      <br />
      LIVE
      <br />
      LIVE
      <br />
      LIVE
      <br />
      LIVE
    </p>
  );
}
