// SwissTitle — the first end-to-end PROOF of the Style Engine: a fully
// procedural composition whose entire look is resolved from the "swiss"
// StyleSpec (fonts, colors, motion) + the portable diagonalBars motif. Nothing
// here is a fixed template — bars are seeded, and the headline anchors jitter
// with the seed, so every render is unique yet unmistakably Swiss.
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { z } from "zod";
import { resolveStyle, loadStyleFont } from "../style";
import { composeLayout } from "../engine/layout";
import { PatternField } from "../lib/patterngen/PatternField";

export const swissTitleSchema = z.object({
  headline: z.string(),
  secondary: z.string(),
  period: z.string(),
  caption: z.string(),
  seed: z.number().int(),
});

export type SwissTitleProps = z.infer<typeof swissTitleSchema>;

export const swissTitleDefaults: SwissTitleProps = {
  headline: "swiss",
  secondary: "design",
  period: "1920–1965",
  caption:
    "Devoted to minimal, objective communication: mathematical grids, sans-serif type, flush-left text, and asymmetric layout.",
  seed: 7,
};

const STYLE = resolveStyle("swiss");
const HEAD = loadStyleFont(STYLE.typography.headlineFont); // Archivo Black
const LABEL = loadStyleFont(STYLE.typography.labelFont); // Inter

export const SwissTitle: React.FC<SwissTitleProps> = ({
  headline,
  secondary,
  period,
  caption,
  seed,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Seed-driven asymmetric anchors — same grammar, different arrangement per seed.
  // Anchors come from the Layout Engine (asymmetric strategy, seeded).
  const L = composeLayout(STYLE, seed);
  const headPos = L.headline!;
  const secPos = L.secondary!;
  const periodPos = L.meta!;
  const capPos = L.caption!;

  // Snappy left-wipe reveal (Swiss motion: hard, fast).
  const wipe = (delay: number): React.CSSProperties => {
    const p = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 140 } });
    const r = (1 - p) * 100;
    return { clipPath: `inset(0 ${r}% 0 0)`, WebkitClipPath: `inset(0 ${r}% 0 0)` };
  };

  const ink = STYLE.color.accent; // near-black
  const headStyle: React.CSSProperties = {
    position: "absolute",
    fontFamily: HEAD,
    color: ink,
    fontWeight: 400,
    textTransform: "lowercase",
    letterSpacing: STYLE.typography.tracking,
    lineHeight: 0.9,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.color.background, overflow: "hidden" }}>
      {/* Procedural white bars — the diagonalBars motif via the shared field. */}
      <PatternField
        titles={[]}
        colors={["#ffffff"]}
        density={STYLE.visualLanguage.density.max}
        proximity={2}
        seed={seed}
        begin={0}
        stagger={STYLE.motion.stagger}
        motifs={STYLE.visualLanguage.motifs}
      />

      {/* Huge lowercase headline, top-left */}
      <div style={{ ...headStyle, left: `${headPos.x}%`, top: `${headPos.y}%`, fontSize: 230, ...wipe(6) }}>
        {headline}
      </div>

      {/* Period number, mid-left */}
      <div
        style={{
          position: "absolute",
          left: `${periodPos.x}%`,
          top: `${periodPos.y}%`,
          fontFamily: HEAD,
          color: ink,
          fontSize: 96,
          letterSpacing: -2,
          ...wipe(14),
        }}
      >
        {period}
      </div>

      {/* Small justified caption column */}
      <div
        style={{
          position: "absolute",
          left: `${capPos.x}%`,
          top: `${capPos.y}%`,
          width: "20%",
          fontFamily: LABEL,
          color: ink,
          fontSize: 19,
          fontWeight: 400,
          lineHeight: 1.35,
          textAlign: "justify",
          opacity: interpolate(frame, [18, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {caption}
      </div>

      {/* Second huge word, lower-right — the diagonal counter-anchor */}
      <div style={{ ...headStyle, left: `${secPos.x}%`, top: `${secPos.y}%`, fontSize: 230, ...wipe(10) }}>
        {secondary}
      </div>
    </AbsoluteFill>
  );
};
