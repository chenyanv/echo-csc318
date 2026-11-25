/** WebGPU check, kept separate from engine.ts so it doesn't pull in WebLLM (~2 MB gzipped). */

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
