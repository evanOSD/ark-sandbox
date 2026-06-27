"use client";

import { useState, useRef, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PanelImperativeHandle } from "react-resizable-panels";
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

  return (
    <div className={`flex flex-col overflow-hidden bg-background text-foreground select-none ${isModal ? "h-full" : "h-screen"}`}>
      <WorkspaceHeader project={project} isModal={isModal} onClose={onClose} />

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
    </div>
  );
}
