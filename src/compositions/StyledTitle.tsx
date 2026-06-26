// StyledTitle — the GENERIC, fully StyleSpec-driven renderer. Unlike the four
// bespoke hero compositions, this consumes an arbitrary StyleSpec (including a
// blended one from resolveStack, or a power-user-edited one) and renders it:
// background, motif field, and headline/secondary placed via the Layout Engine.
// This is what powers Style Stacks (Phase 6) and full-spec editing (Phase 7).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { z } from "zod";
import { resolveStack, loadStyleFont, type StyleSpec } from "../style";
import { composeLayout } from "../engine/layout";
import { PatternField } from "../lib/patterngen/PatternField";
import { GrainOverlay } from "../lib/textures";

export const styledTitleSchema = z.object({
  headline: z.string(),
  secondary: z.string(),
  seed: z.number().int(),
  style: z.any(),
});

export interface StyledTitleProps {
  headline: string;
  secondary: string;
  seed: number;
  style: StyleSpec;
}

export const styledTitleDefaults: StyledTitleProps = {
  headline: "Hybrid",
  secondary: "SWISS × GLASS",
  seed: 7,
  style: resolveStack({ layers: [{ styleId: "swiss", weight: 0.6 }, { styleId: "cyberHud", weight: 0.4 }] }),
};

const lum = (hex: string): number => {
  const s = hex.replace("#", "");
  if (s.length < 6) return 0.5;
  return (0.299 * parseInt(s.slice(0, 2), 16) + 0.587 * parseInt(s.slice(2, 4), 16) + 0.114 * parseInt(s.slice(4, 6), 16)) / 255;
};

export const StyledTitle: React.FC<StyledTitleProps> = ({ headline, secondary, seed, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = composeLayout(style, seed);

  const bg = typeof style.color.background === "string" ? style.color.background : "#111111";
  const bgL = lum(bg);
  const ink = bgL > 0.55 ? "#111111" : "#f5f6f8";
  // Decoration colours = palette entries that contrast the background.
  const deco = (() => {
    const d = style.color.palette.filter((c) => Math.abs(lum(c) - bgL) > 0.25);
    return d.length ? d : [bgL > 0.5 ? "#111111" : "#ffffff"];
  })();

  const head = loadStyleFont(style.typography.headlineFont);
  const label = loadStyleFont(style.typography.labelFont);
  const reveal = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const fade = (d: number) => interpolate(frame, [d, d + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cased = (s: string) =>
    style.typography.case === "upper" ? s.toUpperCase() : style.typography.case === "lower" ? s.toLowerCase() : s;
  const vertical = style.typography.align === "vertical-rl";
  const centered = (a?: string) => a === "center";

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden", fontFamily: head }}>
      <PatternField
        titles={[]}
        colors={deco}
        density={style.visualLanguage.density.max || 10}
        proximity={2}
        seed={seed}
        begin={0}
        stagger={style.motion.stagger}
        motifs={style.visualLanguage.motifs}
      />

      {L.headline ? (
        <div
          style={{
            position: "absolute",
            top: `${L.headline.y}%`,
            ...(centered(L.headline.align) ? { left: 0, right: 0, textAlign: "center" } : { left: `${L.headline.x}%` }),
            ...(vertical ? { writingMode: "vertical-rl" as const } : {}),
            fontWeight: 700,
            fontSize: 168,
            letterSpacing: style.typography.tracking,
            lineHeight: 0.92,
            color: ink,
            opacity: reveal,
            transform: `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
          }}
        >
          {cased(headline)}
        </div>
      ) : null}

      {L.secondary ? (
        <div
          style={{
            position: "absolute",
            top: `${L.secondary.y}%`,
            ...(centered(L.secondary.align)
              ? { left: 0, right: 0, textAlign: "center" }
              : L.secondary.align === "right"
                ? { right: `${100 - L.secondary.x}%`, textAlign: "right" }
                : { left: `${L.secondary.x}%` }),
            fontFamily: label,
            fontSize: 28,
            letterSpacing: 4,
            color: ink,
            opacity: fade(20),
          }}
        >
          {cased(secondary)}
        </div>
      ) : null}

      {style.texture.surface !== "none" ? (
        <GrainOverlay name="styled" intensity={style.texture.intensity} vignette={style.texture.vignette} dark={bgL < 0.5} />
      ) : null}
    </AbsoluteFill>
  );
};
