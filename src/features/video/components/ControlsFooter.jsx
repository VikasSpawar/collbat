// frontend/src/features/video/components/ControlsFooter.jsx
import React from "react";

export default function ControlsFooter({
  micOn,
  camOn,
  screenSharing,
  showChat,
  showParticipants,
  focusScreenSharing,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleFocus,
  onEndCall,
}) {
  return (
    <footer className="flex bg-white items-center justify-center border-t border-primary/20 py-4 gap-4">
      <button
        aria-label="Toggle Microphone"
        title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        onClick={onToggleMic}
        className={`group flex h-12 w-12 items-center justify-center rounded-full ${
          micOn ? "bg-primary/10 text-primary" : "bg-red-600 text-white"
        } transition-colors hover:brightness-110`}
      >
        <span className="material-symbols-outlined">{micOn ? "mic" : "mic_off"}</span>
      </button>
      <button
        aria-label="Toggle Camera"
        title={camOn ? "Turn Camera Off" : "Turn Camera On"}
        onClick={onToggleCam}
        className={`group flex h-12 w-12 items-center justify-center rounded-full ${
          camOn ? "bg-primary/10 text-primary" : "bg-red-600 text-white"
        } transition-colors hover:brightness-110`}
      >
        <span className="material-symbols-outlined">{camOn ? "videocam" : "videocam_off"}</span>
      </button>
      <button
        aria-label="Share Screen"
        title={screenSharing ? "Stop Screen Sharing" : "Share Screen"}
        onClick={onToggleScreenShare}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        <span className="material-symbols-outlined">present_to_all</span>
      </button>
      <button
        aria-label="Toggle Chat"
        title={showChat ? "Hide Chat Sidebar" : "Show Chat Sidebar"}
        onClick={onToggleChat}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        <span className="material-symbols-outlined">chat_bubble</span>
      </button>
      <button
        aria-label="Toggle Participants"
        title={showParticipants ? "Hide Participants" : "Show Participants"}
        onClick={onToggleParticipants}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        <span className="material-symbols-outlined">groups</span>
      </button>
      <button
        aria-label="Toggle Screen Sharing Focus"
        title={focusScreenSharing ? "Show Participants Video" : "Show Screen Sharing"}
        onClick={onToggleFocus}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        <span className="material-symbols-outlined">
          {focusScreenSharing ? "videocam" : "present_to_all"}
        </span>
      </button>
      <button
        aria-label="End Call"
        title="End Call"
        onClick={onEndCall}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"
      >
        <span className="material-symbols-outlined">call_end</span>
      </button>
    </footer>
  );
}
