// CyberTitle — procedural "cyberHud" grammar as GLASSMORPHISM: a dark ground, a
// procedurally-built iridescent glass torus (conic rainbow, masked to a ring,
// blurred to glass, with chromatic-aberration copies + volumetric glow), bold
// grotesque type interacting with the form, and small mono technical labels.
// Grammar from NEW RFERNCE/cyber hub (glass material, iridescent, glossy).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { z } from "zod";
import { resolveStyle, loadStyleFont } from "../style";
import { composeLayout } from "../engine/layout";

export const cyberTitleSchema = z.object({
  headline: z.string(),
  subtitle: z.string(),
  readoutL: z.string(),
  readoutR: z.string(),
  seed: z.number().int(),
});

export type CyberTitleProps = z.infer<typeof cyberTitleSchema>;

export const cyberTitleDefaults: CyberTitleProps = {
  headline: "PANTERVISION",
  subtitle: "GLASS // HOLOGRAPHIC SYSTEM",
  readoutL: "SEARCH ON YOUTUBE",
  readoutR: "v2.4.1 // SECURE",
  seed: 7,
};

const STYLE = resolveStyle("cyberHud");
const HEAD = loadStyleFont(STYLE.typography.headlineFont); // Space Grotesk
const MONO = loadStyleFont(STYLE.typography.monoFont!); // Space Mono

// Torus mask: a ring band cut from a disc (transparent centre + transparent rim).
const RING_MASK =
  "radial-gradient(circle at center, transparent 27%, #000 31%, #000 49%, transparent 53%)";

const GlassTorus: React.FC<{ rot: number; reveal: number; palette: string[] }> = ({ rot, reveal, palette }) => {
  const size = 700;
  const grad = `conic-gradient(from ${rot}deg, ${palette.join(", ")}, ${palette[0]})`;
  const ringBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: grad,
    WebkitMaskImage: RING_MASK,
    maskImage: RING_MASK,
  };
  const blur = 18 - reveal * 12; // de-blurs as it resolves in

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        transform: `translate(-50%, -50%) scale(${0.82 + reveal * 0.18})`,
        opacity: reveal,
      }}
    >
      {/* volumetric glow behind the form */}
      <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: grad, filter: "blur(110px)", opacity: 0.45 }} />

      {/* chromatic-aberration copies (offset + additive) */}
      <div style={{ ...ringBase, transform: "translateX(6px)", mixBlendMode: "screen", filter: `blur(${blur}px) saturate(1.5)`, opacity: 0.65 }} />
      <div style={{ ...ringBase, transform: "translateX(-6px)", mixBlendMode: "screen", filter: `blur(${blur}px) saturate(1.5)`, opacity: 0.65 }} />

      {/* main glass ring */}
      <div style={{ ...ringBase, filter: `blur(${blur * 0.6}px) saturate(1.4) brightness(1.05)` }} />

      {/* glossy highlight (upper-left) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle at 36% 26%, rgba(255,255,255,0.9), transparent 26%)",
          WebkitMaskImage: RING_MASK,
          maskImage: RING_MASK,
          filter: "blur(5px)",
          opacity: reveal,
        }}
      />
    </div>
  );
};

const Hatch: React.FC<{ style: React.CSSProperties; o: number }> = ({ style, o }) => (
  <div
    style={{
      position: "absolute",
      width: 120,
      height: 60,
      opacity: o,
      backgroundImage:
        "repeating-linear-gradient(115deg, #ffffff 0 2px, transparent 2px 12px)",
      ...style,
    }}
  />
);

export const CyberTitle: React.FC<CyberTitleProps> = ({ headline, subtitle, readoutL, readoutR, seed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = composeLayout(STYLE, seed);

  const fade = (d: number) =>
    interpolate(frame, [d, d + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reveal = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const rot = (seed % 360) + frame * 0.45;

  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.color.background, overflow: "hidden", fontFamily: HEAD }}>
      {/* faint iridescent vignette glow */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 46%, rgba(122,92,255,0.18), transparent 55%)" }} />

      {/* bold headline BEHIND the glass (shows through the ring) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${L.headline!.y - 8}%`,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 168,
          letterSpacing: 2,
          color: "#f4f5f7",
          opacity: fade(2),
          textTransform: "uppercase",
        }}
      >
        {headline}
      </div>

      {/* the glass torus */}
      <GlassTorus rot={rot} reveal={reveal} palette={STYLE.color.palette} />

      {/* subtitle */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${L.secondary!.y + 16}%`,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 24,
          letterSpacing: 6,
          color: "#cfd2d9",
          opacity: fade(26),
        }}
      >
        {subtitle}
      </div>

      {/* hatch detail + corner mono readouts */}
      <Hatch style={{ right: "8%", top: "44%" }} o={fade(20) * 0.6} />
      <div style={{ position: "absolute", left: `${L.meta!.x}%`, top: `${L.meta!.y}%`, fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: "#aeb2bd", opacity: fade(10) }}>
        {readoutL}
      </div>
      <div style={{ position: "absolute", right: "7%", top: `${L.caption!.y}%`, textAlign: "right", fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: "#aeb2bd", opacity: fade(12) }}>
        {readoutR}
      </div>

      {/* top-left kicker */}
      <div style={{ position: "absolute", left: "7%", top: "7%", fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: "#aeb2bd", opacity: fade(6) }}>
        HOLOGRAM // 01
      </div>
    </AbsoluteFill>
  );
};
