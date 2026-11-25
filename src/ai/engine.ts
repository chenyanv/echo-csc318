import {
  CreateWebWorkerMLCEngine,
  hasModelInCache,
  type ChatCompletionMessageParam,
  type InitProgressReport,
  type WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";

export interface DeviceSupport {
  webgpu: boolean;
  shaderF16: boolean;
  /** Human-readable reason when on-device AI can't run. */
  reason?: string;
}

let supportPromise: Promise<DeviceSupport> | null = null;

export function checkDeviceSupport(): Promise<DeviceSupport> {
  supportPromise ??= (async () => {
    if (!("gpu" in navigator) || !navigator.gpu) {
      return { webgpu: false, shaderF16: false, reason: "This browser doesn't support WebGPU." };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { webgpu: false, shaderF16: false, reason: "No compatible graphics adapter was found." };
      }
      return { webgpu: true, shaderF16: adapter.features.has("shader-f16") };
    } catch {
      return { webgpu: false, shaderF16: false, reason: "WebGPU is turned off or unavailable." };
    }
  })();
  return supportPromise;
}

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
  return engine;
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
