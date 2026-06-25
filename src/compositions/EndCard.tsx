// EndCard — a creator outro / call-to-action: big prompt, a pill "button", and
// a handle. Everything springs up in a tidy stack, then holds. Drop it at the
// end of a video to push subscribes / follows.
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

export const endCardSchema = z.object({
  title: z.string(),
  ctaLabel: z.string(),
  handle: z.string(),
  backgroundColor: zColor(),
  textColor: zColor(),
  accentColor: zColor(),
});

export type EndCardProps = z.infer<typeof endCardSchema>;

export const endCardDefaults: EndCardProps = {
  title: "Thanks for watching",
  ctaLabel: "Subscribe",
  handle: "@yourchannel",
  backgroundColor: COLORS.bg,
  textColor: COLORS.text,
  accentColor: COLORS.accent,
};

export const EndCard: React.FC<EndCardProps> = ({
  title,
  ctaLabel,
  handle,
  backgroundColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const env = enterExit({ frame, durationInFrames, enter: 16, exit: 16 });
  const stack = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.7 } });

  const titleS = stack(0);
  const btnS = stack(8);
  const handleS = stack(16);

  // Subtle, looping breathing on the CTA pill so it never feels frozen.
  const pulse = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
        <h1
          style={{
            color: textColor,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -1.5,
            margin: 0,
            textAlign: "center",
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
          }}
        >
          {title}
        </h1>

        <div
          style={{
            opacity: btnS,
            transform: `translateY(${interpolate(btnS, [0, 1], [40, 0])}px) scale(${pulse})`,
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 0.5,
            padding: "20px 56px",
            borderRadius: 999,
            boxShadow: `0 24px 60px ${accentColor}55`,
          }}
        >
          {ctaLabel}
        </div>

        <div
          style={{
            opacity: handleS,
            transform: `translateY(${interpolate(handleS, [0, 1], [30, 0])}px)`,
            color: COLORS.muted,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          {handle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
