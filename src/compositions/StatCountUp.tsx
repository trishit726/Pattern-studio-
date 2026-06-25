// StatCountUp — a single big number that counts up to its target, with a label
// beneath and an accent rule. The classic "10M users" / "$2.4B processed" hit.
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { enterExit } from "../lib/animation";
import { FONT_FAMILY } from "../lib/fonts";
import { COLORS, TITLE_SAFE_PADDING } from "../config";

export const statCountUpSchema = z.object({
  value: z.number(),
  prefix: z.string(),
  suffix: z.string(),
  label: z.string(),
  decimals: z.number().min(0).max(3),
  backgroundColor: zColor(),
  textColor: zColor(),
  accentColor: zColor(),
});

export type StatCountUpProps = z.infer<typeof statCountUpSchema>;

export const statCountUpDefaults: StatCountUpProps = {
  value: 10,
  prefix: "",
  suffix: "M+",
  label: "creators shipping faster",
  decimals: 0,
  backgroundColor: COLORS.bg,
  textColor: COLORS.text,
  accentColor: COLORS.accent,
};

// Group digits with thousands separators (e.g. 12,500).
const fmt = (n: number, decimals: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const StatCountUp: React.FC<StatCountUpProps> = ({
  value,
  prefix,
  suffix,
  label,
  decimals,
  backgroundColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const env = enterExit({ frame, durationInFrames, enter: 14, exit: 16 });

  // Count from 0 → value over the first ~1.4s with an ease-out feel, then hold.
  const progress = spring({ frame, fps, config: { damping: 200, mass: 1.4 } });
  const current = interpolate(progress, [0, 1], [0, value]);

  const labelS = spring({ frame: frame - 18, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily: FONT_FAMILY,
        justifyContent: "center",
        alignItems: "center",
        padding: TITLE_SAFE_PADDING,
        opacity: env,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div
          style={{
            color: textColor,
            fontSize: 200,
            fontWeight: 800,
            letterSpacing: -6,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            display: "flex",
            alignItems: "baseline",
          }}
        >
          <span style={{ color: accentColor }}>{prefix}</span>
          {fmt(current, decimals)}
          <span style={{ color: accentColor }}>{suffix}</span>
        </div>

        <div style={{ width: 72, height: 5, backgroundColor: accentColor, borderRadius: 3, transform: `scaleX(${labelS})` }} />

        <div
          style={{
            color: COLORS.muted,
            fontSize: 38,
            fontWeight: 500,
            letterSpacing: 0.5,
            opacity: labelS,
            transform: `translateY(${interpolate(labelS, [0, 1], [20, 0])}px)`,
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
