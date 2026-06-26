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
}: UseAudioEditorEditsOptions) {
  const handleTrim = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);
    const channelData = buffer.getChannelData(0);

    const trimmedData = new Float32Array(channelData.length);
    trimmedData.set(channelData.subarray(startIndex, endIndex), startIndex);

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

    const channelData = buffer.getChannelData(0);
    const stitchedData = new Float32Array(channelData);
    for (let i = startIndex; i < endIndex; i++) {
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
    const totalLength = channelData.length;

    const stitchedData = new Float32Array(totalLength);
    stitchedData.set(channelData.subarray(0, startIndex), 0);
    const shiftedPart = channelData.subarray(endIndex, totalLength);
    stitchedData.set(shiftedPart, startIndex);

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

  const handleNormalize = async () => {
    if (!recWavesurfer.current || !recordedUrl) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);

    let startIndex = 0;
    let endIndex = channelData.length;

    if (selectedRegion) {
      startIndex = Math.floor(selectedRegion.start * sampleRate);
      endIndex = Math.floor(selectedRegion.end * sampleRate);
    }

    let maxPeak = 0;
    for (let i = startIndex; i < endIndex; i++) {
      const absVal = Math.abs(channelData[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }
    if (maxPeak === 0) return;

    const targetPeak = Math.pow(10, -6 / 20); // ~0.501187 (-6dB)
    const multiplier = targetPeak / maxPeak;

    const normalizedData = new Float32Array(channelData);
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
  };

  return {
    handleTrim,
    handleMuteSelection,
    handleDeleteSelection,
    handleClearSelection,
    handleNormalize,
  };
}
