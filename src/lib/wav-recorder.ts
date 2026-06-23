export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private leftchannel: Float32Array[] = [];
  private recordingLength = 0;
  private sampleRate = 48000;

  constructor() {}

  async start(options?: { echoCancellation?: boolean; noiseSuppression?: boolean; autoGainControl?: boolean }) {
    this.leftchannel = [];
    this.recordingLength = 0;
    
    // Request microphone access with constraints (defaults to raw audio)
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: options?.echoCancellation ?? false,
        noiseSuppression: options?.noiseSuppression ?? false,
        autoGainControl: options?.autoGainControl ?? false,
      }
    });
    
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 48000 });
    this.sampleRate = 48000;

    this.micNode = this.audioContext.createMediaStreamSource(this.stream);
    
    // Create ScriptProcessor node (mono input, mono output)
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.leftchannel.push(new Float32Array(inputData));
      this.recordingLength += inputData.length;
    };

    this.micNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  stop(): Blob {
    if (this.processorNode && this.micNode) {
      this.processorNode.disconnect();
      this.micNode.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    // Flatten the left channel buffers
    const result = new Float32Array(this.recordingLength);
    let offset = 0;
    for (let i = 0; i < this.leftchannel.length; i++) {
      result.set(this.leftchannel[i], offset);
      offset += this.leftchannel[i].length;
    }

    // Create WAV ArrayBuffer
    const buffer = new ArrayBuffer(44 + this.recordingLength * 3);
    const view = new DataView(buffer);

    /* RIFF identifier */
    this.writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + this.recordingLength * 3, true);
    /* RIFF type */
    this.writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    this.writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM = 1) */
    view.setUint16(20, 1, true);
    /* channel count (mono = 1) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, this.sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, this.sampleRate * 3, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 3, true);
    /* bits per sample (24 bits) */
    view.setUint16(34, 24, true);
    /* data chunk identifier */
    this.writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, this.recordingLength * 3, true);

    // Write PCM audio samples
    let index = 44;
    for (let i = 0; i < result.length; i++) {
      // Clamp value
      let s = Math.max(-1, Math.min(1, result[i]));
      // Konversi Float32 (-1.0 s/d 1.0) menjadi Int24 (-8388608 s/d 8388607)
      s = s < 0 ? s * 0x800000 : s * 0x7FFFFF;
      s = Math.round(s);
      // Tulis 3 bytes (Little Endian)
      view.setUint8(index, s & 0xFF);
      view.setUint8(index + 1, (s >> 8) & 0xFF);
      view.setUint8(index + 2, (s >> 16) & 0xFF);
      index += 3;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
