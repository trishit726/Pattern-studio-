// Public entry point for the Style Engine.
//
// Importing this module registers all built-in Style Packs (side effect) and
// re-exports the resolver, registries, and types. Modules that need a style
// should import from here so the packs are guaranteed registered.

// ── Register built-in packs (import for side effects) ───────────────────────
import "./packs/default"
// Later phases register: swiss, brutalist, cyberHud, japaneseEditorial.

export * from "./types"
export { resolveStyle, DEFAULT_STYLE_ID } from "./resolve"
export { loadStyleFont } from "./fonts"
export {
  styles,
  layoutStrategies,
  geometryVocabs,
  focalMotifs,
  textures,
  effects,
  Registry,
} from "./registry"
export { DEFAULT_STYLE } from "./packs/default"
