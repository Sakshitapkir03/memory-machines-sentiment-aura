// src/components/TranscriptDisplay.tsx
import React, { useEffect, useRef } from "react";

type TranscriptDisplayProps = {
  lines: string[];
};

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ lines }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="transcript-panel" ref={containerRef}>
      <h2>Live Transcript</h2>
      <div className="transcript-content">
        {lines.length === 0 ? (
          <span className="transcript-placeholder">
            Start speaking to see the transcript...
          </span>
        ) : (
          lines.map((line, idx) => (
            <p key={idx} className="transcript-line">
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
};

export default TranscriptDisplay;