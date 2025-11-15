

interface ControlsProps {
  isRecording: boolean;
  onToggle: () => void;
  statusText: string;
  onClear: () => void; // Clear handler passed from App
}

export default function Controls({
  isRecording,
  onToggle,
  statusText,
  onClear,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls-buttons">
        <button
          className={`primary-btn ${isRecording ? "stop" : "start"}`}
          onClick={onToggle}
        >
          {isRecording ? "Stop" : "Start"}
        </button>

        <button
          className="secondary-btn clear-btn"
          onClick={onClear}
          
        >
          Clear
        </button>
      </div>

      <div className="controls-status">
        <span>Status: {statusText}</span>
      </div>
    </div>
  );
}