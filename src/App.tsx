// src/App.tsx
// Orchestrates hand tracking, dwell detection, and drawing state.
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import { useHandTracking } from "./hooks/useHandTracking";
import WallDrawing from "./components/WallDrawing";
import {
  snapToGrid,
  dist,
  getLinesForPoint,
  type Point,
  type DrawnLine,
} from "./lib/grid";

const DWELL_DURATION = 1400; // ms to hold still before a point is selected
const DWELL_THRESHOLD = 60; // px — max movement allowed during dwell
const GRID_SNAP_RADIUS = 0.6; // fraction of GRID_SPACING to snap

// Static preview lines for the intro screen — a small fixed canvas
const PW = 300,
  PH = 260;
const PREVIEW_LINES: DrawnLine[] = [
  [60, 130],
  [0, 0],
  [0, 260],
  [300, 0],
  [300, 260],
  [150, 130],
].flatMap(([fx, fy]) => {
  const pts = [
    [80, 70],
    [200, 60],
    [240, 180],
    [100, 200],
    [160, 120],
    [50, 150],
    [270, 100],
  ];
  return pts.map(
    ([tx, ty]) =>
      ({
        from: { x: fx, y: fy },
        to: { x: tx, y: ty },
        color:
          fx === 150 && fy === 130
            ? "yellow"
            : [0, 300].includes(fx) && [0, 260].includes(fy)
              ? "blue"
              : "red",
      }) as DrawnLine,
  );
});

import { GRID_SPACING } from "./lib/grid";

type AppState = "loading" | "intro" | "drawing" | "done";

export default function App() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { fingerPos, ready, startCamera } = useHandTracking(videoRef);

  const [appState, setAppState] = useState<AppState>("loading");
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [dwellPoint, setDwellPoint] = useState<Point | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  // Dwell tracking refs (avoid stale closures in rAF)
  const dwellStart = useRef<number | null>(null);
  const dwellOrigin = useRef<Point | null>(null);
  const lastSnapped = useRef<Point | null>(null);
  const selectedPoints = useRef<Set<string>>(new Set());

  // Transition from loading once MediaPipe is ready
  useEffect(() => {
    if (ready) setAppState("intro");
  }, [ready]);

  const handleStart = useCallback(async () => {
    await startCamera();
    setAppState("drawing");
  }, [startCamera]);

  // Dwell detection loop
  useEffect(() => {
    if (appState !== "drawing" || !fingerPos.visible) {
      dwellStart.current = null;
      dwellOrigin.current = null;
      setDwellProgress(0);
      setDwellPoint(null);
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const rawX = fingerPos.x * w;
    const rawY = fingerPos.y * h;
    const snapped = snapToGrid(rawX, rawY);
    const nearGrid =
      dist({ x: rawX, y: rawY }, snapped) < GRID_SPACING * GRID_SNAP_RADIUS;

    if (!nearGrid) {
      dwellStart.current = null;
      setDwellProgress(0);
      setDwellPoint(null);
      return;
    }

    const key = `${snapped.x},${snapped.y}`;

    // Already selected this point
    if (selectedPoints.current.has(key)) {
      setDwellPoint(null);
      setDwellProgress(0);
      return;
    }

    const movedFar =
      dwellOrigin.current &&
      dist({ x: rawX, y: rawY }, dwellOrigin.current) > DWELL_THRESHOLD;

    if (!dwellOrigin.current || movedFar) {
      // Reset dwell
      dwellStart.current = performance.now();
      dwellOrigin.current = { x: rawX, y: rawY };
      lastSnapped.current = snapped;
      setDwellPoint(snapped);
      setDwellProgress(0);
      return;
    }

    // Same point — update progress
    const elapsed =
      performance.now() - (dwellStart.current ?? performance.now());
    const progress = Math.min(elapsed / DWELL_DURATION, 1);
    setDwellProgress(progress);
    setDwellPoint(snapped);

    if (progress >= 1) {
      // Commit the point
      selectedPoints.current.add(key);
      const newLines = getLinesForPoint(snapped, w, h);
      setLines((prev) => [...prev, ...newLines]);
      setDwellProgress(0);
      setDwellPoint(null);
      dwellStart.current = null;
      dwellOrigin.current = null;
    }
  }, [fingerPos, appState]);

  const handleSave = useCallback(async () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const base64 = canvas.toDataURL("image/png");

    try {
      const res = await fetch(
        "https://wall-drawing-api-581317174663.us-central1.run.app/drawings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        },
      );
      const data = await res.json();

      // Also trigger a local download
      const link = document.createElement("a");
      link.download = `wall-drawing-273-${Date.now()}.png`;
      link.href = base64;
      link.click();

      console.log("Saved to GCS:", data.url);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, []);

  const handleReset = useCallback(() => {
    setLines([]);
    setDwellPoint(null);
    setDwellProgress(0);
    dwellStart.current = null;
    dwellOrigin.current = null;
    selectedPoints.current = new Set();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Hidden webcam */}
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />

      {/* Drawing canvas — always mounted so it renders immediately on start */}
      {appState === "drawing" || appState === "done" ? (
        <WallDrawing
          lines={lines}
          dwellPoint={dwellPoint}
          dwellProgress={dwellProgress}
          fingerPos={fingerPos}
        />
      ) : null}

      {/* Loading screen */}
      {appState === "loading" && (
        <div style={styles.overlay}>
          <span style={styles.mono}>initializing —</span>
        </div>
      )}

      {/* Intro screen */}
      {appState === "intro" && (
        <div style={styles.overlay}>
          <div style={styles.introWrap}>
            <h1 style={styles.title}>Wall Drawing 273</h1>
            <div style={styles.contentRow}>
              <div style={styles.previewPane}>
                <img
                  src="/WallDrawing273.jpg"
                  alt="Wall Drawing 273"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={styles.textPane}>
                <div style={styles.quote}>
                  <q>
                    The execution was a perfunctory affair. The idea becomes a
                    machine that makes the art.
                  </q>
                  <p style={styles.body}>Sol LeWitt</p>
                </div>

                <p style={styles.body}>
                  American artist Sol LeWitt (1928–2007) was a pioneer of
                  Conceptual art, the idea that the essence of an artwork is in
                  the idea behind it, not its form. He created his Wall Drawing
                  series by writing instructions for geometric figures and
                  sending them to draftsmen, who would physically create the
                  works on walls around the world. LeWitt would never physically
                  touch these Wall Drawings, but he remains the artist behind
                  them.
                </p>
                <p style={styles.body}>
                  In this digital experience, inspired by Wall Drawing 273, you
                  will help create a unique conceptual artwork. Using your index
                  finger, point to coordinates on a grid where different colored
                  lines will meet;{" "}
                  <span style={{ color: "#0000cc" }}>blue</span> lines
                  originating from the corners of the grid,{" "}
                  <span style={{ color: "#cc0000" }}>red</span> from the
                  midpoints of the edges, and{" "}
                  <span style={{ color: "#ccaa00" }}>yellow</span> from the
                  center. Based on conceptualist thinking, are you the artist,
                  or the draftsman?
                </p>
              </div>
            </div>
            <div style={styles.bottomRow}>
              <p style={styles.callout}>
                Point your index finger at the grid.
                <br />
                Hold still on an intersection to place a point.
              </p>
              <button style={styles.button} onClick={handleStart}>
                Begin
              </button>
              <button
                style={styles.galleryLink}
                onClick={() => navigate("/gallery")}>
                view all drawings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save button — appears after first point is placed */}
      {appState === "drawing" && lines.length > 0 && (
        <button style={styles.saveBtn} onClick={handleSave}>
          save drawing
        </button>
      )}

      {/* Point count */}
      {appState === "drawing" && (
        <div style={styles.counter}>
          {selectedPoints.current.size}{" "}
          {selectedPoints.current.size === 1 ? "point" : "points"}
        </div>
      )}

      {/* Reset */}
      {appState === "drawing" && lines.length > 0 && (
        <button style={styles.resetBtn} onClick={handleReset}>
          start over
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  label: {
    fontFamily: "'Verdana', sans-serif",
    fontSize: "11px",
    letterSpacing: "0.3em",
    color: "#888",
    textTransform: "uppercase",
  },

  instruction: {
    fontFamily: "'Jost', sans-serif",
    fontStyle: "italic",
    fontSize: "16px",
    color: "#444",
    lineHeight: 1.7,
  },
  legend: {
    fontFamily: "'Verdana', sans-serif",
    fontSize: "12px",
    letterSpacing: "0.1em",
    color: "#1a1a1a",
  },
  sub: {
    fontFamily: "'Verdana', sans-serif",
    fontSize: "12px",
    color: "#888",
    lineHeight: 1.8,
    letterSpacing: "0.02em",
  },
  mono: {
    fontFamily: "'Verdana', sans-serif",
    fontSize: "12px",
    letterSpacing: "0.2em",
    color: "#888",
  },
  saveBtn: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    padding: "8px 20px",
    background: "transparent",
    border: "1px solid #1a1a1a",
    color: "#1a1a1a",
    fontFamily: "'Verdana', sans-serif",
    fontSize: "11px",
    letterSpacing: "0.15em",
    cursor: "pointer",
    zIndex: 5,
  },
  counter: {
    position: "fixed",
    bottom: "24px",
    left: "24px",
    fontFamily: "'Verdana', sans-serif",
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "#aaa",
    zIndex: 5,
  },
  resetBtn: {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 20px",
    background: "transparent",
    border: "1px solid #1a1a1a",
    color: "#1a1a1a",
    fontFamily: "'Verdana', sans-serif",
    fontSize: "11px",
    letterSpacing: "0.15em",
    cursor: "pointer",
    zIndex: 5,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "#f7f4ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    padding: "48px",
  },
  introWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    maxWidth: "900px",
    width: "100%",
  },
  title: {
    fontFamily: "'Jost', sans-serif",
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 400,
    color: "#1a1a1a",
    lineHeight: 1.1,
    textAlign: "center",
  },
  contentRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "48px",
    alignItems: "center",
  },
  previewPane: {
    width: "100%",
    aspectRatio: "1 / 0.85",
    border: "1px solid #ccc",
    overflow: "hidden",
    position: "relative",
  },
  textPane: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  body: {
    fontFamily: "'Verdana', sans-serif",
    fontSize: "12px",
    color: "#444",
    lineHeight: 1.5,
  },
  quote: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  bottomRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },
  callout: {
    fontFamily: "'Jost', sans-serif",
    fontStyle: "italic",
    fontSize: "18px",
    color: "#1a1a1a",
    lineHeight: 1.6,
    textAlign: "center",
  },
  button: {
    padding: "14px 48px",
    background: "#3a3a3a",
    border: "none",
    color: "#f7f4ef",
    fontFamily: "'Jost', sans-serif",
    fontSize: "18px",
    letterSpacing: "0.05em",
    cursor: "pointer",
    borderRadius: "4px",
  },
  galleryLink: {
    background: "transparent",
    border: "none",
    fontFamily: "'Verdana', sans-serif",
    fontSize: "11px",
    letterSpacing: "0.2em",
    color: "#888",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },
};
