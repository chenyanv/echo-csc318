/**
 * On-device models we are evaluating (WebLLM prebuilt ids).
 * `f16` needs the WebGPU `shader-f16` feature; `f32` is the fallback build.
 * VRAM numbers come from WebLLM's prebuiltAppConfig.
 */
export interface CandidateModel {
  key: string;
  name: string;
  note: string;
  f16: { id: string; vramMB: number };
  /** Fallback build for GPUs without shader-f16. Some models only ship f16. */
  f32?: { id: string; vramMB: number };
}

export const CANDIDATE_MODELS: CandidateModel[] = [
  {
    key: "llama-1b",
    name: "Llama 3.2 1B Instruct",
    note: "Default. Follows instructions noticeably better in our tests.",
    f16: { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", vramMB: 879 },
    f32: { id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", vramMB: 1129 },
  },
  {
    key: "qwen-0.5b",
    name: "Qwen2.5 0.5B Instruct",
    note: "Smaller and faster, but often ignores the prompt.",
    f16: { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", vramMB: 945 },
    f32: { id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", vramMB: 1060 },
  },
  {
    key: "gemma3-1b",
    name: "Gemma 3 1B Instruct",
    note: "Smallest download, but drifts off-prompt and invents details.",
    f16: { id: "gemma3-1b-it-q4f16_1-MLC", vramMB: 711 },
  },
];

export function pickBuild(model: CandidateModel, shaderF16: boolean) {
  return shaderF16 || !model.f32 ? model.f16 : model.f32;
}
