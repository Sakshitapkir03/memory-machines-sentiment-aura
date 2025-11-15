# # server/main.py
# import os
# import json
# from typing import List

# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from dotenv import load_dotenv
# from openai import OpenAI

# # Load variables from .env
# load_dotenv()

# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# if not OPENAI_API_KEY:
#   raise RuntimeError("OPENAI_API_KEY is not set in .env")

# client = OpenAI(api_key=OPENAI_API_KEY)

# app = FastAPI(title="Sentiment Aura Backend")

# # Allow requests from the React dev server
# origins = [
#   "http://localhost:5173",
#   "http://127.0.0.1:5173",
# ]

# app.add_middleware(
#   CORSMiddleware,
#   allow_origins=origins,
#   allow_credentials=True,
#   allow_methods=["*"],
#   allow_headers=["*"],
# )


# # ---------- Data models ----------

# class ProcessTextRequest(BaseModel):
#   text: str


# class ProcessTextResponse(BaseModel):
#   sentiment_score: float  # 0..1
#   sentiment_label: str    # "negative", "neutral", "positive"
#   keywords: List[str]


# # ---------- Routes ----------

# @app.get("/health")
# def health():
#   return {"status": "ok"}


# @app.post("/process_text", response_model=ProcessTextResponse)
# def process_text(payload: ProcessTextRequest):
#   """
#   Accepts a text snippet and returns:
#   - sentiment_score (0..1)
#   - sentiment_label (negative/neutral/positive)
#   - keywords (3-6 short phrases)
#   """
#   if not payload.text.strip():
#     raise HTTPException(status_code=400, detail="Text must not be empty.")

#   system_prompt = """
# You are a JSON-only sentiment and keyword extraction service.

# Given a short transcript from a human conversation, analyse the overall emotion
# and extract a few high-level topics.

# Return ONLY valid JSON in this exact shape:

# {
#   "sentiment_score": <float between 0 and 1>,
#   "sentiment_label": "<one of: negative, neutral, positive>",
#   "keywords": ["<keyword1>", "<keyword2>", "..."]
# }

# Rules:
# - sentiment_score: 0.0 = extremely negative, 1.0 = extremely positive, 0.5 = neutral.
# - Use 3 to 6 keywords max.
# - Keywords should be concise nouns or noun phrases.
# - Do NOT include explanations or any other keys.
# """.strip()

#   try:
#     completion = client.chat.completions.create(
#       model="gpt-4o-mini",        # adjust if needed
#       response_format={"type": "json_object"},
#       messages=[
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": payload.text},
#       ],
#       temperature=0.2,
#     )
#   except Exception as e:
#     raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")

#   try:
#     content = completion.choices[0].message.content
#     data = json.loads(content)

#     sentiment_score = float(data.get("sentiment_score", 0.5))
#     sentiment_label = str(data.get("sentiment_label", "neutral"))
#     keywords = data.get("keywords", [])

#     if not isinstance(keywords, list):
#       keywords = []

#     # Clamp to [0, 1]
#     if sentiment_score < 0.0:
#       sentiment_score = 0.0
#     if sentiment_score > 1.0:
#       sentiment_score = 1.0

#     return ProcessTextResponse(
#       sentiment_score=sentiment_score,
#       sentiment_label=sentiment_label,
#       keywords=[str(k).strip() for k in keywords if str(k).strip()],
#     )
#   except Exception as e:
#     raise HTTPException(status_code=500, detail=f"Failed to parse LLM JSON: {e}")


# server/main.py
import json
import os
import re
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title="Memory Machines Sentiment Aura Backend")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessTextRequest(BaseModel):
    text: str


class ProcessTextResponse(BaseModel):
    sentiment_score: float
    sentiment_label: str
    keywords: List[str]


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Local fallback analysis ----------

POSITIVE_WORDS = [
    "good", "great", "awesome", "love", "happy", "excited",
    "wonderful", "amazing", "positive", "fantastic", "enjoy",
    "proud", "hopeful", "confident",
]

NEGATIVE_WORDS = [
    "bad", "terrible", "awful", "hate", "sad", "angry", "upset",
    "worried", "nervous", "stressed", "anxious", "negative",
    "frustrated", "tired",
]


def local_sentiment(text: str) -> float:
    text_low = text.lower()
    pos = sum(1 for w in POSITIVE_WORDS if w in text_low)
    neg = sum(1 for w in NEGATIVE_WORDS if w in text_low)
    if pos == 0 and neg == 0:
        return 0.5
    raw = (pos - neg) / max(pos + neg, 1)  # [-1,1]
    score = (raw + 1) / 2                  # [0,1]
    return max(0.0, min(1.0, score))


def local_keywords(text: str, max_keywords: int = 8) -> List[str]:
    clean = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    words = [w for w in clean.split() if len(w) > 3]

    stop = {
        "this", "that", "with", "have", "about", "really", "very",
        "today", "just", "like", "been", "from", "your", "they",
        "them", "then", "there", "here", "over", "into", "onto",
        "because", "would", "could", "should", "where", "when",
        "also", "more", "some", "such",
    }

    freq = {}
    for w in words:
        if w in stop:
            continue
        freq[w] = freq.get(w, 0) + 1

    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [w for (w, _) in sorted_words[:max_keywords]]


def build_response_from_score_and_text(score: float, text: str) -> ProcessTextResponse:
    if score > 0.65:
        label = "positive"
    elif score < 0.35:
        label = "negative"
    else:
        label = "neutral"

    kws = local_keywords(text)
    return ProcessTextResponse(
        sentiment_score=score,
        sentiment_label=label,
        keywords=kws,
    )


SYSTEM_PROMPT = """
You are an analysis engine for short snippets of conversation.

Given a piece of user speech, your ONLY job is to return:
- sentiment_score: a float between 0.0 and 1.0
- sentiment_label: "negative", "neutral", or "positive"
- keywords: an array of 2-8 concise, meaningful keywords (no stopwords)

Rules:
- sentiment_score < 0.35 => "negative"
- 0.35 <= sentiment_score <= 0.65 => "neutral"
- sentiment_score > 0.65 => "positive"
- Always return valid JSON only. No extra commentary.
""".strip()


@app.post("/process_text", response_model=ProcessTextResponse)
def process_text(payload: ProcessTextRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty.")

    # If we don't even have an API key or client, just use local fallback.
    if client is None or not OPENAI_API_KEY:
        score = local_sentiment(text)
        return build_response_from_score_and_text(score, text)

    # Try OpenAI first; on error (incl. insufficient_quota) fall back to local.
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
        )
        raw = completion.choices[0].message.content
        data = json.loads(raw)

        score = float(data.get("sentiment_score", 0.5))
        label = str(data.get("sentiment_label", "neutral")).lower()
        kws = data.get("keywords", [])

        if score < 0.0 or score > 1.0:
            score = 0.5

        if label not in ("negative", "neutral", "positive"):
            if score > 0.65:
                label = "positive"
            elif score < 0.35:
                label = "negative"
            else:
                label = "neutral"

        if not isinstance(kws, list):
            kws = []

        keywords: List[str] = []
        seen = set()
        for k in kws:
            if not isinstance(k, str):
                continue
            s = k.strip()
            if len(s) < 2:
                continue
            low = s.lower()
            if low in seen:
                continue
            seen.add(low)
            keywords.append(s)
            if len(keywords) >= 8:
                break

        # If LLM gave us nothing useful, fall back to local keywords.
        if not keywords:
            keywords = local_keywords(text)

        return ProcessTextResponse(
            sentiment_score=score,
            sentiment_label=label,
            keywords=keywords,
        )

    except Exception as e:
        # Log server-side if you want, but don't break the app.
        print("OpenAI failed, falling back to local sentiment:", e)
        score = local_sentiment(text)
        return build_response_from_score_and_text(score, text)