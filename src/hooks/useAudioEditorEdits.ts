import { useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.js";
import { encodeWav24Bit } from "@/lib/audio-utils";
import { saveLocalRecording } from "@/lib/indexeddb";

interface UseAudioEditorEditsOptions {
  projectId: string;
  loopId: string;
  recWavesurfer: React.MutableRefObject<WaveSurfer | null>;
  selectedRegion: Region | null;
  setSelectedRegion: (region: Region | null) => void;
  recRegionsPlugin: React.MutableRefObject<RegionsPlugin | null>;
  setRecordedBlob: (blob: Blob | null) => void;
  setRecordedUrl: (url: string | null) => void;
  recordedUrl: string | null;
  recordedBlob: Blob | null;
  actualRecordedDuration: number;
}

export function useAudioEditorEdits({
  projectId,
  loopId,
  recWavesurfer,
  selectedRegion,
  setSelectedRegion,
  recRegionsPlugin,
  setRecordedBlob,
  setRecordedUrl,
  recordedUrl,
  recordedBlob,
  actualRecordedDuration,
}: UseAudioEditorEditsOptions) {
  const actualDurationRef = useRef(actualRecordedDuration);
  useEffect(() => {
    actualDurationRef.current = actualRecordedDuration;
  }, [actualRecordedDuration]);

  // Helper to reliably find the exact unpadded duration of the user's active recording
  const getActualDuration = async (buffer: AudioBuffer): Promise<number> => {
    if (recordedBlob) {
      try {
        const arrayBuffer = await recordedBlob.arrayBuffer();
        const AudioContextClass =
          window.AudioContext ||
          (
            window as Window &
              typeof globalThis & { webkitAudioContext?: typeof AudioContext }
          ).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const dur = audioBuffer.duration;
        await audioCtx.close();
        if (dur > 0) return dur;
      } catch (err) {
        console.error("Gagal men-decode recordedBlob untuk durasi edit:", err);
      }
    }
    // Fallback: use actualRecordedDuration state, or finally, the full WaveSurfer buffer duration (safe fallback to prevent 0-length WAVs)
    return actualDurationRef.current || buffer.duration;
  };

  const handleTrim = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);
    const trimLength = endIndex - startIndex;

    if (trimLength <= 0) return;

    const channelData = buffer.getChannelData(0);
    const trimmedData = new Float32Array(trimLength);
    trimmedData.set(channelData.subarray(startIndex, endIndex), 0);

    const wavBlob = encodeWav24Bit(trimmedData, sampleRate);
    setRecordedBlob(wavBlob);

    if (recRegionsPlugin.current) recRegionsPlugin.current.clearRegions();
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    await saveLocalRecording(projectId, loopId, wavBlob);
  };

  const handleMuteSelection = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);

    const actualDur = await getActualDuration(buffer);
    const actualSamples = Math.round(actualDur * sampleRate);
    const channelData = buffer.getChannelData(0);
    const stitchedData = new Float32Array(actualSamples);
    stitchedData.set(channelData.subarray(0, actualSamples), 0);

    const startIdx = Math.min(startIndex, actualSamples);
    const endIdx = Math.min(endIndex, actualSamples);
    for (let i = startIdx; i < endIdx; i++) {
      stitchedData[i] = 0;
    }

    const wavBlob = encodeWav24Bit(stitchedData, sampleRate);
    setRecordedBlob(wavBlob);

    if (recRegionsPlugin.current) recRegionsPlugin.current.clearRegions();
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    await saveLocalRecording(projectId, loopId, wavBlob);
  };

  const handleDeleteSelection = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);
    const deletedLength = endIndex - startIndex;

    if (deletedLength <= 0) return;

    const channelData = buffer.getChannelData(0);
    const actualDur = await getActualDuration(buffer);
    const actualSamples = Math.round(actualDur * sampleRate);
    const newLength = Math.max(0, actualSamples - deletedLength);

    const stitchedData = new Float32Array(newLength);
    const startIdx = Math.min(startIndex, actualSamples);
    stitchedData.set(channelData.subarray(0, startIdx), 0);

    const endIdx = Math.min(endIndex, actualSamples);
    const shiftedPart = channelData.subarray(endIdx, actualSamples);
    stitchedData.set(shiftedPart, startIdx);

    const wavBlob = encodeWav24Bit(stitchedData, sampleRate);
    setRecordedBlob(wavBlob);

    if (recRegionsPlugin.current) recRegionsPlugin.current.clearRegions();
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    await saveLocalRecording(projectId, loopId, wavBlob);
  };

  const handleClearSelection = () => {
    if (recRegionsPlugin.current) recRegionsPlugin.current.clearRegions();
    setSelectedRegion(null);
  };

  const handleNormalize = async (forceNormalizeAll: unknown = false): Promise<Blob | null> => {
    if (!recWavesurfer.current || !recordedUrl) return null;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return null;

    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    
    const normalizeAll = forceNormalizeAll === true;

    console.log("[Normalize Debug] Start handleNormalize:", {
      forceNormalizeAll,
      normalizeAll,
      actualRecordedDurationState: actualDurationRef.current,
      bufferDuration: buffer.duration,
      bufferLength: buffer.length,
      sampleRate,
    });

    const actualDur = await getActualDuration(buffer);
    const actualSamples = Math.round(actualDur * sampleRate);
    console.log("[Normalize Debug] Resolved duration:", { actualDur, actualSamples });

    let startIndex = 0;
    let endIndex = actualSamples;

    if (selectedRegion && !normalizeAll) {
      startIndex = Math.min(Math.floor(selectedRegion.start * sampleRate), actualSamples);
      endIndex = Math.min(Math.floor(selectedRegion.end * sampleRate), actualSamples);
    }
    console.log("[Normalize Debug] Indices:", { startIndex, endIndex });

    let maxPeak = 0;
    for (let i = startIndex; i < endIndex; i++) {
      const absVal = Math.abs(channelData[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }
    console.log("[Normalize Debug] Peak analysis:", { maxPeak });
    if (maxPeak === 0) {
      console.log("[Normalize Debug] maxPeak is 0, aborting.");
      return recordedBlob;
    }

    const targetPeak = Math.pow(10, -6 / 20); // ~0.501187 (-6dB)
    const multiplier = targetPeak / maxPeak;
    console.log("[Normalize Debug] Multiplier:", { targetPeak, multiplier });

    const normalizedData = new Float32Array(actualSamples);
    normalizedData.set(channelData.subarray(0, actualSamples), 0);
    for (let i = startIndex; i < endIndex; i++) {
      normalizedData[i] *= multiplier;
    }

    const wavBlob = encodeWav24Bit(normalizedData, sampleRate);
    setRecordedBlob(wavBlob);

    if (recRegionsPlugin.current) recRegionsPlugin.current.clearRegions();
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    await saveLocalRecording(projectId, loopId, wavBlob);
    return wavBlob;
  };

  return {
    handleTrim,
    handleMuteSelection,
    handleDeleteSelection,
    handleClearSelection,
    handleNormalize,
  };
}
