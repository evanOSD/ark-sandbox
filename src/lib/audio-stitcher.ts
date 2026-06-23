// Helper encoding PCM 24-bit 48kHz Mono WAV
function encodeWav24Bit(samples: Float32Array, sampleRate: number): Blob {
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
    let s = Math.max(-1, Math.min(1, samples[i]));
    s = s < 0 ? s * 0x800000 : s * 0x7FFFFF;
    s = Math.round(s);
    view.setUint8(index, s & 0xff);
    view.setUint8(index + 1, (s >> 8) & 0xff);
    view.setUint8(index + 2, (s >> 16) & 0xff);
    index += 3;
  }

  return new Blob([view], { type: "audio/wav" });
}

export interface StitchLoopData {
  start_time_ms: number;
  audio_url: string;
}

/**
 * Menggabungkan beberapa audio rekaman loop ke dalam satu track scene menggunakan OfflineAudioContext.
 * @param loops Daftar loop yang memiliki audio (beserta start_time_ms).
 * @param sceneDurationMs Total durasi scene.
 * @returns Blob URL dari audio gabungan (WAV 24-bit 48kHz Mono).
 */
export async function stitchSceneAudio(
  loops: StitchLoopData[],
  sceneDurationMs: number
): Promise<string | null> {
  if (loops.length === 0) return null;

  const sampleRate = 48000;
  // Ensure duration is at least 1 second to avoid errors
  const lengthSamples = Math.max(
    sampleRate,
    Math.ceil((sceneDurationMs / 1000) * sampleRate)
  );

  const OfflineAudioContextClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const offlineCtx = new OfflineAudioContextClass(1, lengthSamples, sampleRate);

  // Fungsi helper untuk fetch dan decode
  const fetchAndDecode = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil audio");
      const arrayBuffer = await res.arrayBuffer();
      // Perlu membuat temporary context untuk mendecode (OfflineCtx tidak selalu reliable untuk decode di semua browser)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const tempCtx = new AudioContextClass({ sampleRate });
      const decodedData = await tempCtx.decodeAudioData(arrayBuffer);
      await tempCtx.close();
      return decodedData;
    } catch (err) {
      console.error(`Gagal mendecode audio dari ${url}`, err);
      return null;
    }
  };

  // Proses semua loop secara paralel
  const decodePromises = loops.map(async (loop) => {
    const buffer = await fetchAndDecode(loop.audio_url);
    if (!buffer) return;
    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(offlineCtx.destination);
    sourceNode.start(loop.start_time_ms / 1000);
  });

  await Promise.all(decodePromises);

  // Mulai rendering offline
  const renderedBuffer = await offlineCtx.startRendering();

  // Ekstrak data mono dan encode menjadi WAV Blob
  const channelData = renderedBuffer.getChannelData(0);
  const wavBlob = encodeWav24Bit(channelData, sampleRate);

  // Hasilkan Blob URL yang siap dipakai di <audio> tag
  return URL.createObjectURL(wavBlob);
}
