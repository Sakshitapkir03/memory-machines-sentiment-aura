
import { useEffect, useRef, useState } from "react";
import axios from "axios";

import AuraCanvas from "./components/AuraCanvas";
import TranscriptDisplay from "./components/TranscriptDisplay";
import KeywordsDisplay from "./components/KeywordsDisplay";
import Controls from "./components/Controls";

import type { AuraSentiment, Keyword } from "./types";
import "./App.css";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Idle");
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<AuraSentiment>({
    score: 0.5,
    label: "neutral",
  });
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  const recognitionRef = useRef<any | null>(null);

  const cleanupRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };
    const handleClear = () => {
    console.log("Clear clicked – resetting transcript and keywords");
    setTranscriptLines([]);
    setKeywords([]);
    // Optional: reset sentiment too:
    setSentiment({ score: 0.5, label: "neutral" });
    setStatusText("Idle"); // optional
  };
  const handleToggleRecording = () => {
    console.log("handleToggleRecording, isRecording =", isRecording);

    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setStatusText("Stopping...");
      cleanupRecognition();
      setStatusText("Idle");
      return;
    }

    // Start recording using browser Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Your browser does not support Web Speech API (SpeechRecognition). Please try in Chrome."
      );
      return;
    }

    const recognition: any = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setStatusText("Listening...");
      setIsRecording(true);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      setStatusText("Speech recognition error");
      setIsRecording(false);
      cleanupRecognition();
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setStatusText("Idle");
      setIsRecording(false);
      cleanupRecognition();
    };

    recognition.onresult = async (event: any) => {
      const lastIndex = event.results.length - 1;
      const result = event.results[lastIndex];
      const text = result[0].transcript.trim();

      if (!text) return;

      console.log("Recognition result:", text);
      setTranscriptLines((prev) => [...prev, text]);

      try {
        const response = await axios.post(`${BACKEND_URL}/process_text`, {
          text,
        });

        const data = response.data as {
          sentiment_score: number;
          sentiment_label: string;
          keywords: string[];
        };

        setSentiment({
          score: data.sentiment_score,
          label: data.sentiment_label,
        });

        setKeywords((prev) => {
          const newOnes: Keyword[] = data.keywords.map((kw) => ({
            id: `${kw}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: kw,
          }));

          const combined = [...prev, ...newOnes];
          const seen = new Set<string>();
          const deduped: Keyword[] = [];
          for (const k of combined.reverse()) {
            const lower = k.text.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              deduped.push(k);
            }
          }
          return deduped.reverse().slice(-15);
        });
      } catch (err) {
        console.error("Backend /process_text failed", err);
        setStatusText("LLM analysis error (still listening)");
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start recognition", err);
      setStatusText("Could not start speech recognition");
    }
  };

  useEffect(() => {
    console.log("App mounted");
    return () => {
      console.log("App unmounting");
      cleanupRecognition();
    };
    
  }, []);

  return (
    <div className="app-root">
      <div className="aura-layer">
        <AuraCanvas sentimentScore={sentiment.score} />
      </div>

      <div className="ui-overlay">
        <div className="top-row">
          <TranscriptDisplay lines={transcriptLines} />
          <KeywordsDisplay keywords={keywords} />
        </div>

        <div className="bottom-row">
          <Controls
            isRecording={isRecording}
            onToggle={handleToggleRecording}
            statusText={statusText}
            onClear={handleClear}
          />
          <div className="sentiment-badge">
            <span className="label">Sentiment</span>
            <span className={`value ${sentiment.label}`}>
              {sentiment.label} ({sentiment.score.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
