// VerticalPromo — a 9:16 promo built for Stories / Reels / TikTok. A small
// pill badge at top, a heavy stacked headline in the middle, a subhead below.
// Each headline line wipes up on its own beat.
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
import { COLORS } from "../config";

export const verticalPromoSchema = z.object({
  badge: z.string(),
  headline: z.array(z.string()),
  subhead: z.string(),
  backgroundColor: zColor(),
  textColor: zColor(),
  accentColor: zColor(),
});

export type VerticalPromoProps = z.infer<typeof verticalPromoSchema>;

export const verticalPromoDefaults: VerticalPromoProps = {
  badge: "NEW",
  headline: ["MOTION", "FROM A", "PROMPT"],
  subhead: "Design a branded video in minutes — no editor required.",
  backgroundColor: "#0f1115",
  textColor: "#f5f6f8",
  accentColor: "#f74026",
};

export const VerticalPromo: React.FC<VerticalPromoProps> = ({
  badge,
  headline,
  subhead,
  backgroundColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const env = enterExit({ frame, durationInFrames, enter: 14, exit: 16 });
  const badgeS = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const subS = spring({ frame: frame - (headline.length * 6 + 10), fps, config: { damping: 20 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily: FONT_FAMILY,
        justifyContent: "center",
        alignItems: "center",
        padding: "8% 7%",
        opacity: env,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 44, width: "100%" }}>
        <div
          style={{
            opacity: badgeS,
            transform: `scale(${interpolate(badgeS, [0, 1], [0.7, 1])})`,
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 3,
            padding: "12px 28px",
            borderRadius: 999,
          }}
        >
          {badge}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {headline.map((line, i) => {
            const s = spring({ frame: frame - i * 6, fps, config: { damping: 18 } });
            return (
              <div
                key={`${line}-${i}`}
                style={{
                  color: i % 2 === 1 ? accentColor : textColor,
                  fontSize: 130,
                  fontWeight: 800,
                  lineHeight: 0.96,
                  letterSpacing: -3,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        <p
          style={{
            margin: 0,
            color: COLORS.muted,
            fontSize: 40,
            fontWeight: 500,
            lineHeight: 1.35,
            maxWidth: "92%",
            opacity: subS,
            transform: `translateY(${interpolate(subS, [0, 1], [24, 0])}px)`,
          }}
        >
          {subhead}
        </p>
      </div>
    </AbsoluteFill>
  );
};
