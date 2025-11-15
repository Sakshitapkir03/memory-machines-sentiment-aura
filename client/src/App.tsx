// // src/App.tsx
// import { useEffect, useRef, useState } from "react";
// import axios from "axios";

// import AuraCanvas from "./components/AuraCanvas";
// import TranscriptDisplay from "./components/TranscriptDisplay";
// import KeywordsDisplay from "./components/KeywordsDisplay";
// import Controls from "./components/Controls";

// import type { AuraSentiment, Keyword } from "./types";
// import "./App.css";

// const BACKEND_URL =
//   import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
// const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

// function App() {
//   const [isRecording, setIsRecording] = useState(false);
//   const [statusText, setStatusText] = useState("Idle");
//   const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
//   const [sentiment, setSentiment] = useState<AuraSentiment>({
//     score: 0.5,
//     label: "neutral",
//   });
//   const [keywords, setKeywords] = useState<Keyword[]>([]);

//   const socketRef = useRef<WebSocket | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const keepAliveIntervalRef = useRef<number | null>(null);

//   const cleanup = () => {
//     if (keepAliveIntervalRef.current !== null) {
//       window.clearInterval(keepAliveIntervalRef.current);
//       keepAliveIntervalRef.current = null;
//     }

//     if (
//       mediaRecorderRef.current &&
//       mediaRecorderRef.current.state !== "inactive"
//     ) {
//       try {
//         mediaRecorderRef.current.stop();
//       } catch {
//         // ignore
//       }
//     }

//     if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//       socketRef.current.close();
//     }

//     socketRef.current = null;
//     mediaRecorderRef.current = null;
//   };

//   const handleToggleRecording = async () => {
//     if (isRecording) {
//       setIsRecording(false);
//       setStatusText("Stopping...");
//       cleanup();
//       setStatusText("Idle");
//       return;
//     }

//     if (!DEEPGRAM_API_KEY) {
//       alert("Missing VITE_DEEPGRAM_API_KEY in frontend .env");
//       return;
//     }

//     try {
//       setStatusText("Requesting microphone...");
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

//       const socketUrl =
//         "wss://api.deepgram.com/v1/listen?encoding=opus&sample_rate=48000";

//       console.log("Opening Deepgram WebSocket...");
//       const socket = new WebSocket(socketUrl, ["token", DEEPGRAM_API_KEY]);
//       socketRef.current = socket;

//       socket.onopen = () => {
//         console.log("Deepgram WebSocket opened (using default config)");
//         setStatusText("Connected to Deepgram");

//         let mediaRecorder: MediaRecorder;
//         try {
//           mediaRecorder = new MediaRecorder(stream, {
//             mimeType: "audio/webm;codecs=opus",
//           });
//         } catch (e) {
//           console.error("MediaRecorder init failed, trying without options", e);
//           mediaRecorder = new MediaRecorder(stream);
//         }

//         mediaRecorderRef.current = mediaRecorder;

//         mediaRecorder.addEventListener("start", () => {
//           console.log("MediaRecorder started");
//         });

//         mediaRecorder.addEventListener("dataavailable", (event) => {
//           if (
//             event.data.size > 0 &&
//             socketRef.current &&
//             socketRef.current.readyState === WebSocket.OPEN
//           ) {
//             socketRef.current.send(event.data);
//           }
//         });

//         mediaRecorder.addEventListener("stop", () => {
//           console.log("MediaRecorder stopped");
//         });

//         // send chunks every 250ms
//         mediaRecorder.start(250);

//         // Keepalive ping so Deepgram doesn't time out
//         keepAliveIntervalRef.current = window.setInterval(() => {
//           if (socketRef.current?.readyState === WebSocket.OPEN) {
//             socketRef.current.send(JSON.stringify({ type: "KeepAlive" }));
//           }
//         }, 4000);

//         setIsRecording(true);
//         setStatusText("Listening...");
//       };

//       socket.onerror = (err) => {
//         console.error("Deepgram WebSocket error", err);
//         setStatusText("Transcription error");
//         cleanup();
//         setIsRecording(false);
//       };

//       socket.onclose = (event) => {
//         console.log(
//           "Deepgram WebSocket closed:",
//           event.code,
//           event.reason || "<no reason>"
//         );
//         setStatusText(`Disconnected from Deepgram (code ${event.code})`);
//         cleanup();
//         setIsRecording(false);
//       };

//       socket.onmessage = async (message) => {
//         try {
//           console.log("Deepgram message:", message.data);
//           const received = JSON.parse(message.data as string);

//           // Ignore non-result messages
//           if (received.type && received.type !== "Results") {
//             return;
//           }

//           const alt = received.channel?.alternatives?.[0];
//           const transcript: string | undefined = alt?.transcript;

//           if (!transcript || transcript.trim().length === 0) {
//             return;
//           }

//           const finalText = transcript.trim();
//           console.log("Final transcript:", finalText);
//           setTranscriptLines((prev) => [...prev, finalText]);

//           try {
//             const response = await axios.post(`${BACKEND_URL}/process_text`, {
//               text: finalText,
//             });

//             const data = response.data as {
//               sentiment_score: number;
//               sentiment_label: string;
//               keywords: string[];
//             };

//             setSentiment({
//               score: data.sentiment_score,
//               label: data.sentiment_label,
//             });

//             setKeywords((prev) => {
//               const newOnes: Keyword[] = data.keywords.map((kw) => ({
//                 id: `${kw}-${Date.now()}-${Math.random()
//                   .toString(36)
//                   .slice(2)}`,
//                 text: kw,
//               }));

//               const combined = [...prev, ...newOnes];
//               const seen = new Set<string>();
//               const deduped: Keyword[] = [];
//               for (const k of combined.reverse()) {
//                 const lower = k.text.toLowerCase();
//                 if (!seen.has(lower)) {
//                   seen.add(lower);
//                   deduped.push(k);
//                 }
//               }
//               return deduped.reverse().slice(-15);
//             });
//           } catch (err) {
//             console.error("Backend /process_text failed", err);
//             setStatusText("LLM analysis error (still listening)");
//           }
//         } catch (err) {
//           console.error("Failed to parse Deepgram message", err);
//         }
//       };
//     } catch (err) {
//       console.error(err);
//       setStatusText("Microphone access denied or failed");
//     }
//   };

//   useEffect(() => {
//     return () => {
//       cleanup();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <div className="app-root">
//       <div className="aura-layer">
//         <AuraCanvas sentimentScore={sentiment.score} />
//       </div>

//       <div className="ui-overlay">
//         <div className="top-row">
//           <TranscriptDisplay lines={transcriptLines} />
//           <KeywordsDisplay keywords={keywords} />
//         </div>

//         <div className="bottom-row">
//           <Controls
//             isRecording={isRecording}
//             onToggle={handleToggleRecording}
//             statusText={statusText}
//           />
//           <div className="sentiment-badge">
//             <span className="label">Sentiment</span>
//             <span className={`value ${sentiment.label}`}>
//               {sentiment.label} ({sentiment.score.toFixed(2)})
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;

// src/App.tsx
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
