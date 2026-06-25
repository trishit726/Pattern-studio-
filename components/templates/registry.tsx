import type React from "react"
import type { z } from "zod"
import { seconds } from "@/src/config"
import type { TemplateField } from "./schema-controls"

import { TitleCard, titleCardSchema } from "@/src/compositions/TitleCard"
import { KineticText, kineticTextSchema } from "@/src/compositions/KineticText"
import { NameReveal, nameRevealSchema } from "@/src/compositions/NameReveal"
import { StyledNameReveal, styledNameRevealSchema } from "@/src/compositions/StyledNameReveal"
import { DesignerInJapan, designerInJapanSchema } from "@/src/compositions/DesignerInJapan"
import { LowerThird, lowerThirdSchema } from "@/src/compositions/LowerThird"
import { TransparentOverlay, transparentOverlaySchema } from "@/src/compositions/TransparentOverlay"
import { EndCard, endCardSchema, endCardDefaults } from "@/src/compositions/EndCard"
import { StatCountUp, statCountUpSchema, statCountUpDefaults } from "@/src/compositions/StatCountUp"
import { QuoteCard, quoteCardSchema, quoteCardDefaults } from "@/src/compositions/QuoteCard"
import { VerticalPromo, verticalPromoSchema, verticalPromoDefaults } from "@/src/compositions/VerticalPromo"
import { CaptionedClip, captionedClipSchema, captionedClipDefaults } from "@/src/compositions/CaptionedClip"

export type TemplateCategory = "Titles" | "Text" | "Overlays" | "Social" | "Data"
export type Aspect = "16:9" | "9:16" | "1:1"

export interface TemplateDef {
  /** Stable id — also the Remotion composition id used by the render server. */
  id: string
  label: string
  category: TemplateCategory
  blurb: string
  component: React.FC<any>
  schema: z.ZodTypeAny
  defaults: Record<string, any>
  durationInFrames: number
  aspect: Aspect
  /** True when the composition sets no background and can render with alpha. */
  supportsAlpha?: boolean
  /** Optional per-field UI hints (enum options, slider ranges, labels). */
  fields?: TemplateField[]
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "TitleCard",
    label: "Title Card",
    category: "Titles",
    blurb: "Centered title + subtitle with an accent rule.",
    component: TitleCard,
    schema: titleCardSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    defaults: {
      title: "Your Title Here",
      subtitle: "A neutral starting point you can restyle",
      backgroundColor: "#0f1115",
      textColor: "#f5f6f8",
      accentColor: "#5b8def",
    },
  },
  {
    id: "KineticText",
    label: "Kinetic Text",
    category: "Text",
    blurb: "Words spring in one-by-one, then fade.",
    component: KineticText,
    schema: kineticTextSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    defaults: {
      text: "Words that move with intent",
      backgroundColor: "#0f1115",
      textColor: "#f5f6f8",
      staggerFrames: 4,
    },
    fields: [{ key: "staggerFrames", label: "Stagger", min: 1, max: 20 }],
  },
  {
    id: "NameReveal",
    label: "Name Reveal",
    category: "Titles",
    blurb: "Elegant serif name that focuses in letter-by-letter.",
    component: NameReveal,
    schema: nameRevealSchema,
    durationInFrames: seconds(6),
    aspect: "16:9",
    defaults: {
      name: "Fable",
      tagline: "once upon a time",
      backgroundColor: "#0b0d12",
      textColor: "#f3efe6",
      accentColor: "#c9a86a",
      staggerFrames: 5,
    },
    fields: [{ key: "staggerFrames", label: "Stagger", min: 1, max: 20 }],
  },
  {
    id: "StyledNameReveal",
    label: "Styled Name Reveal",
    category: "Titles",
    blurb: "Same reveal, but the whole look comes from a style preset.",
    component: StyledNameReveal,
    schema: styledNameRevealSchema,
    durationInFrames: seconds(7),
    aspect: "16:9",
    defaults: {
      name: "Fable",
      tagline: "monogatari   ·   a tale",
      style: "japanese",
    },
    fields: [{ key: "style", options: ["japanese", "anthropic"] }],
  },
  {
    id: "DesignerInJapan",
    label: "Block Title",
    category: "Titles",
    blurb: "Heavy cut-out caps slap in like marker blocks.",
    component: DesignerInJapan,
    schema: designerInJapanSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    defaults: {
      lines: ["MAKE", "IT MOVE"],
      byline: "BRANDED MOTION",
      blockColor: "#ea431d",
      textColor: "#111111",
    },
    fields: [{ key: "lines", label: "Lines" }],
  },
  {
    id: "LowerThird",
    label: "Lower Third",
    category: "Overlays",
    blurb: "Name/role bar that slides over footage. Exports with alpha.",
    component: LowerThird,
    schema: lowerThirdSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    supportsAlpha: true,
    defaults: {
      name: "Jane Doe",
      role: "Motion Designer",
      barColor: "#1a1d24",
      textColor: "#f5f6f8",
      accentColor: "#5b8def",
    },
  },
  {
    id: "TransparentOverlay",
    label: "Live Badge",
    category: "Overlays",
    blurb: "Pulsing badge on a transparent canvas. Exports with alpha.",
    component: TransparentOverlay,
    schema: transparentOverlaySchema,
    durationInFrames: seconds(4),
    aspect: "16:9",
    supportsAlpha: true,
    defaults: {
      label: "LIVE",
      badgeColor: "#ee074f",
      textColor: "#ffffff",
    },
  },
  {
    id: "EndCard",
    label: "End Card / CTA",
    category: "Social",
    blurb: "Outro with a subscribe pill and your handle.",
    component: EndCard,
    schema: endCardSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    defaults: { ...endCardDefaults },
  },
  {
    id: "StatCountUp",
    label: "Stat Count-Up",
    category: "Data",
    blurb: "A big number that counts up to its target.",
    component: StatCountUp,
    schema: statCountUpSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    defaults: { ...statCountUpDefaults },
    fields: [
      { key: "value", min: 0, max: 1000, step: 1 },
      { key: "decimals", label: "Decimals", min: 0, max: 3 },
    ],
  },
  {
    id: "QuoteCard",
    label: "Quote Card",
    category: "Social",
    blurb: "A large pull-quote with attribution.",
    component: QuoteCard,
    schema: quoteCardSchema,
    durationInFrames: seconds(6),
    aspect: "16:9",
    defaults: { ...quoteCardDefaults },
  },
  {
    id: "VerticalPromo",
    label: "Vertical Promo",
    category: "Social",
    blurb: "9:16 promo for Reels / Stories / TikTok.",
    component: VerticalPromo,
    schema: verticalPromoSchema,
    durationInFrames: seconds(6),
    aspect: "9:16",
    defaults: { ...verticalPromoDefaults },
    fields: [{ key: "headline", label: "Headline" }],
  },
  {
    id: "CaptionedClip",
    label: "Captions",
    category: "Overlays",
    blurb: "Karaoke-style captions on transparent canvas. Exports with alpha.",
    component: CaptionedClip,
    schema: captionedClipSchema,
    durationInFrames: seconds(5),
    aspect: "16:9",
    supportsAlpha: true,
    defaults: { ...captionedClipDefaults },
    fields: [{ key: "wordsPerSecond", label: "Words / sec", min: 1, max: 8 }],
  },
]

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id)

export const ASPECT_DIMS: Record<Aspect, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
}
