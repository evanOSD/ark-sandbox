import WaveSurfer from "wavesurfer.js";

/**
 * Encodes a Float32Array of audio samples as a 24-bit PCM WAV Blob (mono).
 */
export function encodeWav24Bit(
  samples: Float32Array,
  sampleRate: number,
): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 3);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + samples.length * 3, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 3, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 3, true);
  /* bits per sample (24 bits) */
  view.setUint16(34, 24, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * 3, true);

  // Write PCM audio samples
  let index = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp value
    let s = Math.max(-1, Math.min(1, samples[i]));
    // Konversi Float32 (-1.0 s/d 1.0) menjadi Int24 (-8388608 s/d 8388607)
    s = s < 0 ? s * 0x800000 : s * 0x7fffff;
    s = Math.round(s);
    // Tulis 3 bytes (Little Endian)
    view.setUint8(index, s & 0xff);
    view.setUint8(index + 1, (s >> 8) & 0xff);
    view.setUint8(index + 2, (s >> 16) & 0xff);
    index += 3;
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Creates a silent WAV Blob of a specific duration.
 */
export function createSilentWavBlob(
  durationSeconds: number,
  sampleRate: number = 48000,
): Blob {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const floatData = new Float32Array(numSamples);
  return encodeWav24Bit(floatData, sampleRate);
}

/**
 * Fetches a remote audio file, decodes it, slices it to the given
 * [startMs, endMs] boundary, and loads the resulting WAV into a WaveSurfer
 * instance. Falls back to loading the original URL on error.
 */
export async function loadAndSliceReferenceAudio(
  url: string,
  startMs: number,
  endMs: number,
  ws: WaveSurfer,
): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengambil file audio referensi.");

    const arrayBuffer = await response.arrayBuffer();
    const AudioContextClass =
      window.AudioContext ||
      (
        window as Window &
          typeof globalThis & { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 48000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor((startMs / 1000) * sampleRate);
    const endSample = Math.floor((endMs / 1000) * sampleRate);

    // Ensure boundaries are valid
    const safeStart = Math.max(0, Math.min(startSample, audioBuffer.length));
    const safeEnd = Math.max(
      safeStart,
      Math.min(endSample, audioBuffer.length),
    );
    const expectedSamples = Math.round(((endMs - startMs) / 1000) * sampleRate);

    if (expectedSamples <= 0) {
      throw new Error("Durasi segmen audio referensi tidak valid.");
    }

    // Extract mono data (channel 0)
    const channelData = audioBuffer.getChannelData(0);
    const slicedFloatData = new Float32Array(expectedSamples);
    const copyLength = Math.min(expectedSamples, safeEnd - safeStart);
    if (copyLength > 0) {
      slicedFloatData.set(channelData.subarray(safeStart, safeStart + copyLength));
    }

    // Encode slicedFloatData into a WAV Blob
    const wavBlob = encodeWav24Bit(slicedFloatData, sampleRate);
    const blobUrl = URL.createObjectURL(wavBlob);

    // Load trimmed audio into Wavesurfer
    await ws.load(blobUrl);

    // Close audioContext to release resources
    await audioCtx.close();
    return true;
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    if (!isAbort) {
      console.error("Gagal melakukan slice audio referensi:", err);
      // Fallback to loading the original url if slice fails
      ws.load(url).catch((loadErr) => {
        if (loadErr.name !== "AbortError") console.error(loadErr);
      });
    }
    return false;
  }
}

/**
 * Fetches an audio file, decodes it, pads it with silence (or trims it)
 * to match exactly targetDurationSeconds, and loads it into WaveSurfer.
 */
export async function loadAndPadAudio(
  url: string,
  targetDurationSeconds: number,
  ws: WaveSurfer,
) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengambil file audio.");

    const arrayBuffer = await response.arrayBuffer();
    const AudioContextClass =
      window.AudioContext ||
      (
        window as Window &
          typeof globalThis & { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 48000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const expectedSamples = Math.round(targetDurationSeconds * sampleRate);
    const paddedData = new Float32Array(expectedSamples);

    const channelData = audioBuffer.getChannelData(0);
    const copyLength = Math.min(expectedSamples, channelData.length);
    if (copyLength > 0) {
      paddedData.set(channelData.subarray(0, copyLength));
    }

    const wavBlob = encodeWav24Bit(paddedData, sampleRate);
    const blobUrl = URL.createObjectURL(wavBlob);

    await ws.load(blobUrl);
    await audioCtx.close();
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    if (!isAbort) {
      console.error("Gagal memproses dan melakukan pad audio:", err);
      // Fallback
      ws.load(url).catch((loadErr) => {
        if (loadErr.name !== "AbortError") console.error(loadErr);
      });
    }
  }
}
