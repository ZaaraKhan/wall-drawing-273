// src/lib/grid.ts
// All geometry logic for Wall Drawing 273, Wall 7.

export const GRID_SPACING = 60 // px — proportional stand-in for LeWitt's 6"

export interface Point {
  x: number
  y: number
}

// Snap a raw pixel position to the nearest grid intersection
export function snapToGrid(x: number, y: number): Point {
  return {
    x: Math.round(x / GRID_SPACING) * GRID_SPACING,
    y: Math.round(y / GRID_SPACING) * GRID_SPACING,
  }
}

// Distance between two points
export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

// The 9 source points for Wall 7, computed from canvas dimensions
export function getSourcePoints(w: number, h: number) {
  // Snap sources to nearest grid point for precision
  const snap = (x: number, y: number) => snapToGrid(x, y)

  return {
    // Red: midpoints of four sides
    red: [
      snap(w / 2, 0),       // top
      snap(w / 2, h),       // bottom
      snap(0, h / 2),       // left
      snap(w, h / 2),       // right
    ] as Point[],

    // Blue: four corners
    blue: [
      snap(0, 0),           // top-left
      snap(w, 0),           // top-right
      snap(0, h),           // bottom-left
      snap(w, h),           // bottom-right
    ] as Point[],

    // Yellow: center
    yellow: [
      snap(w / 2, h / 2),
    ] as Point[],
  }
}

// A completed line to be drawn on canvas
export interface DrawnLine {
  from: Point
  to: Point
  color: 'red' | 'blue' | 'yellow'
}

// Given a destination point, return all 9 lines that should be drawn
export function getLinesForPoint(dest: Point, w: number, h: number): DrawnLine[] {
  const sources = getSourcePoints(w, h)
  const lines: DrawnLine[] = []

  for (const from of sources.red) {
    lines.push({ from, to: dest, color: 'red' })
  }
  for (const from of sources.blue) {
    lines.push({ from, to: dest, color: 'blue' })
  }
  for (const from of sources.yellow) {
    lines.push({ from, to: dest, color: 'yellow' })
  }

  return lines
}
