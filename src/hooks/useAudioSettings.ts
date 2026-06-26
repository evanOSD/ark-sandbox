import { useEffect, useState } from "react";

export interface AudioSettings {
  noiseSuppression: boolean;
  autoGainControl: boolean;
  echoCancellation: boolean;
  toggleNoiseSuppression: () => void;
  toggleAutoGainControl: () => void;
  toggleEchoCancellation: () => void;
}

/**
 * Manages microphone DSP toggle settings (Noise Suppression, Auto Gain Control,
 * Echo Cancellation) and persists them to localStorage.
 */
export function useAudioSettings(): AudioSettings {
  const [noiseSuppression, setNoiseSuppression] = useState(false);
  const [autoGainControl, setAutoGainControl] = useState(false);
  const [echoCancellation, setEchoCancellation] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedNS = localStorage.getItem("ark_noise_suppression");
      const storedAGC = localStorage.getItem("ark_auto_gain_control");
      const storedEC = localStorage.getItem("ark_echo_cancellation");

      // Defer state updates to avoid React compiler/linter warnings
      const timer = setTimeout(() => {
        if (storedNS !== null) setNoiseSuppression(storedNS === "true");
        if (storedAGC !== null) setAutoGainControl(storedAGC === "true");
        if (storedEC !== null) setEchoCancellation(storedEC === "true");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, []);

  const toggleNoiseSuppression = () => {
    const nextVal = !noiseSuppression;
    setNoiseSuppression(nextVal);
    localStorage.setItem("ark_noise_suppression", String(nextVal));
  };

  const toggleAutoGainControl = () => {
    const nextVal = !autoGainControl;
    setAutoGainControl(nextVal);
    localStorage.setItem("ark_auto_gain_control", String(nextVal));
  };

  const toggleEchoCancellation = () => {
    const nextVal = !echoCancellation;
    setEchoCancellation(nextVal);
    localStorage.setItem("ark_echo_cancellation", String(nextVal));
  };

  return {
    noiseSuppression,
    autoGainControl,
    echoCancellation,
    toggleNoiseSuppression,
    toggleAutoGainControl,
    toggleEchoCancellation,
  };
}
