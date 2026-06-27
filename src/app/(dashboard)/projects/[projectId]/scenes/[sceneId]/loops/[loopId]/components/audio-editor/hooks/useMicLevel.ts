"use client";

import { useState, useEffect } from "react";

export function useMicLevel(isOpen: boolean): number {
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId = 0;
    let activeStream: MediaStream | null = null;
    let mounted = true;

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = stream;

        const AudioCtxClass =
          window.AudioContext ||
          (
            window as Window &
              typeof globalThis & { webkitAudioContext?: typeof AudioContext }
          ).webkitAudioContext;
        audioCtx = new AudioCtxClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const tick = () => {
          if (!mounted || !analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const pct = Math.min(100, ((sum / bufferLength) / 128) * 100);
          setMicLevel(pct);
          animationFrameId = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        console.error("Gagal inisialisasi monitor microphone:", err);
      }
    };

    initMic();

    return () => {
      mounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (audioCtx) audioCtx.close();
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
      setMicLevel(0);
    };
  }, [isOpen]);

  return micLevel;
}
