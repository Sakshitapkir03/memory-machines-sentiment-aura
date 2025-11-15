// src/components/KeywordsDisplay.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Keyword } from "../types";

type KeywordsDisplayProps = {
  keywords: Keyword[];
};

const KeywordsDisplay: React.FC<KeywordsDisplayProps> = ({ keywords }) => {
  return (
    <div className="keywords-panel">
      <h2>Keywords</h2>
      <div className="keywords-cloud">
        <AnimatePresence>
          {keywords.map((kw) => (
            <motion.span
              key={kw.id}
              className="keyword-pill"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.35 }}
            >
              {kw.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KeywordsDisplay;