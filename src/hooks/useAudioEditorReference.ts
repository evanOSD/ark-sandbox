import { useEffect, useRef, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover.js";
import { loadAndSliceReferenceAudio } from "@/lib/audio-utils";
import type { LoopBoundary, ProjectTemplate } from "./useAudioEditorState.types";

interface UseAudioEditorReferenceOptions {
  projectTemplate: ProjectTemplate;
  loopBoundary: LoopBoundary;
}

export function useAudioEditorReference({
  projectTemplate,
  loopBoundary,
}: UseAudioEditorReferenceOptions) {
  const refContainerRef = useRef<HTMLDivElement | null>(null);
  const refWavesurfer = useRef<WaveSurfer | null>(null);

  const audioSources = useMemo(
    () => projectTemplate.audio_sources || [],
    [projectTemplate.audio_sources],
  );
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [refSelectedRegion, setRefSelectedRegion] = useState<Region | null>(null);
  const refRegionsPlugin = useRef<RegionsPlugin | null>(null);
  const refSelectedRegionRef = useRef<Region | null>(null);

  const [isRefAudioLoaded, setIsRefAudioLoaded] = useState(false);
  const [isRefAudioSliced, setIsRefAudioSliced] = useState(false);

  useEffect(() => {
    if (!refContainerRef.current) return;

    const maxDurationS = (loopBoundary.end_time_ms - loopBoundary.start_time_ms) / 1000;

    const bottomTimeline = TimelinePlugin.create({
      height: 14,
      timeInterval: 0.2,
      primaryLabelInterval: 1,
      style: {
        fontSize: "10px",
        color: "#6b7280",
      },
      duration: maxDurationS,
    });

    const hoverRef = HoverPlugin.create({
      lineColor: "rgba(99, 102, 241, 0.5)",
      lineWidth: 2,
      labelBackground: "rgba(0, 0, 0, 0.75)",
      labelColor: "#fff",
      labelSize: "10px",
      formatTimeCallback: (time: number) => time.toFixed(2) + "s",
    });

    const ws = WaveSurfer.create({
      container: refContainerRef.current,
      waveColor: "rgba(99, 102, 241, 0.4)",
      progressColor: "rgb(99, 102, 241)",
      height: 80,
      cursorColor: "#6366f1",
      interact: true,
      sampleRate: 48000,
      plugins: [bottomTimeline, hoverRef],
    });

    refWavesurfer.current = ws;

    const regions = ws.registerPlugin(RegionsPlugin.create());
    refRegionsPlugin.current = regions;

    regions.enableDragSelection({
      color: "rgba(99, 102, 241, 0.15)",
    });

    regions.on("region-created", (region: Region) => {
      const allRegions = regions.getRegions();
      allRegions.forEach((r: Region) => {
        if (r.id !== region.id) r.remove();
      });
      setRefSelectedRegion(region);
      refSelectedRegionRef.current = region;
    });

    regions.on("region-updated", (region: Region) => {
      setRefSelectedRegion(region);
      refSelectedRegionRef.current = region;
    });

    regions.on("region-removed", () => {
      setRefSelectedRegion(null);
      refSelectedRegionRef.current = null;
    });

    ws.on("click", (relativeX: number) => {
      const activeRegions = regions.getRegions();
      if (activeRegions.length > 0) {
        const duration = ws.getDuration();
        const clickedTime = relativeX * duration;
        const activeRegion = activeRegions[0];
        if (activeRegion) {
          if (clickedTime < activeRegion.start || clickedTime > activeRegion.end) {
            regions.clearRegions();
            setRefSelectedRegion(null);
            refSelectedRegionRef.current = null;
          }
        }
      }
    });

    setIsRefAudioLoaded(false);
    setIsRefAudioSliced(false);

    ws.on("play", () => setIsRefPlaying(true));
    ws.on("pause", () => setIsRefPlaying(false));
    ws.on("decode", () => {
      setIsRefAudioLoaded(true);
    });
    ws.on("timeupdate", (currentTime: number) => {
      if (refSelectedRegionRef.current && ws.isPlaying()) {
        if (currentTime >= refSelectedRegionRef.current.end) {
          ws.pause();
          ws.setTime(refSelectedRegionRef.current.start);
        }
      }
    });
    ws.on("error", (err: Error) => {
      if (err.name !== "AbortError") console.warn("[RefWaveform]", err.message);
    });

    const targetUrl =
      audioSources.length > 0
        ? audioSources[activeTabIdx].url
        : projectTemplate.audio_url;

    if (targetUrl) {
      loadAndSliceReferenceAudio(
        targetUrl,
        loopBoundary.start_time_ms,
        loopBoundary.end_time_ms,
        ws,
      ).then((success) => {
        setIsRefAudioSliced(success);
        setIsRefAudioLoaded(true);
      });
    }

    return () => {
      ws.destroy();
    };
  }, [
    activeTabIdx,
    audioSources,
    projectTemplate.audio_url,
    loopBoundary.start_time_ms,
    loopBoundary.end_time_ms,
  ]);

  const handleTabChange = (idx: number) => {
    setActiveTabIdx(idx);
  };

  const toggleRefPlay = () => {
    if (!refWavesurfer.current) return;
    if (isRefPlaying) {
      refWavesurfer.current.pause();
    } else {
      if (refSelectedRegion) {
        refSelectedRegion.play();
      } else {
        refWavesurfer.current.play();
      }
    }
  };

  const stopRefPlay = () => {
    if (!refWavesurfer.current) return;
    refWavesurfer.current.stop();
    if (refRegionsPlugin.current) {
      refRegionsPlugin.current.clearRegions();
    }
    setRefSelectedRegion(null);
  };

  return {
    refContainerRef,
    refWavesurfer,
    audioSources,
    activeTabIdx,
    isRefPlaying,
    isRefAudioLoaded,
    isRefAudioSliced,
    handleTabChange,
    toggleRefPlay,
    stopRefPlay,
  };
}
