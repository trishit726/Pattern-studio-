# Pattern Studio

**Describe your brand in a sentence — get a broadcast‑quality animated title, rendered to MP4, in seconds.**

Pattern Studio is an AI‑assisted motion‑graphics tool. You type a one‑line description of a brand, product, or topic; **Google Gemini** designs a complete title scene — headline, palette, geometric pattern, and layout; you tweak anything in a live editor; and you export a finished MP4 with one click. It puts the kind of bold, editorial title animation that normally needs a motion designer into the hands of anyone who can type a sentence.

> Built for **UOE Summer of Code 2026** · Theme: **Open Innovation**

---

## The problem

High‑end motion graphics are a bottleneck for creators, founders, and small teams. A single animated brand title can cost hundreds of dollars or hours in After Effects, and the skills don't transfer to non‑designers. Template tools look generic; pro tools are too hard. *(There's a full 70s narrated breakdown in the [Problem statement video](public/examples/pattern-studio-problem.mp4).)*

## The solution

Pattern Studio collapses that to: **prompt → editable scene → MP4.**

- **AI brand‑from‑a‑prompt** — Google Gemini acts as a brand designer: from your description it returns a full scene (title text, sub‑label, colour palette, which of 16 geometric shapes to scatter, density/proximity, and layout) as validated, structured data that drops straight into the editor.
- **AI script‑writer** — one click writes a voiceover script for your demo/brand video.
- **Live editor** — drag titles, adjust density/proximity/stagger, pick shapes and brand colours, give **each title box its own colour**, add music/SFX, toggle a grid, save/load scenes as JSON. Everything the AI generates stays fully editable.
- **Two motion styles, deeply controllable** — *scatter* (shapes cluster around the title) or a *flood* intro with **6 fill styles** (random, sweep, radial, rows, columns, edges‑in), solid‑or‑mixed colour, and speed / tile‑size / shape sliders, plus stays‑or‑clears.
- **Audio‑reactive** — shapes and dots pulse in time with the music.
- **Export any aspect ratio** — render to **16:9, 3:2, 4:3, 5:4, 1:1, 4:5, or 9:16**; the server renders at full 1080p, then center‑crops to your ratio with ffmpeg (the design stays intact).
- **One‑click MP4** — a local render server bundles the scene with [Remotion](https://www.remotion.dev) and renders a real H.264 MP4.

---

## Videos — all made *with* Pattern Studio

Every film below was produced in the tool itself (Remotion compositions in the same editorial style), with free neural voiceovers:

| Film | What it is |
|---|---|
| 🎬 [**Promo**](public/examples/pattern-studio-promo.mp4) | ~37s narrated product film — prompt → scene → render |
| ❓ [**Problem statement**](public/examples/pattern-studio-problem.mp4) | ~71s narrated explainer of the problem we solve |
| 🎞️ [**Examples montage**](public/examples/pattern-studio-examples.mp4) | ~28s — six AI‑designed brands, each shown with its prompt |
| 🏗️ [**Architecture explainer**](public/examples/pattern-studio-architecture.mp4) | ~34s — how the editor → server → Gemini → Remotion pipeline works |

A browsable scene gallery is also served at `/examples/index.html` when the app is running.

**Typical flow:** type *“Ember — a warm, rustic coffee roaster”* → **Generate Scene** → the editor fills with an on‑brand title, palette, and scattered shapes → drag the title, tweak sliders, pick a flood style → choose an aspect ratio → **Render** → download the MP4.

---

## Example scenes — each from a one‑line prompt

|  |  |
|---|---|
| ![Ember Coffee](public/examples/coffee.png) | ![Neon Nights](public/examples/festival.png) |
| *“Ember — a warm, rustic coffee roaster”* | *“Neon Nights — a summer music festival”* |
| ![Maison Noir](public/examples/luxury.png) | ![Wild North](public/examples/travel.png) |
| *“Maison Noir — a luxury couture atelier”* | *“Wild North — an outdoor travel brand”* |

Animated `.mp4` versions of all six are in [`public/examples/`](public/examples).

## Architecture

```mermaid
flowchart LR
  U[You: one-line brand prompt] --> APP[Pattern Studio editor<br/>React + Vite :5173]
  APP -- POST /generate, /script --> SRV[Render server<br/>Express :3001]
  SRV -- generate / script --> AI[Google Gemini<br/>provider-agnostic: also Claude via Vertex / Anthropic]
  AI -- structured scene / script --> SRV
  SRV --> APP
  APP -- live preview --> PLAYER[Remotion Player]
  APP -- POST /render --> SRV
  SRV -- bundle + render + crop --> REMOTION[Remotion renderer + ffmpeg]
  REMOTION --> MP4[(out/*.mp4)]
```

- **Editor** (`app/`) — React + Remotion Player; designs the scene and previews it live.
- **Render server** (`server/render-server.mjs`) — Express backend. Holds all **AI calls server‑side** (keys/credentials never reach the browser), renders MP4s with `@remotion/renderer`, and crops to the chosen aspect ratio with ffmpeg.
- **Compositions** (`src/compositions/`) — the animated graphics (titles + the four demo films), defined in React + [Remotion](https://www.remotion.dev) with Zod‑typed props.
- **Pattern engine** (`src/lib/patterngen/`) — a deterministic, seeded generator that scatters shapes/squares/dots around the title, plus the flood‑grid intro (see [Attribution](#attribution)).

---

## Tech stack

| Area | Tech |
| --- | --- |
| Video / animation | Remotion 4, React 19, TypeScript |
| Editor | Vite 8, `@remotion/player`, `@remotion/media-utils` (audio‑reactive) |
| Backend | Node, Express 5, `@remotion/bundler` + `@remotion/renderer`, ffmpeg |
| AI | **Google Gemini** (`gemini-2.5-flash`) via Google AI Studio (`@google/genai`); a provider‑agnostic layer also runs Claude on **Vertex AI** / the **Anthropic API** |
| Schemas / validation | Zod 4 |
| Demo videos | Rendered in Remotion; free **Edge neural TTS** voiceovers; **ffmpeg** for aspect‑ratio crops |
| Optional AI image | Local ComfyUI (Stable Diffusion img2img) watercolour pass |

---

## Getting started

```bash
npm install
cp .env.example .env      # then edit (see below)
```

**Connect an AI provider** — pick one in `.env`:

```bash
# Option A — Google Gemini (free key from https://aistudio.google.com)
CLAUDE_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# Option B — Claude on Google Vertex AI (GCP credits; gcloud ADC + granted quota)
# CLAUDE_PROVIDER=vertex
# ANTHROPIC_VERTEX_PROJECT_ID=your-gcp-project-id
# CLOUD_ML_REGION=global

# Option C — first-party Anthropic API
# CLAUDE_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...
```

**Run it** (two terminals):

```bash
npm run server     # render + AI backend → http://localhost:3001
npm run app        # editor → http://localhost:5173
```

Then open the editor, type a brand description in **✨ AI Brand**, hit **Generate Scene**, edit, pick an aspect ratio, and **Render**.

**Other commands:**

```bash
npm run studio -- --port=3999    # Remotion Studio (browse/scrub all compositions)
npm run typecheck                # tsc --noEmit
npx remotion render PatternTitle out/title.mp4 --codec=h264 --crf=18 --port=4001
node tools/make-examples.mjs     # regenerate the example stills + gallery
node tools/make-voiceover.mjs promo   # (re)generate a voiceover (promo|arch|problem|tutorial)
```

---

## How the AI works

`POST /generate` sends your prompt to the model (Google Gemini by default) with a system prompt that frames it as a brand/motion designer and specifies an exact JSON shape. The server then **validates and clamps every field** (coordinates to 0–1, sizes and slider ranges to their bounds, shape ids to the known set, colours to valid hex) before returning it — the model's output is never trusted blindly. The result maps 1:1 onto the `PatternTitle` composition's Zod schema, so it renders immediately and stays editable.

`POST /script` returns a short, structured voiceover script (hook → problem → solution → CTA) for the demo video. `POST /render` renders the scene to an MP4 and, for non‑16:9 ratios, center‑crops the result with ffmpeg.

Both AI routes run on whichever provider `.env` selects — Gemini, Claude on Vertex, or the Anthropic API — a one‑line change.

---

## Roadmap

- Brand‑kit memory (logo, fonts, palette reused across scenes)
- More intro transitions and shape packs
- Template library + direct social publishing
- Hosted render queue for scalability beyond a single machine

---

## Attribution

This project stands on open work — full details in [`NOTICE.md`](NOTICE.md):

- The pattern‑placement engine in `src/lib/patterngen/` is **ported and adapted from [`patterngen-oss`](https://github.com/halfof8/patterngen) by halfof8 (MIT)**. Pattern Studio re‑implements it to be Remotion‑native and deterministic, and builds a new product around it (the live editor, the MP4 render pipeline, the flood intro, and the AI scene/script generation).
- [Remotion](https://www.remotion.dev) (video framework — see its own license), **Google Gemini** & Anthropic Claude (AI), Microsoft **Edge neural TTS** (voiceovers), Google Fonts **Anton** & **Shippori Mincho** (OFL), and **CC0** music/SFX.

## License

[MIT](LICENSE) © 2026 Trishit Bodkhe
