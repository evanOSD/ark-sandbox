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
        analyser.fftSize = 1024; // Better resolution for time-domain RMS analysis

        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        // Calibrated piecewise mapping optimized for browser mic input dynamic range
        const dbToPercentage = (db: number): number => {
          if (db <= -50) return 0;
          if (db >= -10) return 100;
          if (db < -38) {
            return 0 + ((db - (-50)) / 12) * 20; // [-50, -38] -> [0, 20]%
          }
          if (db < -28) {
            return 20 + ((db - (-38)) / 10) * 20; // [-38, -28] -> [20, 40]%
          }
          if (db < -20) {
            return 40 + ((db - (-28)) / 8) * 20; // [-28, -20] -> [40, 60]%
          }
          if (db < -15) {
            return 60 + ((db - (-20)) / 5) * 20; // [-20, -15] -> [60, 80]%
          }
          return 80 + ((db - (-15)) / 5) * 20; // [-15, -10] -> [80, 100]%
        };
 
        const tick = () => {
          if (!mounted || !analyser) return;
          analyser.getFloatTimeDomainData(dataArray);
          
          // Calculate RMS (Root Mean Square) for accurate signal level
          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / bufferLength);
          
          // Convert RMS to Decibel (dB)
          let db = -Infinity;
          if (rms > 0.0001) { // approx -80 dB
            db = 20 * Math.log10(rms);
          }
          
          const pct = dbToPercentage(db);
          setMicLevel(Math.round(pct));
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
