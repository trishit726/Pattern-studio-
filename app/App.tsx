import React, { useMemo, useRef, useState, useEffect } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { useAppAuth } from "./lib/auth";
import { PatternTitle, patternTitleDefaults, type PatternTitleProps, type TitleItem } from "../src/compositions/PatternTitle";
import { Assembly, assemblyDefaults, ASSEMBLY_DURATION, type AssemblyProps } from "../src/compositions/Assembly";
import { Intro, introDefaults, INTRO_DURATION, type IntroProps } from "../src/compositions/Intro";
import { Timeline, timelineDefaults, calculateTimelineDuration, type TimelineScene, type SceneTransition } from "../src/compositions/Timeline";
import { FourCardsGrid, fourCardsSchema, fourCardsDefaults, type FourCardsProps } from "../src/compositions/FourCardsGrid";
import { Shape } from "../src/lib/patterngen/PatternField";
import { ANIM_TYPES } from "../src/lib/patterngen/engine";

const MUSIC = "music/lofi.mp3"; // CC0 lo-fi bed (HoliznaCC0) in public/music/
type CompId = "PatternTitle" | "Timeline" | "Assembly" | "Intro" | "FourCardsGrid";

const SERVER = "http://localhost:3001";
// Default brand palette + black/white — the preset "COLOR SET".
const PALETTE = ["#6fa5a9", "#93ab5a", "#cf9f4a", "#e0573a", "#000000", "#ffffff"];

const CONFORMITY_TEMPLATES = [
  {
    name: "Conformity Hero",
    props: {
      titles: [
        { id: "c1", kind: "block" as const, text: "CONFORMITY", x: 0.36, y: 0.46, size: 130 },
        { id: "c2", kind: "label" as const, text: "SPEC-TO-CODE DRIFT GATE", x: 0.36, y: 0.61, size: 30 },
      ],
      bgColor: "#0b0e14",
      accent: "#ff4a4a",
      colors: ["#3cd070", "#ff4a4a", "#2c3e50", "#5f7e96", "#ffffff"],
      density: 12,
      proximity: 3,
      seed: 42,
      stagger: 3,
      showGrid: true,
      intro: "flood" as const,
      floodStyle: "sweep" as const,
      floodSpeed: 6,
      floodSolid: false,
      cameraMove: "pushIn" as const,
      cameraAmount: 4,
      titleAnim: "wipe" as const,
      underline: false,
      scatter: true,
      paint: 50,
      bgImage: "",
      music: "",
      sfx: false,
      audioReactive: false,
    }
  },
  {
    name: "Conformity Blocked",
    props: {
      titles: [
        { id: "c3", kind: "block" as const, text: "MERGE\nBLOCKED.", x: 0.36, y: 0.46, size: 130 },
        { id: "c4", kind: "label" as const, text: "2 CONTRACT VIOLATIONS DETECTED", x: 0.36, y: 0.61, size: 30 },
      ],
      bgColor: "#0b0e14",
      accent: "#ff4a4a",
      colors: ["#ff4a4a", "#111111", "#333333", "#ffffff"],
      density: 10,
      proximity: 2,
      seed: 99,
      stagger: 2,
      showGrid: true,
      intro: "flood" as const,
      floodStyle: "radial" as const,
      floodSpeed: 5,
      floodSolid: false,
      cameraMove: "pan" as const,
      cameraDir: "down" as const,
      cameraAmount: 3,
      titleAnim: "perLetter" as const,
      underline: false,
      scatter: true,
      paint: 50,
      bgImage: "",
      music: "",
      sfx: false,
      audioReactive: false,
    }
  },
  {
    name: "Conformity Success",
    props: {
      titles: [
        { id: "c5", kind: "block" as const, text: "CODE\nMATCHED.", x: 0.36, y: 0.46, size: 130 },
        { id: "c6", kind: "label" as const, text: "CONTRACT VERIFIED • MERGE MAY PROCEED", x: 0.36, y: 0.61, size: 30 },
      ],
      bgColor: "#0b0e14",
      accent: "#3cd070",
      colors: ["#3cd070", "#111111", "#222222", "#ffffff"],
      density: 10,
      proximity: 2,
      seed: 88,
      stagger: 2,
      showGrid: true,
      intro: "flood" as const,
      floodStyle: "sweep" as const,
      floodSpeed: 5,
      floodSolid: false,
      cameraMove: "pushIn" as const,
      cameraAmount: 3,
      titleAnim: "wipe" as const,
      underline: false,
      scatter: true,
      paint: 50,
      bgImage: "",
      music: "",
      sfx: false,
      audioReactive: false,
    }
  }
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const fileToDataURL = (f: File) =>
  new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });

const newTitle = (kind: TitleItem["kind"]): TitleItem => ({
  id: `t${Date.now()}`, kind,
  text: kind === "jp" ? "テキスト" : kind === "label" ? "SUB LABEL" : "TITLE",
  x: 0.5, y: 0.5, size: kind === "block" ? 130 : kind === "label" ? 30 : 40,
});

export const App: React.FC = () => {
  const { isSignedIn, userId, userName, AuthUI } = useAppAuth();
  const [cloudScenes, setCloudScenes] = useState<any[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [cloudSaveName, setCloudSaveName] = useState("");
  const [showCloudModal, setShowCloudModal] = useState(false);

  const [comp, setComp] = useState<CompId>("PatternTitle");
  const [props, setProps] = useState<PatternTitleProps>(patternTitleDefaults);
  const [assemblyProps, setAssemblyProps] = useState<AssemblyProps>(assemblyDefaults);
  const [introProps, setIntroProps] = useState<IntroProps>(introDefaults);
  const [fourCardsProps, setFourCardsProps] = useState<FourCardsProps>(fourCardsDefaults);
  const updateCard = (idx: number, patch: Partial<typeof fourCardsDefaults.cards[0]>) => {
    setFourCardsProps((p) => ({
      ...p,
      cards: p.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };
  const [duration, setDuration] = useState(150);
  const [selectedId, setSelectedId] = useState(props.titles[0]?.id ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aiPaint, setAiPaint] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ratio, setRatio] = useState("16:9");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [script, setScript] = useState("");
  const [scriptBusy, setScriptBusy] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // ── Timeline (multi-scene) state ──────────────────────────────────────────
  // `props`/`duration` are the editor's working copy of the CURRENT scene.
  // `liveScenes()` merges that copy back into the committed list, and every
  // consumer (reel preview, render, save) reads through it — so there's no
  // background sync to race with.
  const [scenes, setScenes] = useState<TimelineScene[]>(timelineDefaults.scenes);
  const [current, setCurrent] = useState(0);
  const [previewMode, setPreviewMode] = useState<"scene" | "reel">("scene");
  const [timelineMusic, setTimelineMusic] = useState("");

  React.useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const set = <K extends keyof PatternTitleProps>(k: K, v: PatternTitleProps[K]) => setProps((p) => ({ ...p, [k]: v }));
  // Reactive needs a music track to react to, so toggling it on also turns music on.
  const toggleReactive = () => setProps((p) => {
    const on = !p.audioReactive;
    return { ...p, audioReactive: on, music: on ? (p.music || MUSIC) : p.music };
  });
  const inputProps = useMemo(() => props, [props]);
  const sel = props.titles.find((t) => t.id === selectedId);

  // titles
  const setTitle = (id: string, patch: Partial<TitleItem>) =>
    setProps((p) => ({ ...p, titles: p.titles.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const addTitle = (kind: TitleItem["kind"]) => { const t = newTitle(kind); setProps((p) => ({ ...p, titles: [...p.titles, t] })); setSelectedId(t.id); };
  const removeTitle = (id: string) => setProps((p) => ({ ...p, titles: p.titles.filter((t) => t.id !== id) }));
  const moveSel = (e: React.PointerEvent) => {
    const el = dragRef.current; if (!el || !selectedId) return;
    const r = el.getBoundingClientRect();
    setTitle(selectedId, { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) });
  };

  // shapes
  const toggleShape = (a: string) => {
    const shapes = props.shapes ?? [];
    set("shapes", shapes.includes(a) ? shapes.filter((s) => s !== a) : [...shapes, a]);
  };
  const allShapes = props.shapes ? ANIM_TYPES.every((a) => props.shapes.includes(a)) : false;

  // pattern colors
  const has = (c: string) => (props.colors ?? []).some((x) => x.toLowerCase() === c.toLowerCase());
  const toggleColor = (c: string) => {
    const colors = props.colors ?? [];
    set("colors", has(c) ? colors.filter((x) => x.toLowerCase() !== c.toLowerCase()) : [...colors, c]);
  };
  const customs = (props.colors ?? []).filter((c) => !PALETTE.includes(c.toLowerCase()));
  const replaceColor = (oldC: string, newC: string) => set("colors", (props.colors ?? []).map((x) => (x === oldC ? newC : x)));
  const removeColor = (c: string) => set("colors", (props.colors ?? []).filter((x) => x !== c));
  const addColor = () => { if (customs.length < 3) set("colors", [...(props.colors ?? []), "#808080"]); };

  // background
  const onImage = (f: File | null) => { setImageFile(f); set("bgImage", f ? URL.createObjectURL(f) : ""); };

  // ── Timeline scene management ─────────────────────────────────────────────
  // The current scene merged from the live editor copy (props/duration).
  const liveScenes = (): TimelineScene[] =>
    scenes.map((s, i) => (i === current ? { ...s, props, durationInFrames: duration } : s));
  const loadScene = (ls: TimelineScene[], i: number) => {
    const sc = ls[i]; if (!sc) return;
    setProps(sc.props); setDuration(sc.durationInFrames);
    setSelectedId(sc.props.titles[0]?.id ?? ""); setCurrent(i);
  };
  const selectScene = (i: number) => { const ls = liveScenes(); setScenes(ls); loadScene(ls, i); };
  const addScene = () => {
    const ls = liveScenes();
    const ns: TimelineScene = { id: `sc${Date.now()}`, durationInFrames: 120, transition: { type: "fade", durationInFrames: 15 }, props: { ...patternTitleDefaults, music: "", sfx: false } };
    const next = [...ls, ns]; setScenes(next); loadScene(next, next.length - 1);
  };
  const duplicateScene = () => {
    const ls = liveScenes(); const src = ls[current]; if (!src) return;
    const copy: TimelineScene = { ...src, id: `sc${Date.now()}`, props: { ...src.props, titles: src.props.titles.map((t) => ({ ...t })) } };
    const next = [...ls.slice(0, current + 1), copy, ...ls.slice(current + 1)]; setScenes(next); loadScene(next, current + 1);
  };
  const deleteScene = (i: number) => {
    const ls = liveScenes(); if (ls.length <= 1) return;
    const next = ls.filter((_, idx) => idx !== i); setScenes(next);
    loadScene(next, Math.max(0, Math.min(i, next.length - 1)));
  };
  const moveScene = (dir: -1 | 1) => {
    const ls = liveScenes(); const j = current + dir; if (j < 0 || j >= ls.length) return;
    const next = [...ls]; [next[current], next[j]] = [next[j], next[current]]; setScenes(next); setCurrent(j);
  };
  const setTransition = (patch: Partial<SceneTransition>) => {
    const ls = liveScenes(); const base = ls[current]?.transition ?? { type: "fade" as const, durationInFrames: 15 };
    setScenes(ls.map((s, idx) => (idx === current ? { ...s, transition: { ...base, ...patch } } : s)));
  };

  // ── Visual timeline track (ruler + clips + scrub playhead) ────────────────
  const FPS = 30;
  const [pxPerSec, setPxPerSec] = useState(40);
  const [playhead, setPlayhead] = useState(0); // frames, from the reel Player
  const playerRef = useRef<PlayerRef>(null);
  const resizeRef = useRef<{ i: number; startX: number; startDur: number } | null>(null);
  const setSceneDuration = (i: number, frames: number) => {
    const f = Math.max(15, Math.min(900, Math.round(frames)));
    if (i === current) setDuration(f); else setScenes((ss) => ss.map((s, idx) => (idx === i ? { ...s, durationInFrames: f } : s)));
  };
  const onResizeDown = (e: React.PointerEvent, i: number, durFrames: number) => { e.stopPropagation(); resizeRef.current = { i, startX: e.clientX, startDur: durFrames }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onResizeMove = (e: React.PointerEvent) => { const r = resizeRef.current; if (!r) return; setSceneDuration(r.i, r.startDur + ((e.clientX - r.startX) / pxPerSec) * FPS); };
  const onResizeUp = (e: React.PointerEvent) => { if (resizeRef.current) { resizeRef.current = null; e.currentTarget.releasePointerCapture(e.pointerId); } };
  const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

  // Mirror the reel Player's playhead onto the timeline.
  React.useEffect(() => {
    const p = playerRef.current; if (!p) return;
    const on = (e: { detail: { frame: number } }) => setPlayhead(e.detail.frame);
    p.addEventListener("frameupdate", on as never);
    return () => p.removeEventListener("frameupdate", on as never);
  }, [comp, previewMode]);
  // Switch composition mode; commit timeline edits on the way out, load the
  // current scene into the editor on the way in.
  const switchComp = (next: CompId) => {
    if (next === comp) return;
    if (comp === "Timeline") setScenes(liveScenes());
    if (next === "Timeline") { const sc = scenes[current] ?? scenes[0]; if (sc) { setProps(sc.props); setDuration(sc.durationInFrames); setSelectedId(sc.props.titles[0]?.id ?? ""); } }
    setComp(next);
  };
  const isPattern = comp === "PatternTitle" || comp === "Timeline";

  // Load cloud scenes list
  const fetchCloudScenes = async () => {
    if (!userId) return;
    setCloudLoading(true);
    setCloudError("");
    try {
      const res = await fetch(`/api/list?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCloudScenes(data);
    } catch (e: any) {
      console.error(e);
      setCloudError(e.message || "Failed to load cloud library");
    } finally {
      setCloudLoading(false);
    }
  };

  // Save scene to cloud
  const saveSceneToCloud = async (name: string) => {
    if (!userId) {
      alert("Please sign in to save scenes to the cloud.");
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) return;

    setCloudLoading(true);
    try {
      const payload = {
        id: `scene-${Date.now()}`,
        userId,
        name: cleanName,
        props,
        duration,
      };

      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      
      setStatus(`Scene "${cleanName}" saved to cloud library! ✓`);
      fetchCloudScenes();
      setCloudSaveName("");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to save scene: ${e.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  // Load a scene from cloud item
  const loadSceneFromCloud = async (sceneItem: any) => {
    try {
      if (sceneItem.props) {
        setProps(sceneItem.props);
        if (sceneItem.duration) setDuration(sceneItem.duration);
        setSelectedId(sceneItem.props.titles?.[0]?.id ?? "");
        setComp("PatternTitle");
        setStatus(`Loaded cloud scene "${sceneItem.name}" ✓`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete scene from cloud
  const deleteSceneFromCloud = async (id: string) => {
    if (!userId) return;
    if (!confirm("Are you sure you want to delete this scene?")) return;
    setCloudLoading(true);
    try {
      const res = await fetch(`/api/delete?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Deleted scene from cloud library.");
      fetchCloudScenes();
    } catch (e: any) {
      console.error(e);
      alert(`Failed to delete scene: ${e.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  // Auto-fetch cloud scenes on auth change
  useEffect(() => {
    if (isSignedIn && userId) {
      fetchCloudScenes();
    } else {
      setCloudScenes([]);
    }
  }, [isSignedIn, userId]);

  // save / load
  const save = () => {
    const data = comp === "Timeline" ? { version: 2, scenes: liveScenes(), music: timelineMusic } : { props, duration };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = comp === "Timeline" ? "pattern-timeline.json" : "pattern-scene.json"; a.click();
  };
  const load = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (d.version === 2 && Array.isArray(d.scenes) && d.scenes.length) {
          setScenes(d.scenes); setTimelineMusic(d.music ?? ""); setComp("Timeline");
          loadScene(d.scenes, 0);
        } else if (d.props) {
          setProps(d.props); setSelectedId(d.props.titles?.[0]?.id ?? ""); if (d.duration) setDuration(d.duration); setComp("PatternTitle");
        }
      } catch (e) { console.error(e); }
    };
    inp.click();
  };

  // AI: turn a one-line brand description into a full PatternTitle scene.
  const generateAI = async () => {
    if (!aiPrompt.trim() || aiBusy) return;
    setAiBusy(true); setVideoUrl(null); setStatus("Designing your scene with AI…");
    try {
      const res = await fetch(`/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt }) });
      if (!res.ok) throw new Error(await res.text());
      const s = await res.json();
      const titles: TitleItem[] = (s.titles ?? []).map((t: any, i: number) => ({
        id: `ai${Date.now()}_${i}`, kind: t.kind as TitleItem["kind"], text: String(t.text), x: t.x, y: t.y, size: t.size,
      }));
      setProps((p) => ({
        ...p,
        titles: titles.length ? titles : p.titles,
        accent: s.accent ?? p.accent,
        bgColor: s.bgColor ?? p.bgColor,
        colors: Array.isArray(s.colors) && s.colors.length ? s.colors : p.colors,
        density: s.density ?? p.density,
        proximity: s.proximity ?? p.proximity,
        seed: s.seed ?? p.seed,
        shapes: Array.isArray(s.shapes) && s.shapes.length ? s.shapes : p.shapes,
      }));
      setSelectedId(titles[0]?.id ?? "");
      setStatus("AI scene ready ✓ — drag, tweak, or Render to MP4.");
    } catch (e) {
      setStatus("AI unavailable — check that GEMINI_API_KEY is configured in your env/Vercel settings.");
      console.error(e);
    } finally { setAiBusy(false); }
  };

  // AI: write a short voiceover script for the demo/brand video.
  const writeScript = async () => {
    if (scriptBusy) return;
    const topic = aiPrompt.trim() || props.titles.map((t) => t.text).join(" ");
    if (!topic) { setStatus("Type a brand/topic first."); return; }
    setScriptBusy(true);
    try {
      const res = await fetch(`/api/script`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: topic }) });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setScript(j.script ?? "");
    } catch (e) {
      setScript("Script writer unavailable — check that GEMINI_API_KEY is configured.");
      console.error(e);
    } finally { setScriptBusy(false); }
  };

  const render = async () => {
    setRendering(true); setVideoUrl(null); setStatus("Rendering… (first run bundles, ~30–60s)");
    try {
      let body: Record<string, unknown>;
      if (comp === "Assembly") {
        body = { composition: "Assembly", props: assemblyProps };
      } else if (comp === "Intro") {
        body = { composition: "Intro", props: introProps, aiPaint };
      } else if (comp === "Timeline") {
        // Strip browser-only blob:/data: bg images (server can't resolve them).
        const clean = liveScenes().map((s) => ({ ...s, props: { ...s.props, bgImage: /^(blob:|data:)/.test(s.props.bgImage) ? "" : s.props.bgImage } }));
        body = { composition: "Timeline", props: { scenes: clean, music: timelineMusic } };
      } else if (comp === "FourCardsGrid") {
        body = { composition: "FourCardsGrid", props: fourCardsProps };
      } else {
        let imageData: string | undefined, imageExt: string | undefined;
        if (imageFile) { imageData = await fileToDataURL(imageFile); imageExt = imageFile.name.split(".").pop() || "jpg"; }
        const sendProps = { ...props, bgImage: imageData || props.bgImage.startsWith("blob:") ? "" : props.bgImage };
        body = { composition: "PatternTitle", props: sendProps, imageData, imageExt, duration, aiPaint };
      }
      body.ratio = ratio;
      const res = await fetch(`${SERVER}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json(); setVideoUrl(`${SERVER}${json.url}`); setStatus("Done ✓");
      
      // Log successful render to Vercel Postgres
      if (userId) {
        fetch("/api/log-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            composition: comp,
            durationSec: Math.round((comp === "Timeline" ? calculateTimelineDuration(liveScenes()) : duration) / 30),
            status: "success",
          }),
        }).catch((err) => console.error("Error logging render:", err));
      }
    } catch (e: any) {
      setStatus("Error — is the render server up? (npm run server)");
      console.error(e);
      
      // Log failed render to Vercel Postgres
      if (userId) {
        fetch("/api/log-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            composition: comp,
            durationSec: Math.round((comp === "Timeline" ? calculateTimelineDuration(liveScenes()) : duration) / 30),
            status: "failed",
          }),
        }).catch((err) => console.error("Error logging render:", err));
      }
    }
    finally { setRendering(false); }
  };

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.row}>
          <span style={S.brand}>PATTERN STUDIO</span>
          <select value={comp} onChange={(e) => switchComp(e.target.value as CompId)} style={S.compSelect}>
            <option value="PatternTitle">Pattern Title</option>
            <option value="Timeline">Timeline (multi-scene)</option>
            <option value="Intro">Intro (opener)</option>
            <option value="Assembly">Assembly (film)</option>
            <option value="FourCardsGrid">Workflow Grid</option>
          </select>
          <button className="link-btn" onClick={save} title="Save scene configuration locally as JSON">Local Save</button>
          <button className="link-btn" onClick={load} title="Load local scene JSON file">Local Load</button>
          {isSignedIn ? (
            <button className="link-btn accent" onClick={() => { setShowCloudModal(true); fetchCloudScenes(); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              ☁️ Cloud Library
            </button>
          ) : (
            <div title="Sign in to unlock saving and loading scenes from AWS DynamoDB">
              {AuthUI}
            </div>
          )}
        </div>
        <div style={S.row}>
          {isPattern ? <button className="link-btn" onClick={() => set("seed", Math.floor(Math.random() * 1e9))}>Generate</button> : null}
          <select value={ratio} onChange={(e) => setRatio(e.target.value)} title="Render aspect ratio" style={{ ...S.compSelect, fontSize: 14, padding: "5px 8px" }}>
            <option value="16:9">16:9</option>
            <option value="3:2">3:2</option>
            <option value="4:3">4:3</option>
            <option value="5:4">5:4</option>
            <option value="1:1">1:1</option>
            <option value="4:5">4:5 ↕</option>
            <option value="9:16">9:16 ↕</option>
          </select>
          <button className="link-btn accent" disabled={rendering} onClick={render}>{rendering ? "Rendering…" : "Render"}</button>
          {isPattern ? <button className={(props.scatter ?? true) ? "link-btn accent" : "link-btn"} title="Toggle the scattered random shapes" onClick={() => set("scatter", !(props.scatter ?? true))}>Scatter</button> : null}
          {isPattern ? <button className={props.showGrid ? "link-btn accent" : "link-btn"} onClick={() => set("showGrid", !props.showGrid)}>Grid</button> : null}
          {isPattern ? <button className={props.intro === "flood" ? "link-btn accent" : "link-btn"} onClick={() => set("intro", props.intro === "flood" ? "none" : "flood")}>Flood</button> : null}
          {isPattern ? <button className={props.audioReactive ? "link-btn accent" : "link-btn"} onClick={toggleReactive}>Reactive</button> : null}
          <button className="link-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Dark" : "Light"}</button>
          {isSignedIn && (
            <div style={{ marginLeft: 10, display: "flex", alignItems: "center" }}>
              {AuthUI}
            </div>
          )}
        </div>
      </header>

      <div style={S.canvasCell}>
        <div style={{ position: "relative", width: "100%", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
          {comp === "Assembly" ? (
            <Player acknowledgeRemotionLicense component={Assembly} inputProps={assemblyProps} durationInFrames={ASSEMBLY_DURATION} fps={30}
              compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", aspectRatio: "16 / 9" }}
              initialFrame={Math.min(40, ASSEMBLY_DURATION - 1)} controls loop />
          ) : comp === "Intro" ? (
            <Player acknowledgeRemotionLicense component={Intro} inputProps={introProps} durationInFrames={INTRO_DURATION} fps={30}
              compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", aspectRatio: "16 / 9" }}
              initialFrame={Math.min(40, INTRO_DURATION - 1)} controls loop />
          ) : comp === "Timeline" && previewMode === "reel" ? (
            <Player ref={playerRef} acknowledgeRemotionLicense component={Timeline} inputProps={{ scenes: liveScenes(), music: timelineMusic }} durationInFrames={calculateTimelineDuration(liveScenes())} fps={30}
              compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", aspectRatio: "16 / 9" }} controls loop />
          ) : comp === "FourCardsGrid" ? (
            <Player acknowledgeRemotionLicense component={FourCardsGrid} inputProps={fourCardsProps} durationInFrames={240} fps={30}
              compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", aspectRatio: "16 / 9" }}
              initialFrame={40} controls loop />
          ) : (
            <>
              <Player acknowledgeRemotionLicense component={PatternTitle} inputProps={inputProps} durationInFrames={duration} fps={30}
                compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", aspectRatio: "16 / 9" }}
                initialFrame={Math.min(90, duration - 1)} controls loop />
              <div ref={dragRef} style={{ position: "absolute", inset: 0, bottom: 46, cursor: "move" }}
                onPointerDown={(e) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveSel(e); }}
                onPointerMove={(e) => { if (draggingRef.current) moveSel(e); }}
                onPointerUp={(e) => { draggingRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }} />
            </>
          )}
        </div>
        <div style={S.status}>{status || (comp === "Assembly" ? "Assembly — the full ~18.5s film. Edit title/site & toggle music below." : comp === "Intro" ? "Intro — the animated opener (~16.7s). Edit text & audio below." : comp === "FourCardsGrid" ? "Workflow Grid — a 4-card horizontal video sequence. Edit card titles, paths, and horizontal alignment below." : comp === "Timeline" ? `Scene ${current + 1} of ${scenes.length} · ${previewMode === "reel" ? "full reel preview (drag disabled)" : "editing this scene — drag titles to move them"}` : sel ? `Dragging "${sel.text.replace(/\n/g, " ")}" — pick another title to move it.` : "Add a title below.")}</div>

        {comp === "Timeline" ? (() => {
          const ls = liveScenes();
          let acc = 0;
          const clips = ls.map((s) => { const left = (acc / FPS) * pxPerSec; const width = (s.durationInFrames / FPS) * pxPerSec; acc += s.durationInFrames; return { s, left, width }; });
          const sumSec = acc / FPS;
          const totalFrames = calculateTimelineDuration(ls);
          const factor = totalFrames > 0 ? acc / totalFrames : 1; // map real frame → edge-to-edge px space
          const ticks: number[] = []; for (let t = 0; t <= Math.ceil(sumSec); t += 5) ticks.push(t);
          const trackW = Math.max(sumSec * pxPerSec + 40, 320);
          const seek = (clientX: number, el: HTMLDivElement) => { const r = el.getBoundingClientRect(); const sec = (clientX + el.scrollLeft - r.left) / pxPerSec; playerRef.current?.seekTo(Math.max(0, Math.round((sec / factor) * FPS))); };
          return (
            <div style={S.timeline}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <button className="link-btn" onClick={addScene}>+ Scene</button>
                <button className="link-btn" onClick={duplicateScene}>Duplicate</button>
                <button className="link-btn" onClick={() => deleteScene(current)}>Delete</button>
                <button className="link-btn" onClick={() => moveScene(-1)} title="Move scene left">◀</button>
                <button className="link-btn" onClick={() => moveScene(1)} title="Move scene right">▶</button>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "var(--muted-2)" }}>{fmtClock(totalFrames / FPS)}</span>
                <span style={{ fontSize: 12, color: "var(--muted-2)" }}>Zoom</span>
                <input type="range" min={15} max={160} value={pxPerSec} onChange={(e) => setPxPerSec(+e.target.value)} />
              </div>
              <div style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid var(--bar-empty)", borderRadius: 6, background: "var(--panel)" }}>
                <div style={{ position: "relative", width: trackW }}>
                  <div style={{ position: "relative", height: 22, borderBottom: "1px solid var(--bar-empty)", cursor: "text" }} onPointerDown={(e) => seek(e.clientX, e.currentTarget)}>
                    {ticks.map((t) => (
                      <div key={t} style={{ position: "absolute", left: t * pxPerSec, top: 0, height: "100%", borderLeft: "1px solid var(--bar-empty)", paddingLeft: 4, fontSize: 10, color: "var(--muted-2)" }}>{fmtClock(t)}</div>
                    ))}
                  </div>
                  <div style={{ position: "relative", height: 70 }} onPointerDown={(e) => seek(e.clientX, e.currentTarget)}>
                    {clips.map(({ s, left, width }, i) => {
                      const seld = i === current;
                      const t = ((ls[i].props.titles.find((x) => x.kind === "block") ?? ls[i].props.titles[0])?.text ?? `Scene ${i + 1}`).replace(/\n/g, " ");
                      const tr = ls[i].transition;
                      return (
                        <div key={s.id} onPointerDown={(e) => { e.stopPropagation(); selectScene(i); }} title={t}
                          style={{ position: "absolute", left: left + 1, width: Math.max(10, width - 2), top: 8, height: 54, borderRadius: 6, cursor: "pointer", overflow: "hidden", border: `2px solid ${seld ? "var(--accent)" : "var(--bar-empty)"}`, background: "var(--bg)" }}>
                          <div style={{ height: 8, background: ls[i].props.accent }} />
                          <div style={{ padding: "3px 8px 0", fontSize: 12, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i + 1}. {t}</div>
                          <div style={{ padding: "0 8px", fontSize: 10, color: "var(--muted-2)" }}>{(s.durationInFrames / FPS).toFixed(1)}s{tr && tr.type !== "cut" && i < clips.length - 1 ? ` · ${tr.type}→` : ""}</div>
                          <div onPointerDown={(e) => onResizeDown(e, i, s.durationInFrames)} onPointerMove={onResizeMove} onPointerUp={onResizeUp} title="Drag to change length"
                            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize", background: seld ? "var(--accent)" : "var(--bar-empty)", opacity: 0.6 }} />
                        </div>
                      );
                    })}
                    {previewMode === "reel" ? <div style={{ position: "absolute", left: (playhead / FPS) * pxPerSec * factor, top: 0, bottom: 0, width: 2, background: "var(--accent)", pointerEvents: "none" }} /> : null}
                  </div>
                </div>
              </div>
              <div style={S.status}>Click a clip to edit it · drag its right edge to change length · click the ruler to scrub (reel preview). Reorder with ◀ ▶.</div>
            </div>
          );
        })() : null}
      </div>

      <aside style={S.sidebar}>
        {isPattern ? (
        <>
        {comp === "Timeline" ? (
          <>
            <Section title="Preview">
              <div style={{ display: "flex", gap: 14 }}>
                <button className={previewMode === "scene" ? "link-btn accent" : "link-btn"} onClick={() => setPreviewMode("scene")}>This scene</button>
                <button className={previewMode === "reel" ? "link-btn accent" : "link-btn"} onClick={() => setPreviewMode("reel")}>Full reel</button>
              </div>
            </Section>

            {current < scenes.length - 1 ? (
              <Section title="Transition → next">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  {(["cut", "fade", "slide", "wipe"] as const).map((t) => (
                    <button key={t} className={(liveScenes()[current].transition?.type ?? "fade") === t ? "link-btn accent" : "link-btn"} style={{ textTransform: "capitalize" }} onClick={() => setTransition({ type: t })}>{t}</button>
                  ))}
                </div>
                {(() => {
                  const tr = liveScenes()[current].transition; const type = tr?.type ?? "fade";
                  return (type === "slide" || type === "wipe") ? (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      {(["from-left", "from-right", "from-top", "from-bottom"] as const).map((d) => (
                        <button key={d} className={(tr?.direction ?? "from-right") === d ? "link-btn accent" : "link-btn"} onClick={() => setTransition({ direction: d })}>{d.replace("from-", "")}</button>
                      ))}
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const tr = liveScenes()[current].transition; const type = tr?.type ?? "fade"; const dur = tr?.durationInFrames ?? 15;
                  return type !== "cut" ? (
                    <>
                      <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 6 }}>LENGTH {dur}f</div>
                      <BarSlider value={Math.max(1, Math.round(dur / 3))} min={1} max={20} onChange={(v) => setTransition({ durationInFrames: v * 3 })} />
                    </>
                  ) : null;
                })()}
              </Section>
            ) : null}

            <Section title="Reel Music">
              <button className={timelineMusic ? "link-btn accent" : "link-btn"} onClick={() => setTimelineMusic(timelineMusic ? "" : MUSIC)}>Music Bed</button>
              <div style={{ ...S.status, marginTop: 8 }}>One bed across the whole reel. Per-scene audio is muted in the timeline.</div>
            </Section>
          </>
        ) : null}
        {comp === "PatternTitle" ? (
          <Section title="Conformity Presets">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              {CONFORMITY_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  className="link-btn"
                  style={{
                    fontSize: 14,
                    border: "1px solid var(--bar-empty)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    background: "var(--panel)",
                    color: "var(--fg)",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setProps({ ...patternTitleDefaults, ...t.props });
                    setDuration(180); // 6 seconds at 30 fps
                    setSelectedId(t.props.titles[0]?.id ?? "");
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Section>
        ) : null}
        <Section title="✨ AI Brand">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe your brand or topic — e.g. “Ember, a warm rustic specialty coffee roaster”"
            rows={3}
            style={{ width: "100%", resize: "vertical", background: "var(--bg)", color: "var(--input-text)", border: "1px solid var(--bar-empty)", borderRadius: 6, fontFamily: "inherit", fontSize: 14, padding: 10, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 16, marginTop: 10, alignItems: "center" }}>
            <button className="link-btn accent" disabled={aiBusy || !aiPrompt.trim()} onClick={generateAI}>{aiBusy ? "Designing…" : "Generate Scene"}</button>
            <button className="link-btn" disabled={scriptBusy} onClick={writeScript}>{scriptBusy ? "Writing…" : "Write Script"}</button>
          </div>
          <div style={{ ...S.status, marginTop: 8 }}>Type a description, then Generate — Claude designs the title, palette &amp; pattern. Everything stays editable.</div>
          {script ? (
            <div style={{ marginTop: 12 }}>
              <textarea readOnly value={script} rows={8} style={{ width: "100%", resize: "vertical", background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--bar-empty)", borderRadius: 6, fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, padding: 10, boxSizing: "border-box" }} />
              <button className="link-btn" style={{ fontSize: 14, marginTop: 6 }} onClick={() => navigator.clipboard.writeText(script)}>Copy script</button>
            </div>
          ) : null}
        </Section>

        <Section title="Titles">
          {props.titles.map((t) => (
            <div key={t.id} onClick={() => setSelectedId(t.id)}
              style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, padding: 8, borderRadius: 6, cursor: "pointer", border: `1px solid ${t.id === selectedId ? "var(--accent)" : "var(--bar-empty)"}`, background: t.id === selectedId ? "var(--panel)" : "transparent" }}>
              <span style={{ fontSize: 10, color: "var(--muted-2)", textTransform: "uppercase", width: 34, paddingTop: 6 }}>{t.kind}</span>
              <textarea value={t.text} rows={t.kind === "block" ? 2 : 1} onChange={(e) => setTitle(t.id, { text: e.target.value })}
                style={{ flex: 1, resize: "none", background: "var(--bg)", color: "var(--input-text)", border: "1px solid var(--bar-empty)", borderRadius: 4, fontFamily: "inherit", fontSize: 14, padding: 6 }} />
              <label className="swatch" onClick={(e) => e.stopPropagation()} title="Box colour" style={{ width: 30, height: 30, flexShrink: 0, marginTop: 2, background: t.color ?? props.accent }}>
                <input type="color" value={t.color ?? props.accent} onChange={(e) => setTitle(t.id, { color: e.target.value })} style={{ opacity: 0 }} />
              </label>
              <button className="link-btn" style={{ fontSize: 20 }} onClick={(e) => { e.stopPropagation(); removeTitle(t.id); }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <button className="link-btn" style={{ fontSize: 15 }} onClick={() => addTitle("block")}>+ Block</button>
            <button className="link-btn" style={{ fontSize: 15 }} onClick={() => addTitle("label")}>+ Label</button>
            <button className="link-btn" style={{ fontSize: 15 }} onClick={() => addTitle("jp")}>+ JP</button>
          </div>
          {sel ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 6 }}>SIZE {sel.size}</div>
              <BarSlider value={Math.round(sel.size / 14)} min={1} max={16} onChange={(v) => setTitle(sel.id, { size: v * 14 })} />
              <div style={{ fontSize: 12, color: "var(--muted-2)", margin: "14px 0 6px" }}>ENTRANCE</div>
              <div style={{ display: "flex", gap: 14 }}>
                {([["left", "←"], ["right", "→"], ["up", "↑"], ["down", "↓"]] as const).map(([v, l]) => (
                  <button key={v} className={(sel.dir ?? "left") === v ? "link-btn accent" : "link-btn"} onClick={() => setTitle(sel.id, { dir: v })}>{l}</button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>

        <Section title="Duration" value={`${Math.round(duration / 30)}s`}>
          <BarSlider value={Math.round(duration / 30)} min={2} max={12} onChange={(v) => setDuration(v * 30)} />
        </Section>
        <Section title="Density" value={props.density}><BarSlider value={props.density} max={20} onChange={(v) => set("density", v)} /></Section>
        <Section title="Proximity" value={props.proximity}><BarSlider value={props.proximity} max={20} onChange={(v) => set("proximity", v)} /></Section>
        <Section title="Stagger" value={props.stagger}><BarSlider value={props.stagger} min={0} max={5} onChange={(v) => set("stagger", v)} /></Section>

        <Section title="Camera">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
            {([["none", "None"], ["pushIn", "Push In"], ["pushOut", "Push Out"], ["pan", "Pan"], ["kenBurns", "Ken Burns"]] as const).map(([v, l]) => (
              <button key={v} className={(props.cameraMove ?? "none") === v ? "link-btn accent" : "link-btn"} onClick={() => set("cameraMove", v)}>{l}</button>
            ))}
          </div>
          {props.cameraMove && props.cameraMove !== "none" ? (
            <>
              {props.cameraMove === "pan" || props.cameraMove === "kenBurns" ? (
                <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                  {([["left", "←"], ["right", "→"], ["up", "↑"], ["down", "↓"]] as const).map(([v, l]) => (
                    <button key={v} className={(props.cameraDir ?? "right") === v ? "link-btn accent" : "link-btn"} onClick={() => set("cameraDir", v)}>{l}</button>
                  ))}
                </div>
              ) : null}
              <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 6 }}>AMOUNT {props.cameraAmount ?? 5}</div>
              <BarSlider value={props.cameraAmount ?? 5} min={1} max={10} onChange={(v) => set("cameraAmount", v)} />
            </>
          ) : null}
          <div style={{ ...S.status, marginTop: 8 }}>A virtual camera over the whole scene. Scrub the preview to see the move.</div>
        </Section>

        <Section title="Title Motion">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
            {([["wipe", "Wipe"], ["perLetter", "Per-Letter"], ["rise", "Rise"], ["fade", "Fade"]] as const).map(([v, l]) => (
              <button key={v} className={(props.titleAnim ?? "wipe") === v ? "link-btn accent" : "link-btn"} onClick={() => set("titleAnim", v)}>{l}</button>
            ))}
          </div>
          <button className={props.underline ? "link-btn accent" : "link-btn"} onClick={() => set("underline", !props.underline)}>Underline sweep</button>
          <div style={{ ...S.status, marginTop: 8 }}>How titles enter. Per-title entrance direction is under each title above (Wipe / Rise).</div>
        </Section>

        <Section title="Intro Effect">
          <div style={{ display: "flex", gap: 18 }}>
            <button className={(props.intro ?? "none") === "none" ? "link-btn accent" : "link-btn"} onClick={() => set("intro", "none")}>Scatter</button>
            <button className={props.intro === "flood" ? "link-btn accent" : "link-btn"} onClick={() => set("intro", "flood")}>Flood</button>
          </div>
          <div style={{ ...S.status, marginTop: 8 }}>Flood = a full-screen colour grid fills in, behind the title. Scrub to the start to see it.</div>
        </Section>

        {props.intro === "flood" ? (
          <>
            <Section title="Flood Style">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                {(["random", "sweep", "radial", "rows", "columns", "edges"] as const).map((s) => (
                  <button key={s} className={(props.floodStyle ?? "random") === s ? "link-btn accent" : "link-btn"} style={{ textTransform: "capitalize" }} onClick={() => set("floodStyle", s)}>{s}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <button className={(props.floodPersist ?? true) ? "link-btn accent" : "link-btn"} onClick={() => set("floodPersist", !(props.floodPersist ?? true))}>{(props.floodPersist ?? true) ? "Stays" : "Clears"}</button>
                <button className={props.floodSolid ? "link-btn accent" : "link-btn"} onClick={() => set("floodSolid", !props.floodSolid)}>{props.floodSolid ? "Solid" : "Mixed"}</button>
              </div>
              <div style={{ ...S.status, marginTop: 8 }}>Fill order: random · diagonal sweep · radial · rows · columns · edges-in. Stays/Clears keeps or recedes; Mixed/Solid = palette or one colour.</div>
            </Section>
            <Section title="Flood Speed" value={props.floodSpeed ?? 5}><BarSlider value={props.floodSpeed ?? 5} min={1} max={10} onChange={(v) => set("floodSpeed", v)} /></Section>
            <Section title="Flood Tile Size" value={props.floodTile ?? 6}><BarSlider value={props.floodTile ?? 6} min={1} max={10} onChange={(v) => set("floodTile", v)} /></Section>
            <Section title="Flood Shapes" value={props.floodShapes ?? 5}><BarSlider value={props.floodShapes ?? 5} min={0} max={10} onChange={(v) => set("floodShapes", v)} /></Section>
            <div style={S.status}>Flood colours come from your <b>Color Set</b> + title colour below.</div>
          </>
        ) : null}

        <div>
          <div style={{ ...S.sectionTitle, cursor: "pointer" }} onClick={() => set("shapes", allShapes ? [] : [...ANIM_TYPES])}>
            Shapes <span style={S.valueNum}>{allShapes ? "deselect all" : "select all"}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
            <button className={(props.scatter ?? true) ? "link-btn accent" : "link-btn"} onClick={() => set("scatter", !(props.scatter ?? true))}>{(props.scatter ?? true) ? "Scatter On" : "Scatter Off"}</button>
            <span style={{ color: "var(--muted-2)", fontSize: 13 }}>{(props.scatter ?? true) ? "random shapes around the title" : "title only — no scattered shapes"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, width: 300, opacity: (props.scatter ?? true) ? 1 : 0.35, pointerEvents: (props.scatter ?? true) ? "auto" : "none" }}>
            {ANIM_TYPES.map((a) => {
              const on = (props.shapes ?? []).includes(a);
              return (
                <button key={a} onClick={() => toggleShape(a)} title={a}
                  style={{ aspectRatio: "1", background: on ? "var(--bar-filled)" : "var(--bar-empty)", border: "none", borderRadius: 6, padding: 9, cursor: "pointer" }}>
                  <Shape anim={a} fg={on ? "#111" : "#888"} />
                </button>
              );
            })}
          </div>
        </div>

        <Section title="Color Set">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {PALETTE.map((c) => (
              <div key={c} onClick={() => toggleColor(c)} title={c}
                style={{ width: 48, height: 48, borderRadius: 4, background: c, cursor: "pointer", border: `2px solid ${c === "#ffffff" ? "#ccc" : "#444"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SelectedDot on={has(c)} dark={c !== "#000000"} />
              </div>
            ))}
            {customs.map((c) => (
              <div key={c} style={{ position: "relative" }}>
                <label className="swatch" style={{ width: 48, height: 48, background: c }}>
                  <input type="color" value={c} onChange={(e) => replaceColor(c, e.target.value)} style={{ opacity: 0 }} />
                </label>
                <button className="link-btn" onClick={() => removeColor(c)} style={{ position: "absolute", top: -10, right: -6, fontSize: 16 }}>×</button>
              </div>
            ))}
            {customs.length < 3 ? <button className="link-btn" style={{ fontSize: 14 }} onClick={addColor}>+ add</button> : null}
          </div>
        </Section>

        <Section title="Title / BG">
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <label className="swatch" style={{ background: props.accent }}><input type="color" value={props.accent} onChange={(e) => set("accent", e.target.value)} style={{ opacity: 0 }} /></label>
            <label className="swatch" style={{ background: props.bgColor }}><input type="color" value={props.bgColor} onChange={(e) => set("bgColor", e.target.value)} style={{ opacity: 0 }} /></label>
            <span style={{ color: "var(--muted-2)", fontSize: 13 }}>title · bg</span>
          </div>
        </Section>

        <Section title="Background Photo">
          <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0] ?? null)} style={{ color: "var(--muted)", fontSize: 13 }} />
          {props.bgImage ? <button className="link-btn" style={{ fontSize: 15, marginTop: 8 }} onClick={() => onImage(null)}>Clear</button> : null}
          {props.bgImage ? (
            <div style={{ marginTop: 12 }}>
              <button className={aiPaint ? "link-btn accent" : "link-btn"} style={{ fontSize: 15 }} onClick={() => setAiPaint(!aiPaint)}>AI Painterly</button>
              <div style={{ ...S.status, marginTop: 6 }}>{aiPaint ? "Render repaints the photo via local ComfyUI (port 8188) first." : "Off — the photo is used as-is (no filter)."}</div>
            </div>
          ) : null}
        </Section>

        <Section title="Audio">
          <div style={{ display: "flex", gap: 18 }}>
            <button className={props.music ? "link-btn accent" : "link-btn"} onClick={() => set("music", props.music ? "" : MUSIC)}>Music</button>
            <button className={props.sfx ? "link-btn accent" : "link-btn"} onClick={() => set("sfx", !props.sfx)}>SFX</button>
            <button className={props.audioReactive ? "link-btn accent" : "link-btn"} onClick={toggleReactive}>Reactive</button>
          </div>
          <div style={{ ...S.status, marginTop: 8 }}>{props.audioReactive ? (props.music ? "Shapes & dots pulse to the music." : "Turn on Music to drive the reactive pulse.") : "Reactive = beat-synced shape & dot pulse."}</div>
        </Section>
        </>
        ) : comp === "Assembly" ? (
        <>
          <Section title="Title">
            <input className="line-input" value={assemblyProps.name} onChange={(e) => setAssemblyProps((p) => ({ ...p, name: e.target.value }))} />
          </Section>
          <Section title="Site">
            <input className="line-input" value={assemblyProps.site} onChange={(e) => setAssemblyProps((p) => ({ ...p, site: e.target.value }))} />
          </Section>
          <Section title="Audio">
            <button className={assemblyProps.music ? "link-btn accent" : "link-btn"} onClick={() => setAssemblyProps((p) => ({ ...p, music: p.music ? "" : MUSIC }))}>Music Bed</button>
            <div style={{ ...S.status, marginTop: 8 }}>SFX hits are always on for the film.</div>
          </Section>
        </>
        ) : comp === "FourCardsGrid" ? (
        <>
          <Section title="Layout">
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
              <label className="swatch" style={{ background: fourCardsProps.bgColor }}><input type="color" value={fourCardsProps.bgColor} onChange={(e) => setFourCardsProps((p) => ({ ...p, bgColor: e.target.value }))} style={{ opacity: 0 }} /></label>
              <label className="swatch" style={{ background: fourCardsProps.cardBorderColor }}><input type="color" value={fourCardsProps.cardBorderColor} onChange={(e) => setFourCardsProps((p) => ({ ...p, cardBorderColor: e.target.value }))} style={{ opacity: 0 }} /></label>
              <label className="swatch" style={{ background: fourCardsProps.cardBgColor }}><input type="color" value={fourCardsProps.cardBgColor} onChange={(e) => setFourCardsProps((p) => ({ ...p, cardBgColor: e.target.value }))} style={{ opacity: 0 }} /></label>
              <label className="swatch" style={{ background: fourCardsProps.textColor }}><input type="color" value={fourCardsProps.textColor} onChange={(e) => setFourCardsProps((p) => ({ ...p, textColor: e.target.value }))} style={{ opacity: 0 }} /></label>
            </div>
            <div style={{ ...S.status, marginBottom: 16 }}>BG · Card Border · Card BG · Text</div>
          </Section>

          <Section title="Card Width" value={`${fourCardsProps.cardWidth}px`}>
            <BarSlider value={Math.round((fourCardsProps.cardWidth - 200) / 25)} min={0} max={12} onChange={(v) => setFourCardsProps((p) => ({ ...p, cardWidth: 200 + v * 25 }))} />
          </Section>

          <Section title="Card Height" value={`${fourCardsProps.cardHeight}px`}>
            <BarSlider value={Math.round((fourCardsProps.cardHeight - 400) / 40)} min={0} max={10} onChange={(v) => setFourCardsProps((p) => ({ ...p, cardHeight: 400 + v * 40 }))} />
          </Section>

          <Section title="Stagger" value={`${fourCardsProps.stagger} frames`}>
            <BarSlider value={fourCardsProps.stagger} min={0} max={20} onChange={(v) => setFourCardsProps((p) => ({ ...p, stagger: v }))} />
          </Section>

          <Section title="Film Grain" value={fourCardsProps.grain}>
            <BarSlider value={Math.round(fourCardsProps.grain * 20)} min={0} max={10} onChange={(v) => setFourCardsProps((p) => ({ ...p, grain: v * 0.05 }))} />
          </Section>

          <Section title="Audio & SFX">
            <button className={fourCardsProps.sfx ? "link-btn accent" : "link-btn"} onClick={() => setFourCardsProps((p) => ({ ...p, sfx: !p.sfx }))}>SFX</button>
            <div style={{ ...S.status, marginTop: 8 }}>Transitions and ding sound effects.</div>
          </Section>

          <Section title="Cards Setup">
            {fourCardsProps.cards.map((card, index) => (
              <div key={index} style={{ border: "1px solid var(--bar-empty)", borderRadius: 6, padding: 12, marginBottom: 16, background: "var(--panel)" }}>
                <div style={{ fontSize: 12, color: "var(--muted-2)", textTransform: "uppercase", marginBottom: 8 }}>Card {index + 1}</div>
                
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 4 }}>Caption Title</div>
                  <input className="line-input" style={{ fontSize: 16 }} value={card.title} onChange={(e) => updateCard(index, { title: e.target.value })} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 4 }}>Video Path (public/)</div>
                  <input className="line-input" style={{ fontSize: 16 }} value={card.videoUrl} onChange={(e) => updateCard(index, { videoUrl: e.target.value })} />
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 4 }}>Video Align X ({card.alignX ?? 50}%)</div>
                  <BarSlider value={Math.round((card.alignX ?? 50) / 10)} min={0} max={10} onChange={(v) => updateCard(index, { alignX: v * 10 })} />
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 4 }}>Video Align Y ({card.alignY ?? 50}%)</div>
                  <BarSlider value={Math.round((card.alignY ?? 50) / 10)} min={0} max={10} onChange={(v) => updateCard(index, { alignY: v * 10 })} />
                </div>
              </div>
            ))}
          </Section>
        </>
        ) : (
        <>
          <Section title="Title"><input className="line-input" value={introProps.title} onChange={(e) => setIntroProps((p) => ({ ...p, title: e.target.value }))} /></Section>
          <Section title="Byline"><input className="line-input" value={introProps.byline} onChange={(e) => setIntroProps((p) => ({ ...p, byline: e.target.value }))} /></Section>
          <Section title="JP Accent"><input className="line-input" value={introProps.jp} onChange={(e) => setIntroProps((p) => ({ ...p, jp: e.target.value }))} /></Section>
          <Section title="Awards">
            <input className="line-input" value={introProps.awards.join(", ")} onChange={(e) => setIntroProps((p) => ({ ...p, awards: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) }))} />
            <div style={{ ...S.status, marginTop: 6 }}>Comma-separated · up to 6 shown</div>
          </Section>
          <Section title="Runtime"><input className="line-input" value={introProps.runtime} onChange={(e) => setIntroProps((p) => ({ ...p, runtime: e.target.value }))} /></Section>
          <Section title="Hero Photos">
            <input className="line-input" style={{ fontSize: 15 }} value={introProps.bgImage} onChange={(e) => setIntroProps((p) => ({ ...p, bgImage: e.target.value }))} />
            <div style={{ ...S.status, marginTop: 4 }}>1 · entrance shot (e.g. images/alley1.jpg)</div>
            <input className="line-input" style={{ fontSize: 15, marginTop: 10 }} value={introProps.bgImage2} onChange={(e) => setIntroProps((p) => ({ ...p, bgImage2: e.target.value }))} />
            <div style={{ ...S.status, marginTop: 4 }}>2 · deeper shot — camera dollies into it (blank = single photo)</div>
            <div style={{ marginTop: 12 }}>
              <button className={aiPaint ? "link-btn accent" : "link-btn"} style={{ fontSize: 15 }} onClick={() => setAiPaint(!aiPaint)}>AI Painterly</button>
              <div style={{ ...S.status, marginTop: 6 }}>{aiPaint ? "Render repaints the hero via ComfyUI (8188) first." : "Off — built-in SVG watercolor filter."}</div>
            </div>
          </Section>
          <Section title="Audio">
            <div style={{ display: "flex", gap: 18 }}>
              <button className={introProps.music ? "link-btn accent" : "link-btn"} onClick={() => setIntroProps((p) => ({ ...p, music: p.music ? "" : MUSIC }))}>Music</button>
              <button className={introProps.sfx ? "link-btn accent" : "link-btn"} onClick={() => setIntroProps((p) => ({ ...p, sfx: !p.sfx }))}>SFX</button>
            </div>
          </Section>
        </>
        )}

        {videoUrl ? (
          <Section title="Last Render">
            <video src={videoUrl} controls style={{ width: "100%", borderRadius: 4 }} />
            <a href={videoUrl} download className="link-btn accent" style={{ fontSize: 15, display: "inline-block", marginTop: 6 }}>Download MP4</a>
          </Section>
        ) : null}
      </aside>

      {/* Cloud Library Modal */}
      {showCloudModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--bar-empty)",
            borderRadius: 12,
            padding: 30,
            width: 500,
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--fg-strong)" }}>☁️ Cloud Scene Library</h2>
              <button className="link-btn" style={{ fontSize: 24, padding: "0 8px" }} onClick={() => setShowCloudModal(false)}>×</button>
            </div>

            {/* Save scene block */}
            <div style={{ marginBottom: 24, borderBottom: "1px solid var(--bar-empty)", paddingBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 8, textTransform: "uppercase" }}>Save Current Scene to Cloud</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input 
                  type="text" 
                  className="line-input" 
                  placeholder="Scene name..." 
                  value={cloudSaveName} 
                  onChange={(e) => setCloudSaveName(e.target.value)} 
                  style={{ flex: 1, background: "var(--panel)", color: "var(--fg)", border: "1px solid var(--bar-empty)", borderRadius: 6, padding: "8px 12px" }}
                />
                <button 
                  className="link-btn accent" 
                  onClick={() => saveSceneToCloud(cloudSaveName)}
                  disabled={cloudLoading || !cloudSaveName.trim()}
                >
                  Save
                </button>
              </div>
            </div>

            {/* List scenes block */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 200, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 12, textTransform: "uppercase" }}>Your Cloud Scenes (DynamoDB)</div>
              {cloudLoading && <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading scenes...</div>}
              {cloudError && <div style={{ color: "#ff4d4d", fontSize: 14 }}>{cloudError}</div>}
              {!cloudLoading && cloudScenes.length === 0 && (
                <div style={{ color: "var(--muted-2)", fontStyle: "italic", textAlign: "center", marginTop: 40, fontSize: 14 }}>
                  No scenes saved in the cloud yet.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                {cloudScenes.map((item) => (
                  <div key={item.id} style={{
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "10px 14px", 
                    borderRadius: 6, 
                    background: "var(--panel)", 
                    border: "1px solid var(--bar-empty)"
                  }}>
                    <div style={{ cursor: "pointer", flex: 1 }} onClick={() => loadSceneFromCloud(item)}>
                      <div style={{ fontWeight: 600, color: "var(--fg)", fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 2 }}>
                        Updated {new Date(item.updatedAt).toLocaleDateString()} at {new Date(item.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button 
                      className="link-btn" 
                      style={{ fontSize: 13, color: "#ff4d4d" }} 
                      onClick={() => deleteSceneFromCloud(item.id)}
                      disabled={cloudLoading}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; value?: number | string; children: React.ReactNode }> = ({ title, value, children }) => (
  <div>
    <div style={S.sectionTitle}>{title}{value !== undefined ? <span style={S.valueNum}> {value}</span> : null}</div>
    {children}
  </div>
);

const SelectedDot: React.FC<{ on: boolean; dark: boolean }> = ({ on, dark }) => (
  <div style={{
    width: 16, height: 16, borderRadius: "50%", background: dark ? "#1a1a1a" : "#eee",
    transform: on ? "scale(1)" : "scale(0)", opacity: on ? 1 : 0,
    transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease-out",
  }} />
);

const BarSlider: React.FC<{ value: number; max: number; min?: number; onChange: (v: number) => void }> = ({ value, max, min = 1, onChange }) => (
  <div style={{ display: "flex", gap: 3, cursor: "pointer", width: 300 }}>
    {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((v) => (
      <div key={v} className="bar-step" onClick={() => onChange(v)} style={{ flex: 1, height: 18, borderRadius: 2, background: v <= value ? "var(--bar-filled)" : "var(--bar-empty)" }} />
    ))}
  </div>
);

const S: Record<string, React.CSSProperties> = {
  app: { display: "grid", gridTemplateColumns: "1fr 380px", gridTemplateRows: "auto 1fr", columnGap: 40, rowGap: 32, padding: 40, height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg)" },
  header: { gridColumn: "1 / 3", display: "flex", alignItems: "center", justifyContent: "space-between", height: 40 },
  row: { display: "flex", alignItems: "center", gap: 22 },
  brand: { fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "0.06em" },
  compSelect: { background: "var(--panel)", color: "var(--fg)", border: "1px solid var(--bar-empty)", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  canvasCell: { gridColumn: 1, gridRow: 2, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, overflowY: "auto" },
  timeline: { marginTop: 18, flexShrink: 0 },
  sidebar: { gridColumn: 2, gridRow: 2, overflowY: "auto", display: "flex", flexDirection: "column", gap: 26 },
  sectionTitle: { fontSize: 22, fontWeight: 600, color: "var(--fg-strong)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 },
  valueNum: { color: "var(--muted-2)", opacity: 0.6 },
  status: { marginTop: 14, fontSize: 13, color: "var(--muted)" },
};
