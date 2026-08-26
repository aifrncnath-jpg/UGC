"use client";

import React from "react";
import { ConnectBar, ConnectSplash } from "./ConnectBar";
import { GenerateForm } from "./GenerateForm";
import { ResultView } from "./ResultView";
import { GalleryView } from "./GalleryView";
import { InspectorView } from "./InspectorView";
import { Note, Panel, Spinner } from "./ui";
import {
  EMPTY_FORM,
  type AuthStatus,
  type FormState,
  type GalleryItemView,
  type ToolsInfo,
} from "@/lib/client-types";

type Tab = "generate" | "gallery" | "inspector";

export function Studio() {
  const [auth, setAuth] = React.useState<AuthStatus | null>(null);
  const [tools, setTools] = React.useState<ToolsInfo | null>(null);
  const [toolsError, setToolsError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>("generate");

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<GalleryItemView | null>(null);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [gallery, setGallery] = React.useState<GalleryItemView[]>([]);
  const [banner, setBanner] = React.useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  // Surface the OAuth round-trip result, then clean the query string so a
  // refresh doesn't replay the message.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const connected = params.get("connected");
    if (err) setBanner({ tone: "error", text: err });
    else if (connected)
      setBanner({ tone: "ok", text: "Connected to Higgsfield. Ready to generate." });
    if (err || connected) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadTools = React.useCallback(async (refresh = false) => {
    setToolsError(null);
    try {
      const res = await fetch(`/api/tools${refresh ? "?refresh=1" : ""}`);
      const json = await res.json();
      if (!json.ok) {
        setTools(null);
        if (!json.notConnected) setToolsError(json.error ?? "Failed to load tools.");
        return;
      }
      const info = json as ToolsInfo;
      setTools(info);
      // Land on Nano Banana Pro the first time we learn the model list. From
      // there GenerateForm keeps the ratio and resolution legal for whatever
      // model is selected.
      setForm((f) => (f.model ? f : { ...f, model: info.defaultModel }));
    } catch (err) {
      setToolsError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const loadGallery = React.useCallback(async () => {
    try {
      const res = await fetch("/api/gallery");
      const json = await res.json();
      if (json.ok) setGallery(json.items as GalleryItemView[]);
    } catch {
      /* the gallery is a nicety; never block the studio on it */
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const status = (await res.json()) as AuthStatus;
        setAuth(status);
        if (status.connected) {
          await Promise.all([loadTools(), loadGallery()]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadTools, loadGallery]);

  // Keep polling anything the server handed back as still-pending.
  React.useEffect(() => {
    const pendingIds = [result, ...gallery]
      .filter((i): i is GalleryItemView => Boolean(i) && i!.status === "pending")
      .map((i) => i.id);
    if (!pendingIds.length) return;

    const timer = setInterval(async () => {
      for (const id of [...new Set(pendingIds)]) {
        try {
          const res = await fetch(`/api/job/${id}`);
          const json = await res.json();
          if (!json.ok || json.stillPending) continue;
          const updated = json.item as GalleryItemView;
          setResult((r) => (r?.id === updated.id ? { ...r, ...updated } : r));
          setGallery((g) =>
            g.map((it) => (it.id === updated.id ? { ...it, ...updated } : it))
          );
        } catch {
          /* transient network blip; try again next tick */
        }
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [result, gallery]);

  async function generate() {
    setBusy(true);
    setGenError(null);
    setResult(null);
    setBanner(null);
    setTab("generate");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          presetId: form.presetId || undefined,
          extraPrompt: form.extraPrompt || undefined,
          negativePrompt: form.negativePrompt || undefined,
          model: form.model || undefined,
          aspectRatio: form.aspectRatio || undefined,
          resolution: form.resolution || undefined,
          quality: form.quality || undefined,
          seed: form.seed || undefined,
          batch: form.batch || undefined,
          referenceImages: form.referenceImages,
          advanced: form.advanced,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.notConnected) {
          setAuth((a) => (a ? { ...a, connected: false } : a));
        }
        setGenError(json.error ?? "Generation failed.");
        return;
      }
      setResult(json.item as GalleryItemView);
      await loadGallery();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth((a) => (a ? { ...a, connected: false } : a));
    setTools(null);
  }

  /**
   * Load a past generation back into the form. The prompt already has the preset
   * baked in, so the preset is cleared to avoid appending the style twice. The
   * ratio and resolution are read back out of the stored MCP arguments using the
   * same field mapping we used to send them.
   */
  function reuse(item: GalleryItemView) {
    const readParam = (fieldName: string | null | undefined): string => {
      if (!fieldName) return "";
      const v = item.params?.[fieldName];
      return typeof v === "string" ? v : "";
    };

    setForm((f) => ({
      ...f,
      subject: item.prompt,
      presetId: "",
      extraPrompt: "",
      negativePrompt: readParam(tools?.mapping.negativePrompt) || f.negativePrompt,
      model: item.model || f.model,
      aspectRatio: readParam(tools?.mapping.aspectRatio) || f.aspectRatio,
      resolution: readParam(tools?.mapping.resolution),
      quality: readParam(tools?.mapping.quality),
    }));
    setTab("generate");
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "generate", label: "Generate" },
    { id: "gallery", label: "Gallery", badge: gallery.length },
    { id: "inspector", label: "Inspector" },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-50">
            <span>🍌</span> Higgsfield Studio
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your own image generation front end, wired straight to the Higgsfield
            MCP server.
          </p>
        </div>
      </header>

      {banner && (
        <Note tone={banner.tone === "ok" ? "ok" : "error"}>{banner.text}</Note>
      )}

      <ConnectBar
        auth={auth}
        tools={tools}
        onDisconnect={disconnect}
        busy={busy}
      />

      {loading ? (
        <Panel>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <Spinner /> Checking your Higgsfield session…
          </div>
        </Panel>
      ) : !auth?.connected ? (
        <ConnectSplash auth={auth} />
      ) : toolsError ? (
        <Panel title="Could not read the MCP tool list">
          <Note tone="error">{toolsError}</Note>
        </Panel>
      ) : !tools ? (
        <Panel>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <Spinner /> Reading the tool schema from Higgsfield…
          </div>
        </Panel>
      ) : (
        <>
          <nav className="flex gap-1 rounded-xl border border-line bg-panel/80 p-1 backdrop-blur">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.label}
                {t.badge ? (
                  <span className="ml-1.5 text-[11px] text-zinc-600">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {tab === "generate" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
              <GenerateForm
                tools={tools}
                form={form}
                setForm={setForm}
                onGenerate={generate}
                busy={busy}
              />
              <div className="lg:sticky lg:top-6 lg:self-start">
                <ResultView
                  item={result}
                  busy={busy}
                  error={genError}
                  aspectRatio={form.aspectRatio}
                />
              </div>
            </div>
          )}

          {tab === "gallery" && (
            <GalleryView
              items={gallery}
              onReuse={reuse}
              onDelete={async (id) => {
                await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
                  method: "DELETE",
                });
                setGallery((g) => g.filter((i) => i.id !== id));
              }}
              onClear={async () => {
                await fetch("/api/gallery", { method: "DELETE" });
                setGallery([]);
              }}
            />
          )}

          {tab === "inspector" && (
            <InspectorView
              tools={tools}
              onRefresh={() => void loadTools(true)}
              busy={busy}
            />
          )}
        </>
      )}

      <footer className="pt-4 text-center text-[11px] leading-relaxed text-zinc-600">
        Generations through MCP always deduct Higgsfield credits at standard
        rates, even on plans with Unlimited web access.
      </footer>
    </main>
  );
}
