import { useSyncExternalStore } from "react";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { CANDIDATE_MODELS, pickBuild } from "./models";

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
  engine()
    .then(async (e) => {
      const support = await e.checkDeviceSupport();
      if (!support.webgpu) {
        set({ phase: "unsupported", demo: true, reason: support.reason });
        return;
      }
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
  try {
    const e = await engine();
    const { text } = await e.streamReply(messages, onDelta ?? (() => {}), { maxTokens, temperature });
    return tidy(text);
  } catch {
    return null;
  }
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
