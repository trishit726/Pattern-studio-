// FloodField — the "flood" intro: coloured tiles (mostly the brand accent, plus
// black/white shape tiles) pop up in RANDOM order across the screen and gradually
// fill it edge-to-edge, then STAY (the grid persists behind the title). The text
// blocks sit on top, so it reads as "text boxes with a colour grid filling in
// around them." Deterministic per seed.
import React from "react";
import { useCurrentFrame } from "remotion";
import { mulberry32, ANIM_TYPES } from "./engine";
import { Shape } from "./PatternField";

const CELL = 48;
const COLS = Math.ceil(1920 / CELL); // 40
const ROWS = Math.ceil(1080 / CELL); // 23
const POP = 6; // frames a single tile takes to pop in
const FILL_SPREAD = 50; // frames over which the random fill completes (~1.7s @30fps)

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export const FloodField: React.FC<{ accent: string; colors: string[]; seed: number; begin?: number }> = ({
  accent, colors, seed, begin = 0,
}) => {
  const frame = useCurrentFrame() - begin;
  if (frame < 0) return null;

  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const palette = [accent, accent, accent, "#111111", "#ffffff", ...(colors.length ? colors : [accent])];
  const cells: React.ReactNode[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // advance the RNG for every cell (in a stable order) so the look is fixed per frame
      const color = palette[Math.floor(rand() * palette.length)];
      const hasShape = rand() < 0.34;
      const anim = ANIM_TYPES[Math.floor(rand() * ANIM_TYPES.length)];
      const delay = rand(); // RANDOM appear time 0..1 → pixels pop up in random order

      const vis = clamp((frame - delay * FILL_SPREAD) / POP); // pops in, then STAYS at 1
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
