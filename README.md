# Wall Drawing 273

A digital interpretation of Sol LeWitt's *Wall Drawing 273* (1975).

> Lines from corners, sides, and center of the walls to random points on the grid.
> Wall 7: Red lines from the midpoints of four sides, blue lines from four corners, yellow lines from the center.
> The number of lines and their length are determined by the draftsman.

You are the draftsman. Your hand completes the work.

---

## How it works

- A 6" grid covers the screen (scaled proportionally)
- Three sets of source points are fixed by LeWitt's instructions:
  - **Red** — midpoints of the four sides
  - **Blue** — four corners
  - **Yellow** — center
- Point your index finger at any grid intersection and hold still for 1 second
- All 9 source points draw a line to your chosen destination simultaneously
- Keep selecting points until the wall feels complete
- Save your drawing as a PNG

---

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 — allow webcam access when prompted.

---

## Stack

- React + TypeScript
- MediaPipe HandLandmarker (hand tracking)
- HTML Canvas API (drawing)
- Vite

No backend. No API keys. The piece runs entirely in the browser.

---

## Project structure

```
wall-drawing-273/
├── src/
│   ├── components/
│   │   └── WallDrawing.tsx     # Canvas renderer
│   ├── hooks/
│   │   └── useHandTracking.ts  # MediaPipe wrapper
│   ├── lib/
│   │   └── grid.ts             # Grid geometry + line logic
│   ├── App.tsx                 # State orchestration
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
└── tsconfig.json
```

---

## Notes

Each session produces a unique drawing — the same instructions, different hands, different choices. This is the LeWitt method: the idea is the machine that makes the art.
