// src/components/Controls.tsx
import React from "react";

type ControlsProps = {
  isRecording: boolean;
  onToggle: () => void;
  statusText: string;
};

const Controls: React.FC<ControlsProps> = ({
  isRecording,
  onToggle,
  statusText,
}) => {
  return (
    <div className="controls-panel">
      <button
        className={`record-btn ${isRecording ? "recording" : ""}`}
        onClick={onToggle}
      >
        {isRecording ? "Stop" : "Start"}
      </button>
      <div className="status-indicator">
        <span className={`dot ${isRecording ? "on" : "off"}`} />
        <span>{statusText}</span>
      </div>
    </div>
  );
};

export default Controls;