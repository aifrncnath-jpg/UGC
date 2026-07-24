import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers'

// Pull models from the Hugging Face hub (no local models bundled).
env.allowLocalModels = false

interface TranscribeRequest {
  type: 'transcribe'
  audio: Float32Array
  model: string
  language?: string
}

// Typed message poster (avoids pulling in the WebWorker lib which conflicts
// with the DOM lib used by the rest of the app).
const post = (msg: unknown) =>
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage(msg)

const progress_callback = (p: unknown) => post({ status: 'loading-model', data: p })

let transcriber: AutomaticSpeechRecognitionPipeline | null = null
let loadedModel: string | null = null
let loadedDevice: 'webgpu' | 'wasm' | null = null

/**
 * Actually probe for a usable WebGPU adapter. WebGPU can be "present" on
 * `navigator` but still fail to hand out an adapter (unsupported GPU/driver,
 * disabled flag, headless, etc.). Doing this up front lets us pick WASM
 * cleanly instead of crashing mid-transcription.
 */
async function webgpuUsable(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } })
      .gpu
    if (!gpu) return false
    const adapter = await gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}

async function buildPipeline(model: string, device: 'webgpu' | 'wasm') {
  const pipe = await pipeline('automatic-speech-recognition', model, {
    device,
    // Quantize the heavy audio encoder (smaller download + faster), but keep
    // the decoder full-precision: the quantized decoder variants use a
    // MatMulNBits op on the tied embed_tokens weights that ORT-Web's WASM
    // backend cannot load. This combo is both compatible and lean.
    dtype:
      device === 'webgpu'
        ? { encoder_model: 'fp32', decoder_model_merged: 'fp32' }
        : { encoder_model: 'q8', decoder_model_merged: 'fp32' },
    progress_callback,
  })
  transcriber = pipe
  loadedModel = model
  loadedDevice = device
  post({ status: 'model-ready', device })
  return pipe
}

async function getTranscriber(model: string) {
  if (transcriber && loadedModel === model) return transcriber
  const device = (await webgpuUsable()) ? 'webgpu' : 'wasm'
  return buildPipeline(model, device)
}

self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as TranscribeRequest
  if (data?.type !== 'transcribe') return

  void (async () => {
    const { audio, model, language } = data
    const options = {
      return_timestamps: 'word' as const,
      chunk_length_s: 30,
      stride_length_s: 5,
      language: language && language !== 'auto' ? language : undefined,
    }

    const run = async () => {
      const asr = await getTranscriber(model)
      post({ status: 'transcribing' })
      return (await asr(audio, options)) as unknown as {
        text: string
        chunks?: { text: string; timestamp: [number, number | null] }[]
      }
    }

    try {
      let output
      try {
        output = await run()
      } catch (err) {
        // WebGPU failures often surface only at inference time. If we were on
        // WebGPU, rebuild on CPU (WASM) and retry once before giving up.
        if (loadedDevice === 'webgpu') {
          transcriber = null
          loadedModel = null
          post({ status: 'loading-model', data: { status: 'fallback' } })
          await buildPipeline(model, 'wasm')
          post({ status: 'transcribing' })
          const asr = transcriber as unknown as (a: Float32Array, o: typeof options) => Promise<unknown>
          output = (await asr(audio, options)) as unknown as {
            text: string
            chunks?: { text: string; timestamp: [number, number | null] }[]
          }
        } else {
          throw err
        }
      }

      post({ status: 'done', text: output.text, chunks: output.chunks ?? [] })
    } catch (err) {
      post({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  })()
})
