import { useEffect, useRef, useState } from "react";
import type { ChatCompletionMessageParam, InitProgressReport } from "@mlc-ai/web-llm";
import { CANDIDATE_MODELS, pickBuild, type CandidateModel } from "../ai/models";
import {
  checkDeviceSupport,
  currentModelId,
  isModelCached,
  loadModel,
  streamReply,
  type DeviceSupport,
  type ReplyStats,
} from "../ai/engine";
import { SCENARIOS } from "../ai/scenarios";

interface Turn {
  role: "user" | "assistant";
  content: string;
  stats?: ReplyStats;
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading"; report: InitProgressReport }
  | { kind: "ready"; modelId: string; loadS: number }
  | { kind: "error"; message: string };

export default function ModelLab() {
  const [support, setSupport] = useState<DeviceSupport | null>(null);
  const [modelKey, setModelKey] = useState(CANDIDATE_MODELS[0].key);
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState(SCENARIOS[0].opener);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const model = CANDIDATE_MODELS.find((m) => m.key === modelKey)!;
  const scenario = SCENARIOS.find((s) => s.key === scenarioKey)!;
  const build = support ? pickBuild(model, support.shaderF16) : model.f16;

  useEffect(() => {
    checkDeviceSupport().then(async (s) => {
      setSupport(s);
      if (!s.webgpu) return;
      const entries = await Promise.all(
        CANDIDATE_MODELS.map(async (m) => {
          const id = pickBuild(m, s.shaderF16).id;
          return [m.key, await isModelCached(id).catch(() => false)] as const;
        }),
      );
      setCached(Object.fromEntries(entries));
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const isReady = load.kind === "ready" && load.modelId === build.id;

  async function handleLoad() {
    const started = performance.now();
    setLoad({ kind: "loading", report: { progress: 0, timeElapsed: 0, text: "Starting…" } });
    try {
      await loadModel(build.id, (report) => setLoad({ kind: "loading", report }));
      setLoad({ kind: "ready", modelId: build.id, loadS: (performance.now() - started) / 1000 });
      setCached((c) => ({ ...c, [model.key]: true }));
    } catch (err) {
      setLoad({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  function chooseScenario(key: string) {
    const next = SCENARIOS.find((s) => s.key === key)!;
    setScenarioKey(key);
    setTurns([]);
    setDraft(next.opener);
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy || !isReady) return;
    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: scenario.system },
      ...history.map((t) => ({ role: t.role, content: t.content })),
    ];

    try {
      const { text: reply, stats } = await streamReply(messages, (soFar) =>
        setTurns([...history, { role: "assistant", content: soFar }]),
      );
      setTurns([...history, { role: "assistant", content: reply.trim(), stats }]);
    } catch (err) {
      setTurns([
        ...history,
        { role: "assistant", content: `Something went wrong: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-[13px] font-medium text-echo">Milestone 0 · Internal tool</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI model lab</h1>
        <p className="mt-1 text-muted">
          Compare the small models Echo could run right in your browser. Everything runs on this device.
        </p>
      </header>

      <DeviceCard support={support} />

      <div className="card p-5">
        <h2 className="font-semibold">1. Pick a model</h2>
        <div className="mt-3 grid gap-3">
          {CANDIDATE_MODELS.map((m) => (
            <ModelOption
              key={m.key}
              model={m}
              shaderF16={support?.shaderF16 ?? true}
              selected={m.key === modelKey}
              cached={cached[m.key]}
              loaded={currentModelId() === pickBuild(m, support?.shaderF16 ?? true).id}
              disabled={load.kind === "loading" || busy}
              onSelect={() => setModelKey(m.key)}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-echo" onClick={handleLoad} disabled={!support?.webgpu || load.kind === "loading" || isReady}>
            {isReady ? "Loaded" : cached[model.key] ? "Load model" : "Download and load"}
          </button>
          {!cached[model.key] && support?.webgpu && (
            <span className="text-sm text-muted">One-time download. After that it loads from your browser's cache.</span>
          )}
        </div>

        {load.kind === "loading" && <Progress report={load.report} />}
        {load.kind === "ready" && isReady && (
          <p className="mt-3 text-sm text-ok">Ready in {load.loadS.toFixed(1)}s.</p>
        )}
        {load.kind === "error" && (
          <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent-strong">
            Couldn't load the model: {load.message}
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">2. Pick a scenario</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => chooseScenario(s.key)}
              disabled={busy}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                s.key === scenarioKey ? "border-echo bg-echo-soft text-echo-strong" : "border-line text-muted hover:text-ink"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{scenario.description}</p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Show system prompt</summary>
          <p className="mt-2 rounded-xl bg-canvas p-3 leading-relaxed text-ink/80">{scenario.system}</p>
        </details>
      </div>

      <div className="card flex flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">3. Chat</h2>
          {turns.length > 0 && (
            <button className="text-sm font-medium text-muted hover:text-ink" onClick={() => chooseScenario(scenarioKey)} disabled={busy}>
              Start over
            </button>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {turns.length === 0 && (
            <p className="rounded-xl bg-canvas p-4 text-sm text-muted">
              {isReady ? "Send the suggested message, or write your own." : "Load a model first."}
            </p>
          )}
          {turns.map((t, i) => (
            <Message key={i} turn={t} streaming={busy && i === turns.length - 1} />
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            className="field min-h-11 flex-1 resize-none"
            rows={scenario.key === "match-reason" ? 3 : 1}
            value={draft}
            placeholder="Write a message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={!isReady}
          />
          <button className="btn-primary" disabled={!isReady || busy || !draft.trim()}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

function DeviceCard({ support }: { support: DeviceSupport | null }) {
  if (!support) return <div className="card p-5 text-sm text-muted">Checking this device…</div>;
  if (!support.webgpu) {
    return (
      <div className="card border-warn/30 bg-warn-soft p-5 text-sm">
        <p className="font-semibold text-warn">On-device AI isn't available here</p>
        <p className="mt-1 text-ink/80">
          {support.reason} In the full app, Echo will switch to demo replies on devices like this. For the lab, try a recent
          Chrome or Edge on a laptop.
        </p>
      </div>
    );
  }
  return (
    <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-5 text-sm">
      <span className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-ok" /> WebGPU available
      </span>
      <span className="text-muted">
        {support.shaderF16 ? "Using the faster f16 builds" : "No shader-f16 support, using f32 builds"}
      </span>
    </div>
  );
}

function ModelOption(props: {
  model: CandidateModel;
  shaderF16: boolean;
  selected: boolean;
  cached?: boolean;
  loaded: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const build = pickBuild(props.model, props.shaderF16);
  return (
    <button
      onClick={props.onSelect}
      disabled={props.disabled}
      className={`rounded-2xl border p-4 text-left transition-colors ${
        props.selected ? "border-echo bg-echo-soft/60" : "border-line hover:border-ink/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{props.model.name}</span>
        {props.loaded ? (
          <Badge tone="ok">Loaded</Badge>
        ) : props.cached ? (
          <Badge tone="muted">Downloaded</Badge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">{props.model.note}</p>
      <p className="mt-2 text-[12px] text-muted">~{(build.vramMB / 1000).toFixed(1)} GB GPU memory</p>
    </button>
  );
}

function Badge({ tone, children }: { tone: "ok" | "muted"; children: string }) {
  const cls = tone === "ok" ? "bg-ok-soft text-ok" : "bg-canvas text-muted";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function Progress({ report }: { report: InitProgressReport }) {
  const pct = Math.round(report.progress * 100);
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-echo transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[12px] break-words text-muted">
        {pct}% · {report.timeElapsed.toFixed(0)}s · {report.text}
      </p>
    </div>
  );
}

function Message({ turn, streaming }: { turn: Turn; streaming: boolean }) {
  const mine = turn.role === "user";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <span className={`mb-1 text-[12px] font-medium ${mine ? "text-muted" : "text-echo"}`}>{mine ? "You" : "Echo · AI"}</span>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
          mine ? "rounded-br-md bg-accent text-white" : "rounded-bl-md border border-echo/20 bg-echo-soft text-ink"
        }`}
      >
        {turn.content || (streaming ? <span className="text-muted">Thinking…</span> : "")}
      </div>
      {turn.stats && (
        <span className="mt-1 text-[11px] text-muted">
          first word {turn.stats.ttftS.toFixed(1)}s · {turn.stats.tokensPerS.toFixed(1)} tokens/s · {turn.stats.tokens} tokens ·{" "}
          {turn.stats.totalS.toFixed(1)}s total
        </span>
      )}
    </div>
  );
}
