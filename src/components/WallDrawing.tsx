// src/components/WallDrawing.tsx
// The drawing canvas. Renders the grid, committed lines, and the live dwell indicator.

import { useRef, useEffect, useCallback } from "react";
import {
  GRID_SPACING,
  snapToGrid,
  dist,
  type Point,
  type DrawnLine,
} from "../lib/grid";

const COLORS = {
  red: "#cc0000",
  blue: "#0000cc",
  yellow: "#ccaa00",
};

const LINE_WIDTH = 1.2;
const DWELL_RADIUS = 18;

interface Props {
  lines: DrawnLine[];
  dwellPoint: Point | null; // current snapped grid point being dwelled on
  dwellProgress: number; // 0–1, drives the progress ring
  fingerPos: { x: number; y: number; visible: boolean };
}

export default function WallDrawing({
  lines,
  dwellPoint,
  dwellProgress,
  fingerPos,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "#f7f4ef";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#d8d4cc";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Committed lines
    ctx.lineWidth = LINE_WIDTH;
    for (const line of lines) {
      ctx.strokeStyle = COLORS[line.color];
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    }

    // Dwell progress ring
    if (dwellPoint && dwellProgress > 0) {
      const { x, y } = dwellPoint;

      // Dot at intersection
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Progress ring
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        DWELL_RADIUS,
        -Math.PI / 2,
        -Math.PI / 2 + dwellProgress * Math.PI * 2,
      );
      ctx.stroke();
    }

    // Crosshair cursor (only when hand visible, not over a dwell point)
    if (fingerPos.visible) {
      const cx = fingerPos.x * w;
      const cy = fingerPos.y * h;
      const snapped = snapToGrid(cx, cy);
      const near = dist({ x: cx, y: cy }, snapped) < GRID_SPACING * 0.4;

      if (!near || dwellProgress === 0) {
        ctx.strokeStyle = "rgba(26,26,26,0.35)";
        ctx.lineWidth = 1;
        const arm = 10;
        ctx.beginPath();
        ctx.moveTo(cx - arm, cy);
        ctx.lineTo(cx + arm, cy);
        ctx.moveTo(cx, cy - arm);
        ctx.lineTo(cx, cy + arm);
        ctx.stroke();
      }
    }
  }, [lines, dwellPoint, dwellProgress, fingerPos]);

  // Resize canvas to window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Redraw on every state change
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        cursor: "none",
      }}
    />
  );
}
