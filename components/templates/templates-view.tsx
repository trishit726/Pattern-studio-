"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Download,
  Loader2,
  Save,
  Trash2,
  Layers,
  Film,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { SERVER } from "@/components/editor/constants"
import {
  TEMPLATES,
  getTemplate,
  ASPECT_DIMS,
  type TemplateDef,
} from "./registry"
import { SchemaControls } from "./schema-controls"

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center bg-black">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
)

interface SavedScene {
  id: string
  template: string
  name: string
  props: Record<string, any>
  duration: number
  updatedAt: number
}

/** Anonymous, device-scoped id used as the DynamoDB partition key. No auth. */
function useAnonUserId() {
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    let id = localStorage.getItem("ps_uid")
    if (!id) {
      id = `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      localStorage.setItem("ps_uid", id)
    }
    setUid(id)
  }, [])
  return uid
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function TemplatesView() {
  const userId = useAnonUserId()

  const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0].id)
  const [props, setProps] = useState<Record<string, any>>(() => clone(TEMPLATES[0].defaults))
  const [name, setName] = useState("")
  // The DynamoDB item id we're editing. Null until first save / load, so a
  // fresh template saves as a new row and a loaded one re-saves in place.
  const [sceneId, setSceneId] = useState<string | null>(null)

  const [scenes, setScenes] = useState<SavedScene[]>([])
  const [busy, setBusy] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const tpl = useMemo<TemplateDef>(
    () => getTemplate(selectedId) ?? TEMPLATES[0],
    [selectedId],
  )
  const dims = ASPECT_DIMS[tpl.aspect]

  const pickTemplate = useCallback((id: string) => {
    const t = getTemplate(id)
    if (!t) return
    setSelectedId(id)
    setProps(clone(t.defaults))
    setSceneId(null)
    setName("")
    setVideoUrl(null)
  }, [])

  const setProp = useCallback((key: string, value: unknown) => {
    setProps((p) => ({ ...p, [key]: value }))
  }, [])

  // ── Cloud library (DynamoDB) ──────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/list?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error(await res.text())
      const all = (await res.json()) as SavedScene[]
      // Only show scenes whose template the studio knows how to render.
      setScenes(all.filter((s) => getTemplate(s.template)))
    } catch (e) {
      console.error("[templates] list error", e)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(async () => {
    if (!userId) return
    const cleanName = name.trim() || `${tpl.label} ${new Date().toLocaleDateString()}`
    const id = sceneId ?? `tpl-${Date.now()}`
    setBusy(true)
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          userId,
          template: selectedId,
          name: cleanName,
          props,
          duration: tpl.durationInFrames,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSceneId(id)
      setName(cleanName)
      toast.success(`Saved "${cleanName}"`)
      refresh()
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }, [userId, name, sceneId, selectedId, props, tpl, refresh])

  const loadScene = useCallback((s: SavedScene) => {
    if (!getTemplate(s.template)) return
    setSelectedId(s.template)
    setProps(clone(s.props))
    setSceneId(s.id)
    setName(s.name)
    setVideoUrl(null)
    toast.success(`Loaded "${s.name}"`)
  }, [])

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return
      try {
        const res = await fetch(
          `/api/delete?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        )
        if (!res.ok) throw new Error(await res.text())
        if (sceneId === id) setSceneId(null)
        toast.success("Deleted")
        refresh()
      } catch (e: any) {
        toast.error(`Delete failed: ${e.message}`)
      }
    },
    [userId, sceneId, refresh],
  )

  // ── Render (via the local Remotion render server) ─────────────────────────
  const render = useCallback(
    async (alpha: boolean) => {
      setRendering(true)
      setVideoUrl(null)
      try {
        const res = await fetch(`${SERVER}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            composition: selectedId,
            props,
            duration: tpl.durationInFrames,
            // "16:9" tells the server to return the native render untouched.
            ratio: "16:9",
            formats: [alpha ? "webm" : "mp4"],
            alpha,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        const out =
          (alpha && json.outputs?.find((o: any) => o.format === "webm")?.url) ||
          json.url
        setVideoUrl(`${SERVER}${out}`)
        toast.success(alpha ? "Transparent WebM ready" : "Render complete")
      } catch (e: any) {
        toast.error(`Render failed — is the render server up? (npm run server)`)
        console.error("[templates] render error", e)
      } finally {
        setRendering(false)
      }
    },
    [selectedId, props, tpl],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, TemplateDef[]>()
    for (const t of TEMPLATES) {
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category)!.push(t)
    }
    return [...map.entries()]
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Editor
        </Link>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Layers className="size-4 text-primary" />
          Templates
        </div>
        <span className="text-xs text-muted-foreground">{tpl.label} · {tpl.aspect}</span>

        <div className="ml-auto flex items-center gap-2">
          {tpl.supportsAlpha ? (
            <Button
              variant="outline"
              size="sm"
              disabled={rendering}
              onClick={() => render(true)}
              className="gap-1.5"
            >
              <Download className="size-4" />
              Transparent
            </Button>
          ) : null}
          <Button disabled={rendering} onClick={() => render(false)} className="gap-1.5">
            {rendering ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}
            {rendering ? "Rendering…" : "Render MP4"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Gallery */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-4 p-3">
              {grouped.map(([cat, items]) => (
                <div key={cat} className="flex flex-col gap-1.5">
                  <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </span>
                  {items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t.id)}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors",
                        selectedId === t.id
                          ? "border-primary/40 bg-primary/10"
                          : "border-border bg-card/40 hover:border-muted-foreground/40 hover:bg-card/60",
                      )}
                    >
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">{t.blurb}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Preview */}
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
          <div
            className="w-full max-w-3xl overflow-hidden rounded-lg border border-border shadow-2xl"
            style={{ aspectRatio: `${dims.width} / ${dims.height}`, maxHeight: "70vh" }}
          >
            <Player
              key={`${selectedId}-${dims.width}x${dims.height}`}
              acknowledgeRemotionLicense
              component={tpl.component as React.FC<Record<string, unknown>>}
              inputProps={props as Record<string, unknown>}
              durationInFrames={tpl.durationInFrames}
              fps={30}
              compositionWidth={dims.width}
              compositionHeight={dims.height}
              style={{ width: "100%", height: "100%" }}
              initialFrame={Math.min(45, tpl.durationInFrames - 1)}
              controls
              loop
            />
          </div>

          {videoUrl ? (
            <a
              href={videoUrl}
              download
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="size-4" />
              Download last render
            </a>
          ) : null}
        </main>

        {/* Controls + library */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-border">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-5 p-4">
              <SchemaControls values={props} fields={tpl.fields} onChange={setProp} />

              <Separator />

              {/* Save */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Save to cloud
                </span>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    placeholder={`${tpl.label}…`}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" disabled={busy || !userId} onClick={save} className="gap-1.5">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save
                  </Button>
                </div>
              </div>

              {/* Library */}
              {scenes.length ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Your templates ({scenes.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {scenes.map((s) => (
                      <div
                        key={s.id}
                        className="group flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => loadScene(s)}
                          className="flex min-w-0 flex-1 flex-col text-left"
                        >
                          <span className="truncate text-sm font-medium">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {getTemplate(s.template)?.label ?? s.template}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  )
}
