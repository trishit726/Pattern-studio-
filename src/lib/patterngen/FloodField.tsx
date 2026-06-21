// FloodField — the "flood" intro: coloured tiles (the brand accent + your Colour
// Set, plus black/white shape tiles) fill the screen and (optionally) stay. Fully
// parameterised so the editor can control the look, mirroring the scatter controls:
//   style   "random" (pixels pop up randomly) | "sweep" (diagonal wipe)
//   speed   1-10  how fast the fill completes
//   tile    1-10  tile size (chunky → fine)
//   shapes  0-10  how many tiles carry a shape icon
//   persist true  = grid stays | false = it clears away after filling
// Deterministic per seed.
import React from "react";
import { useCurrentFrame } from "remotion";
import { mulberry32, ANIM_TYPES } from "./engine";
import { Shape } from "./PatternField";

const POP = 6; // frames a single tile takes to pop in/out
const clamp = (v: number) => Math.max(0, Math.min(1, v));

export const FloodField: React.FC<{
  accent: string;
  colors: string[];
  seed: number;
  begin?: number;
  style?: "random" | "sweep";
  speed?: number; // 1-10
  tile?: number; // 1-10
  shapes?: number; // 0-10
  persist?: boolean;
}> = ({ accent, colors, seed, begin = 0, style = "random", speed = 5, tile = 6, shapes = 5, persist = true }) => {
  const frame = useCurrentFrame() - begin;
  if (frame < 0) return null;

  const CELL = Math.round(96 - tile * 6); // tile 1 → 90px (chunky), tile 10 → 36px (fine)
  const COLS = Math.ceil(1920 / CELL);
  const ROWS = Math.ceil(1080 / CELL);
  const FILL_SPREAD = (11 - speed) * 9; // speed 1 → 90f (slow), speed 10 → 9f (fast)
  const CLEAR_START = FILL_SPREAD + 16; // hold, then clear (only when persist = false)
  const shapeProb = (shapes / 10) * 0.6;

  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const palette = [accent, accent, accent, "#111111", "#ffffff", ...(colors.length ? colors : [accent])];
  const cells: React.ReactNode[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // advance the RNG for every cell (stable order) so the look is fixed per frame
      const color = palette[Math.floor(rand() * palette.length)];
      const hasShape = rand() < shapeProb;
      const anim = ANIM_TYPES[Math.floor(rand() * ANIM_TYPES.length)];
      const rDelay = rand(); // random appear order
      const rClear = rand(); // random clear order

      const order = style === "sweep" ? (c + r) / (COLS + ROWS) : rDelay;
      const inV = clamp((frame - order * FILL_SPREAD) / POP);
      let vis = inV;
      if (!persist) {
        const clearOrder = style === "sweep" ? (c + r) / (COLS + ROWS) : rClear;
        const outV = clamp((frame - (CLEAR_START + clearOrder * FILL_SPREAD)) / POP);
        vis = Math.min(inV, 1 - outV);
      }
      if (vis <= 0) continue;

      const fg = color === "#111111" ? "#ffffff" : "#111111";
      cells.push(
        <div
          key={`${c}-${r}`}
          style={{
            position: "absolute",
            left: c * CELL,
            top: r * CELL,
            width: CELL,
            height: CELL,
            background: color,
            transform: `scale(${vis})`,
            transformOrigin: "center",
          }}
        >
          {hasShape ? <Shape anim={anim} fg={fg} /> : null}
        </div>,
      );
    }
  }
  return <>{cells}</>;
};
