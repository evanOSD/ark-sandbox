"use client";

import { useState, useRef, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PanelImperativeHandle } from "react-resizable-panels";
import { WavRecorder } from "@/lib/wav-recorder";
import { saveKeyTermTranslation } from "../../../../loops/actions";
import dynamic from "next/dynamic";

const AudioEditor = dynamic(() => import("./components/AudioEditor"), {
  ssr: false,
});

import {
  KeyTerm,
  Loop,
  Template,
  Project,
  WorkspaceClientProps,
} from "@/types";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { WorkspaceFooter } from "./components/WorkspaceFooter";
import { KeyTermsPanel } from "./components/KeyTermsPanel";
import { AudioLogsPanel } from "./components/AudioLogsPanel";

export type { KeyTerm, Loop, Template, Project, WorkspaceClientProps };

export function WorkspaceClient({
  project,
  loop,
  existingRecordingUrl,
  isModal,
  onClose,
}: WorkspaceClientProps) {
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyTermsOpen, setIsKeyTermsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isRefAudioLoaded, setIsRefAudioLoaded] = useState(false);
  const [isRefAudioSliced, setIsRefAudioSliced] = useState(false);
  const [hasUnsavedRecording, setHasUnsavedRecording] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("idle");

  const keyTermsPanelRef = useRef<PanelImperativeHandle>(null);

  useEffect(() => {
    const panel = keyTermsPanelRef.current;
    if (!panel) return;

    if (isKeyTermsOpen || isLogsOpen) {
      panel.resize("40");
    } else {
      panel.collapse();
    }
  }, [isKeyTermsOpen, isLogsOpen]);

  // Key Term Translation states initialized from props
  const [termTranslations, setTermTranslations] = useState<
    Record<
      string,
      {
        text: string;
        blob: Blob | null;
        url: string | null;
        isRecording: boolean;
        instance: WavRecorder | null;
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        text: string;
        blob: Blob | null;
        url: string | null;
        isRecording: boolean;
        instance: WavRecorder | null;
      }
    > = {};
    loop.key_terms.forEach((term) => {
      initial[term.id] = {
        text: term.translation?.translated_text || "",
        blob: null,
        url: term.translation?.recorded_audio_url || null,
        isRecording: false,
        instance: null,
      };
    });
    return initial;
  });

  // Key Term Audio Recording Handlers
  const startTermRecording = async (termId: string) => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      setTermTranslations((prev) => ({
        ...prev,
        [termId]: {
          ...prev[termId],
          isRecording: true,
          instance: recorder,
          blob: null,
        },
      }));
    } catch (err) {
      alert(
        "Gagal mengakses mikrofon: " +
          (err instanceof Error ? err.message : err),
      );
    }
  };

  const stopTermRecording = (termId: string) => {
    const state = termTranslations[termId];
    if (!state?.instance) return;

    const blob = state.instance.stop();
    setTermTranslations((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        isRecording: false,
        instance: null,
        blob: blob,
        url: URL.createObjectURL(blob),
      },
    }));
  };

  const handleTermTextChange = (termId: string, val: string) => {
    setTermTranslations((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        text: val,
      },
    }));
  };

  const saveTermTranslation = async (termId: string) => {
    const state = termTranslations[termId];
    if (!state) return;

    setIsSaving(true);
    try {
      const file = state.blob
        ? new File([state.blob], `term-${termId}.wav`, { type: "audio/wav" })
        : null;

      await saveKeyTermTranslation(project.id, termId, state.text, file);
      alert("Terjemahan kata kunci berhasil disimpan!");
    } catch (err) {
      alert(
        "Gagal menyimpan kata kunci: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden bg-background text-foreground select-none ${isModal ? "h-full" : "h-screen"}`}>
      <WorkspaceHeader project={project} loop={loop} isModal={isModal} onClose={onClose} />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup id="workspace-group" orientation="horizontal">
          <ResizablePanel id="editor-panel" minSize="50">
            <AudioEditor
              project={project}
              loop={loop}
              existingRecordingUrl={existingRecordingUrl}
              isKeyTermsOpen={isKeyTermsOpen}
              onToggleKeyTerms={() => {
                setIsKeyTermsOpen(!isKeyTermsOpen);
                if (!isKeyTermsOpen) setIsLogsOpen(false);
              }}
              isLogsOpen={isLogsOpen}
              onToggleLogs={() => {
                setIsLogsOpen(!isLogsOpen);
                if (!isLogsOpen) setIsKeyTermsOpen(false);
              }}
              onRefAudioStatusChange={(loaded, sliced, hasUnsaved) => {
                setIsRefAudioLoaded(loaded);
                setIsRefAudioSliced(sliced);
                setHasUnsavedRecording(hasUnsaved);
              }}
              onUploadStatusChange={(step) => {
                setUploadStep(step);
              }}
            />
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className={!isKeyTermsOpen && !isLogsOpen ? "hidden" : ""}
          />

          <ResizablePanel
            id="keyterms-panel"
            panelRef={keyTermsPanelRef}
            collapsible={true}
            collapsedSize="0"
            defaultSize="0"
            maxSize="40"
            minSize="20"
            onResize={(size, id, prevSize) => {
              const asPercentage =
                typeof size === "number"
                  ? size
                  : (size as unknown as { asPercentage: number })?.asPercentage;
              const prevPercentage =
                prevSize === undefined
                  ? undefined
                  : typeof prevSize === "number"
                    ? prevSize
                    : (prevSize as unknown as { asPercentage: number })
                        ?.asPercentage;

              if (asPercentage === 0) {
                if (prevPercentage !== undefined && prevPercentage > 0) {
                  if (isKeyTermsOpen) setIsKeyTermsOpen(false);
                  if (isLogsOpen) setIsLogsOpen(false);
                }
              } else {
                if (prevPercentage === 0 && !isKeyTermsOpen && !isLogsOpen) {
                  setIsKeyTermsOpen(true);
                }
              }
            }}
            className="bg-background flex flex-col border-l border-border"
          >
            {isKeyTermsOpen && (
              <KeyTermsPanel
                loop={loop}
                termTranslations={termTranslations}
                isSaving={isSaving}
                startTermRecording={startTermRecording}
                stopTermRecording={stopTermRecording}
                handleTermTextChange={handleTermTextChange}
                saveTermTranslation={saveTermTranslation}
              />
            )}

            {isLogsOpen && (
              <AudioLogsPanel
                loop={loop}
                isRefAudioLoaded={isRefAudioLoaded}
                isRefAudioSliced={isRefAudioSliced}
                hasUnsavedRecording={hasUnsavedRecording}
                uploadStep={uploadStep}
                existingRecordingUrl={existingRecordingUrl}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <WorkspaceFooter loop={loop} />
    </div>
  );
}
