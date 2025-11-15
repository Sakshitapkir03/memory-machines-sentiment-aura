# Sentiment Aura – Memory Machines Full-Stack Take-Home

This project implements a voice-first companion that listens to speech, transcribes it in real time, analyzes the emotional tone, and renders a dynamic visual “aura” that reflects the speaker’s state.

The focus is on orchestrating:
- **Live transcription** using Deepgram’s streaming WebSocket API
- **Sentiment + semantic analysis** via an LLM-backed FastAPI service with a robust local fallback
- **Generative visualization** in the frontend driven by the analysis output

---

## 1. Architecture Overview

**Frontend (client/)**  
- React + Vite + TypeScript  
- Uses **Deepgram streaming** to transcribe microphone audio in real time  
- Displays:
  - Live transcript of utterances
  - Extracted keywords
  - Sentiment label + score
  - Animated “aura” that reacts to sentiment score  

**Backend (server/)**  
- FastAPI (Python)  
- Endpoint: `POST /process_text`  
  - Input: `{ "text": "..." }`  
  - Output:
    ```json
    {
      "sentiment_score": 0.0 - 1.0,
      "sentiment_label": "negative" | "neutral" | "positive",
      "keywords": ["keyword1", "keyword2", "..."]
    }
    ```
- Analysis strategy:
  - Tries to call **OpenAI** (`gpt-4o-mini`) for richer semantic analysis.
  - If OpenAI is unavailable (e.g., `insufficient_quota`), it falls back to a **local sentiment + keyword extractor** so the demo always works.

---

## 2. Local Setup

### 2.1 Prerequisites

- Node.js (v18+)
- Python 3.10+ (i am using 3.13.1)
- npm (comes with Node)
- A Deepgram API key
- (recommended) An OpenAI API key with quota

---

### 2.2 Environment Variables

#### `client/.env`

Create the file:

```bash
cd client
touch .env