// BrutalistTitle — procedural "brutalist" grammar: a giant restrained headline
// anchored low-left, micro mono metadata pinned to the edges, a hairline rule,
// concrete grain. Layout comes from the editorial strategy (seeded), so each
// render varies within the grammar.
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { z } from "zod";
import { resolveStyle, loadStyleFont } from "../style";
import { composeLayout } from "../engine/layout";
import { GrainOverlay } from "../lib/textures";

export const brutalistTitleSchema = z.object({
  headline: z.string(),
  kicker: z.string(),
  index: z.string(),
  caption: z.string(),
  seed: z.number().int(),
});

export type BrutalistTitleProps = z.infer<typeof brutalistTitleSchema>;

export const brutalistTitleDefaults: BrutalistTitleProps = {
  headline: "London",
  kicker: "NATIONAL THEATRE",
  index: "№ 01 — SOUTH BANK",
  caption: "Béton brut / Denys Lasdun / 1976",
  seed: 7,
};

const STYLE = resolveStyle("brutalist");
const HEAD = loadStyleFont(STYLE.typography.headlineFont); // Inter
const MONO = loadStyleFont(STYLE.typography.monoFont!); // Space Mono

export const BrutalistTitle: React.FC<BrutalistTitleProps> = ({
  headline,
  kicker,
  index,
  caption,
  seed,
}) => {
  const frame = useCurrentFrame();
  const L = composeLayout(STYLE, seed);
  const ink = STYLE.color.accent;

  const fade = (d: number) =>
    interpolate(frame, [d, d + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rise = (d: number) =>
    interpolate(frame, [d, d + 22], [28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const mono: React.CSSProperties = {
    position: "absolute",
    fontFamily: MONO,
    fontSize: 22,
    letterSpacing: 1.5,
    color: ink,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.color.background, overflow: "hidden" }}>
      {/* hairline top rule */}
      <div style={{ position: "absolute", left: "5%", right: "5%", top: "5.5%", height: 1, background: ink, opacity: fade(0) * 0.5 }} />

      {/* kicker top-left */}
      <div style={{ ...mono, left: `${L.meta!.x}%`, top: `${L.meta!.y}%`, textTransform: "uppercase", opacity: fade(4) }}>
        {kicker}
      </div>

      {/* index top-right */}
      <div style={{ ...mono, right: "5%", top: `${L.meta!.y}%`, textAlign: "right", opacity: fade(6) }}>
        {index}
      </div>

      {/* giant headline, anchored low-left */}
      <div
        style={{
          position: "absolute",
          left: `${L.headline!.x}%`,
          top: `${L.headline!.y}%`,
          fontFamily: HEAD,
          fontWeight: 500,
          fontSize: 300,
          letterSpacing: -8,
          lineHeight: 0.85,
          color: ink,
          opacity: fade(8),
          transform: `translateY(${rise(8)}px)`,
        }}
      >
        {headline}
      </div>

      {/* caption pinned bottom-left */}
      <div style={{ ...mono, left: `${L.caption!.x}%`, top: `${L.caption!.y}%`, fontSize: 20, opacity: fade(14) }}>
        {caption}
      </div>

      <GrainOverlay name="brutalist" intensity={STYLE.texture.intensity} dark />
    </AbsoluteFill>
  );
};
