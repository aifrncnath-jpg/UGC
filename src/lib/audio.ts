/**
 * Extract mono 16 kHz PCM audio from a video/audio file.
 * Whisper expects a Float32Array sampled at 16 kHz.
 */
const TARGET_SAMPLE_RATE = 16000

export async function extractAudio(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer()

  // Decode using a regular AudioContext (broad codec support via the browser).
  const AudioCtx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  const decodeCtx = new AudioCtx()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    void decodeCtx.close()
  }

  // Resample + downmix to mono 16 kHz using an OfflineAudioContext.
  const duration = decoded.duration
  const frameCount = Math.ceil(duration * TARGET_SAMPLE_RATE)
  const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()

  return rendered.getChannelData(0)
}
