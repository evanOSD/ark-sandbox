"use client";

import { useRef } from "react";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { MediaPlayer, MediaPlayerRef } from "./components/MediaPlayer";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { KeyTermsPanel } from "./components/KeyTermsPanel";

import { KeyTerm, Loop, Template, Project, WorkspaceClientProps } from "@/types";

export type { KeyTerm, Loop, Template, Project, WorkspaceClientProps };

export function WorkspaceClient({
  project,
  loop,
  existingRecordingUrl,
}: WorkspaceClientProps) {
  const mediaPlayerRef = useRef<MediaPlayerRef | null>(null);

  return (
    <div className="space-y-6">
      {/* Back to Project / Header */}
      <WorkspaceHeader
        projectId={project.id}
        projectName={project.name}
        loopName={loop.name}
        startTimeMs={loop.start_time_ms}
        endTimeMs={loop.end_time_ms}
      />

      {/* Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Native Player */}
        <div className="lg:col-span-7 space-y-4">
          <MediaPlayer ref={mediaPlayerRef} project={project} loop={loop} />
        </div>

        {/* Right Column: Recording & Key Terms */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Recording Panel */}
          <VoiceRecorder
            projectId={project.id}
            loopId={loop.id}
            existingRecordingUrl={existingRecordingUrl}
            onRecordStart={() => mediaPlayerRef.current?.pause()}
          />

          {/* Key Terms Panel */}
          <KeyTermsPanel keyTerms={loop.key_terms} projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
