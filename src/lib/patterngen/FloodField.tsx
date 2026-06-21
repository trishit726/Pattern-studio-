// FloodField — the "flood" intro: a full-screen grid of coloured tiles (mostly the
// brand accent, plus black/white shape tiles) sweeps in diagonally, holds, then
// clears away on the same diagonal to reveal the title underneath. Deterministic
// per seed. Renders nothing once the flood is over, so it's cheap after ~frame 50.
import React from "react";
import { useCurrentFrame } from "remotion";
import { mulberry32, ANIM_TYPES } from "./engine";
import { Shape } from "./PatternField";

const CELL = 48;
const COLS = Math.ceil(1920 / CELL); // 40
const ROWS = Math.ceil(1080 / CELL); // 23
const POP = 4; // frames a single tile takes to pop in / out
const FILL_SPREAD = 16; // frames the fill wave takes to cross the screen
const HOLD = 8; // frames the screen stays fully flooded
const CLEAR_START = FILL_SPREAD + HOLD; // 24
const CLEAR_SPREAD = 22; // frames the clear wave takes to cross
const DONE = CLEAR_START + CLEAR_SPREAD + POP + 2;

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export const FloodField: React.FC<{ accent: string; colors: string[]; seed: number; begin?: number }> = ({
  accent, colors, seed, begin = 0,
}) => {
  const frame = useCurrentFrame() - begin;
  if (frame < 0 || frame > DONE) return null; // flood hasn't started / is over

  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const palette = [accent, accent, accent, "#111111", "#ffffff", ...(colors.length ? colors : [accent])];
  const cells: React.ReactNode[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // advance the RNG for every cell (visible or not) so colours stay stable per frame
      const color = palette[Math.floor(rand() * palette.length)];
      const hasShape = rand() < 0.34;
      const anim = ANIM_TYPES[Math.floor(rand() * ANIM_TYPES.length)];

      const sw = (c + r) / (COLS + ROWS); // 0..1 diagonal position
      const inProg = clamp((frame - sw * FILL_SPREAD) / POP);
      const outProg = clamp((frame - (CLEAR_START + sw * CLEAR_SPREAD)) / POP);
      const vis = Math.min(inProg, 1 - outProg); // pop in → hold → pop out
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
