import {
  CreateWebWorkerMLCEngine,
  hasModelInCache,
  type ChatCompletionMessageParam,
  type InitProgressReport,
  type WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";

export { checkDeviceSupport, type DeviceSupport } from "./device";
import { markModelSaved } from "./modelCache";

export const isModelCached = (modelId: string) => hasModelInCache(modelId);

let engine: WebWorkerMLCEngine | null = null;
let loadedModelId: string | null = null;

/** Loads (or switches to) a model. Safe to call repeatedly. */
export async function loadModel(
  modelId: string,
  onProgress?: (report: InitProgressReport) => void,
): Promise<WebWorkerMLCEngine> {
  if (engine && loadedModelId === modelId) return engine;
  if (engine) {
    engine.setInitProgressCallback(onProgress ?? (() => {}));
    await engine.reload(modelId);
  } else {
    engine = await CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
      modelId,
      { initProgressCallback: onProgress },
    );
  }
  loadedModelId = modelId;
  markModelSaved();
  return engine;
}

/** Frees the model from memory (used before deleting it from the device). */
export async function unloadModel(): Promise<void> {
  if (engine) await engine.unload();
  loadedModelId = null;
}

export function currentModelId() {
  return loadedModelId;
}

export interface ReplyStats {
  ttftS: number;
  tokensPerS: number;
  totalS: number;
  tokens: number;
}

/** Streams a reply token by token. Returns the full text and timing stats. */
export async function streamReply(
  messages: ChatCompletionMessageParam[],
  onDelta: (textSoFar: string) => void,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<{ text: string; stats: ReplyStats }> {
  if (!engine) throw new Error("Model not loaded");
  const started = performance.now();
  let firstTokenAt = 0;
  let text = "";
  let tokens = 0;

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: opts.maxTokens ?? 120,
    temperature: opts.temperature ?? 0.7,
  });

  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      if (!firstTokenAt) firstTokenAt = performance.now();
      text += delta;
      onDelta(text);
    }
    if (chunk.usage) tokens = chunk.usage.completion_tokens;
  }

  const ended = performance.now();
  const decodeS = Math.max((ended - (firstTokenAt || ended)) / 1000, 0.001);
  return {
    text,
    stats: {
      ttftS: ((firstTokenAt || ended) - started) / 1000,
      tokensPerS: tokens / decodeS,
      totalS: (ended - started) / 1000,
      tokens,
    },
  };
}
