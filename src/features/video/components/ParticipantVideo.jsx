// frontend/src/features/video/components/ParticipantVideo.jsx
import React, { useRef, useEffect } from "react";

export default function ParticipantVideo({ stream, isLocal, hidden = false, isMain = false }) {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream && !hidden) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hidden]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={`rounded object-cover transition-opacity duration-300 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        width: isMain ? "100%" : "calc(33.33% - 10px)",
        height: isMain ? "100%" : "200px",
      }}
    />
  );
}
