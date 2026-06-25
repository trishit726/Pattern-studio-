// CaptionedClip — auto-caption-style subtitles on a TRANSPARENT canvas, so the
// export carries a real alpha channel and drops straight onto footage. Words
// reveal one-by-one with the active word highlighted (karaoke style). No
// background is set on the AbsoluteFill on purpose.
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { FONT_FAMILY } from "../lib/fonts";
import { COLORS } from "../config";

export const captionedClipSchema = z.object({
  text: z.string(),
  wordsPerSecond: z.number().min(1).max(8),
  barColor: zColor(),
  textColor: zColor(),
  highlightColor: zColor(),
});

export type CaptionedClipProps = z.infer<typeof captionedClipSchema>;

export const captionedClipDefaults: CaptionedClipProps = {
  text: "Captions that land every single word",
  wordsPerSecond: 3,
  barColor: "#0f1115",
  textColor: "#f5f6f8",
  highlightColor: "#f74026",
};

export const CaptionedClip: React.FC<CaptionedClipProps> = ({
  text,
  wordsPerSecond,
  barColor,
  textColor,
  highlightColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ").filter(Boolean);

  const framesPerWord = Math.max(1, Math.round(fps / wordsPerSecond));
  const activeIndex = Math.floor(frame / framesPerWord);

  return (
    // No backgroundColor — the canvas stays transparent for alpha export.
    <AbsoluteFill
      style={{
        fontFamily: FONT_FAMILY,
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "12%",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          backgroundColor: `${barColor}cc`,
          borderRadius: 18,
          padding: "20px 36px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 16px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        }}
      >
        {words.map((word, i) => {
          const revealed = i <= activeIndex;
          const isActive = i === activeIndex;
          // Each word pops as it becomes active.
          const pop = interpolate(
            frame - i * framesPerWord,
            [0, 6],
            [0.8, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <span
              key={`${word}-${i}`}
              style={{
                color: isActive ? highlightColor : textColor,
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: -0.5,
                opacity: revealed ? 1 : 0.25,
                transform: revealed ? `scale(${isActive ? pop : 1})` : "scale(0.8)",
                display: "inline-block",
                transition: "none",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
