// src/components/AuraCanvas.tsx
import React from "react";
import Sketch from "react-p5";
import type p5Type from "p5";

type AuraCanvasProps = {
  sentimentScore: number; // 0..1
};

const AuraCanvas: React.FC<AuraCanvasProps> = ({ sentimentScore }) => {
  let zOffset = 0;

  const setup = (p5: p5Type, canvasParentRef: Element) => {
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(
      canvasParentRef
    );
    p5.colorMode(p5.HSB, 360, 100, 100, 100);
    p5.noiseDetail(2, 0.4);
  };

  const draw = (p5: p5Type) => {
    p5.background(0, 0, 0, 8);

    const cols = 80;
    const rows = 50;

    const cellW = p5.width / cols;
    const cellH = p5.height / rows;

    const hue = p5.map(sentimentScore, 0, 1, 0, 200);
    const speed = p5.map(sentimentScore, 0, 1, 0.002, 0.01);
    const strokeAlpha = p5.map(sentimentScore, 0, 1, 25, 80);

    p5.stroke(hue, 80, 100, strokeAlpha);
    p5.strokeWeight(1.5);

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const xPos = x * cellW;
        const yPos = y * cellH;

        const n = p5.noise(x * 0.05, y * 0.05, zOffset);
        const angle = n * p5.TAU;

        const x2 = xPos + cellW * 1.5 * Math.cos(angle);
        const y2 = yPos + cellH * 1.5 * Math.sin(angle);

        p5.line(xPos, yPos, x2, y2);
      }
    }

    zOffset += speed;
  };

  return <Sketch setup={setup} draw={draw} />;
};

export default AuraCanvas;