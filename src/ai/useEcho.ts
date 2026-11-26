import { useSyncExternalStore } from "react";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { CANDIDATE_MODELS, pickBuild } from "./models";
import { isModelExpired, removeDownloadedModels } from "./modelCache";

/**
 * App-wide status of Echo's on-device model, shared by every screen.
 * The engine module (and WebLLM itself, ~6 MB) is only imported once loading starts.
 */

export type AiPhase = "checking" | "unsupported" | "idle" | "loading" | "ready" | "error";

export interface AiStatus {
  phase: AiPhase;
  /** 0–1 while loading. */
  progress: number;
  /** True when replies come from the script instead of the model. */
  demo: boolean;
  cached: boolean;
  reason?: string;
}

const DEMO_KEY = "echo.demoReplies";
const DEFAULT_MODEL = CANDIDATE_MODELS[0]; // Llama 3.2 1B

let status: AiStatus = {
  phase: "checking",
  progress: 0,
  demo: readDemoFlag(),
  cached: false,
};
const listeners = new Set<() => void>();
let modelId: string | null = null;

function readDemoFlag(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

function set(patch: Partial<AiStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const engine = () => import("./engine");

let checked = false;
function checkOnce() {
  if (checked) return;
  checked = true;
  import("./device")
    .then((d) => d.checkDeviceSupport())
    .then(async (support) => {
      if (!support.webgpu) {
        set({ phase: "unsupported", demo: true, reason: support.reason });
        return;
      }
      // Downloaded more than 7 days ago: remove it so it doesn't keep taking up space.
      if (isModelExpired()) await removeDownloadedModels().catch(() => {});
      // Only devices that can run the model download WebLLM.
      const e = await engine();
      modelId = pickBuild(DEFAULT_MODEL, support.shaderF16).id;
      const cached = await e.isModelCached(modelId).catch(() => false);
      set({ phase: "idle", cached });
      // If the model is already downloaded and the person hasn't chosen demo replies, load it quietly.
      if (cached && !status.demo) void loadEcho();
    })
    .catch(() => set({ phase: "unsupported", demo: true, reason: "On-device AI couldn't start in this browser." }));
}

export function useEchoStatus(): AiStatus {
  checkOnce();
  return useSyncExternalStore(subscribe, () => status);
}

export async function loadEcho(): Promise<void> {
  if (!modelId || status.phase === "loading" || status.phase === "ready") return;
  set({ phase: "loading", progress: 0, demo: false });
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    // ignore
  }
  try {
    const e = await engine();
    await e.loadModel(modelId, (r) => set({ progress: r.progress }));
    set({ phase: "ready", progress: 1, cached: true });
  } catch (err) {
    set({ phase: "error", demo: true, reason: err instanceof Error ? err.message : String(err) });
  }
}

/** Removes the model from this device right away (Profile → Echo on this device). */
export async function removeEchoFromDevice(): Promise<void> {
  try {
    const e = await engine();
    await e.unloadModel();
  } catch {
    // Nothing loaded.
  }
  await removeDownloadedModels();
  set({ phase: status.phase === "unsupported" ? "unsupported" : "idle", cached: false, progress: 0 });
}

export function chooseDemoReplies(): void {
  try {
    localStorage.setItem(DEMO_KEY, "1");
  } catch {
    // ignore
  }
  set({ demo: true });
}

/** True when the next reply should come from the model rather than the script. */
export function canUseModel(): boolean {
  return status.phase === "ready" && !status.demo;
}

/**
 * One model is shared by every caller (Echo turns, Help me reply, the simulated match),
 * so requests run one at a time.
 */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

/**
 * Generates a short reply with the on-device model. Returns null when the model isn't
 * available, so callers fall back to scripted lines.
 */
export async function generate(
  messages: ChatCompletionMessageParam[],
  onDelta?: (textSoFar: string) => void,
  maxTokens = 80,
  temperature = 0.7,
): Promise<string | null> {
  if (!canUseModel()) return null;
  return serial(async () => {
    try {
      const e = await engine();
      const { text } = await e.streamReply(messages, onDelta ?? (() => {}), { maxTokens, temperature });
      return tidy(text);
    } catch {
      return null;
    }
  });
}

/** Like generate, but the reply is a JSON object matching `schema`. Null when unavailable or unparseable. */
export async function generateJson<T>(
  messages: ChatCompletionMessageParam[],
  schema: object,
  maxTokens = 200,
  temperature = 0.8,
): Promise<T | null> {
  if (!canUseModel()) return null;
  return serial(async () => {
    try {
      const e = await engine();
      const raw = await e.completeJson(messages, schema, { maxTokens, temperature });
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });
}

/** Small models sometimes add a speaker prefix or wrap the reply in quotes. */
export function tidy(text: string): string {
  return text
    .trim()
    .replace(/^(echo|assistant|[A-Z][a-z]+'s echo)\s*:\s*/i, "")
    .replace(/^"(.*)"$/s, "$1")
    .trim();
}

export const ECHO_MODEL_NAME = DEFAULT_MODEL.name;
export const ECHO_DOWNLOAD_MB = 670;
