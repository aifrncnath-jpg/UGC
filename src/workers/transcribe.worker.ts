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

let transcriber: AutomaticSpeechRecognitionPipeline | null = null
let loadedModel: string | null = null
let loadedDevice: 'webgpu' | 'wasm' | null = null

async function getTranscriber(model: string) {
  if (transcriber && loadedModel === model) return transcriber

  const progress_callback = (p: unknown) => post({ status: 'loading-model', data: p })

  // Prefer WebGPU for speed; gracefully fall back to WASM.
  try {
    transcriber = await pipeline('automatic-speech-recognition', model, {
      device: 'webgpu',
      dtype: 'fp32',
      progress_callback,
    })
    loadedDevice = 'webgpu'
  } catch {
    transcriber = await pipeline('automatic-speech-recognition', model, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback,
    })
    loadedDevice = 'wasm'
  }
  loadedModel = model
  post({ status: 'model-ready', device: loadedDevice })
  return transcriber
}

self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as TranscribeRequest
  if (data?.type !== 'transcribe') return

  void (async () => {
    try {
      const { audio, model, language } = data
      const asr = await getTranscriber(model)

      post({ status: 'transcribing' })

      const output = (await asr(audio, {
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
        language: language && language !== 'auto' ? language : undefined,
      })) as unknown as {
        text: string
        chunks?: { text: string; timestamp: [number, number | null] }[]
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
