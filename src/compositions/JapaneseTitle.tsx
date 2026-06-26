// JapaneseTitle — procedural "japaneseEditorial" grammar: a hinomaru disc, a
// vertical-rl Mincho headline (white, over the disc) with a furigana reading
// column, a vertical caption, and a latin footer. Vertical layout strategy +
// the portable hinomaru motif.
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { z } from "zod";
import { resolveStyle, loadStyleFont } from "../style";
import { PatternField } from "../lib/patterngen/PatternField";

export const japaneseTitleSchema = z.object({
  headline: z.string(),
  reading: z.string(),
  caption: z.string(),
  footer: z.string(),
  seed: z.number().int(),
});

export type JapaneseTitleProps = z.infer<typeof japaneseTitleSchema>;

export const japaneseTitleDefaults: JapaneseTitleProps = {
  headline: "荒馬の轡",
  reading: "あらうまのくつわ",
  caption: "困難に真正面から立ち向かう。",
  footer: "Plannet inc.",
  seed: 7,
};

const STYLE = resolveStyle("japaneseEditorial");
const HEAD = loadStyleFont(STYLE.typography.headlineFont); // Shippori Mincho
const LABEL = loadStyleFont(STYLE.typography.labelFont); // Inter

export const JapaneseTitle: React.FC<JapaneseTitleProps> = ({
  headline,
  reading,
  caption,
  footer,
  seed,
}) => {
  const frame = useCurrentFrame();
  const ink = STYLE.color.palette[1]; // near-black

  const fade = (d: number) =>
    interpolate(frame, [d, d + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const driftIn = (d: number) =>
    interpolate(frame, [d, d + 26], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const vert: React.CSSProperties = { writingMode: "vertical-rl", fontFamily: HEAD };

  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.color.background, overflow: "hidden" }}>
      {/* hinomaru disc (red) */}
      <PatternField
        titles={[]}
        colors={[STYLE.color.accent]}
        density={1}
        proximity={2}
        seed={seed}
        begin={0}
        stagger={STYLE.motion.stagger}
        motifs={STYLE.visualLanguage.motifs}
      />

      {/* furigana reading column (to the right of the headline) */}
      <div
        style={{
          ...vert,
          position: "absolute",
          left: "44%",
          top: "19%",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: 6,
          color: "#ffffff",
          opacity: fade(20) * 0.92,
        }}
      >
        {reading}
      </div>

      {/* vertical headline, white over the disc */}
      <div
        style={{
          ...vert,
          position: "absolute",
          left: "36%",
          top: "15%",
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: 10,
          color: "#ffffff",
          opacity: fade(8),
          transform: `translateY(${driftIn(8)}px)`,
        }}
      >
        {headline}
      </div>

      {/* vertical caption column, near-black on the off-white field */}
      <div
        style={{
          ...vert,
          position: "absolute",
          left: "19%",
          top: "34%",
          maxHeight: "46%",
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: 4,
          lineHeight: 1.7,
          color: ink,
          opacity: fade(26),
        }}
      >
        {caption}
      </div>

      {/* latin footer */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "7%",
          textAlign: "center",
          fontFamily: LABEL,
          fontSize: 24,
          letterSpacing: 3,
          color: ink,
          opacity: fade(32),
        }}
      >
        {footer}
      </div>
    </AbsoluteFill>
  );
};
