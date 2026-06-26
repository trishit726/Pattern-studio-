// Registry of Style-Engine compositions exposed in the web editor. Each is a
// self-contained procedural style (driven by its StyleSpec + Layout Engine +
// motifs). The editor renders/edits them generically from this map.
import { SwissTitle, swissTitleDefaults } from "@/src/compositions/SwissTitle"
import { BrutalistTitle, brutalistTitleDefaults } from "@/src/compositions/BrutalistTitle"
import { CyberTitle, cyberTitleDefaults } from "@/src/compositions/CyberTitle"
import { JapaneseTitle, japaneseTitleDefaults } from "@/src/compositions/JapaneseTitle"

export interface StyleCompEntry {
  component: React.FC<any>
  defaults: Record<string, any>
  width: number
  height: number
  durationInFrames: number
}

export const STYLE_COMPS: Record<string, StyleCompEntry> = {
  SwissTitle: { component: SwissTitle, defaults: swissTitleDefaults, width: 1920, height: 1080, durationInFrames: 150 },
  BrutalistTitle: { component: BrutalistTitle, defaults: brutalistTitleDefaults, width: 1920, height: 1080, durationInFrames: 150 },
  CyberTitle: { component: CyberTitle, defaults: cyberTitleDefaults, width: 1920, height: 1080, durationInFrames: 150 },
  JapaneseTitle: { component: JapaneseTitle, defaults: japaneseTitleDefaults, width: 1920, height: 1080, durationInFrames: 150 },
}

export const isStyleComp = (c: string): boolean => c in STYLE_COMPS
