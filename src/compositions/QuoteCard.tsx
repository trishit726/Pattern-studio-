// QuoteCard — a large pull-quote with an oversized opening mark, then the
// attribution fades in beneath a short rule. For testimonials / review reels.
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

export const quoteCardSchema = z.object({
  quote: z.string(),
  author: z.string(),
  role: z.string(),
  backgroundColor: zColor(),
  textColor: zColor(),
  accentColor: zColor(),
});

export type QuoteCardProps = z.infer<typeof quoteCardSchema>;

export const quoteCardDefaults: QuoteCardProps = {
  quote: "This is the fastest we've ever shipped a brand video.",
  author: "Alex Rivera",
  role: "Head of Marketing, Northwind",
  backgroundColor: "#10131a",
  textColor: "#f5f6f8",
  accentColor: "#5b8def",
};

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  author,
  role,
  backgroundColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const env = enterExit({ frame, durationInFrames, enter: 16, exit: 16 });
  const quoteS = spring({ frame, fps, config: { damping: 200 } });
  const attrS = spring({ frame: frame - 22, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily: FONT_FAMILY,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "12%",
        opacity: env,
      }}
    >
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 36 }}>
        <span
          style={{
            color: accentColor,
            fontSize: 160,
            fontWeight: 800,
            lineHeight: 0.5,
            height: 70,
            opacity: interpolate(quoteS, [0, 1], [0, 1]),
          }}
        >
          &ldquo;
        </span>

        <blockquote
          style={{
            margin: 0,
            color: textColor,
            fontSize: 64,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: -0.5,
            opacity: quoteS,
            transform: `translateY(${interpolate(quoteS, [0, 1], [28, 0])}px)`,
          }}
        >
          {quote}
        </blockquote>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: attrS,
            transform: `translateX(${interpolate(attrS, [0, 1], [-24, 0])}px)`,
          }}
        >
          <div style={{ width: 44, height: 4, backgroundColor: accentColor, borderRadius: 2 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: textColor, fontSize: 32, fontWeight: 700 }}>{author}</span>
            <span style={{ color: COLORS.muted, fontSize: 24, fontWeight: 400 }}>{role}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
