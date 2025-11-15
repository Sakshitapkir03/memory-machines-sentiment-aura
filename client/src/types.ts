// src/types.ts
export type AuraSentiment = {
  score: number; // 0..1
  label: "negative" | "neutral" | "positive" | string;
};

export type Keyword = {
  id: string;
  text: string;
};