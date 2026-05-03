/**
 * Bridson's Poisson-disc sampler.
 *
 * Generates blue-noise distributed points in a rectangle: every pair of
 * points is at least `radius` apart, but no farther than necessary. Output
 * looks organic — neither a grid nor pure random — and is the canonical
 * distribution for stippling, halftone screens, and visually-uniform texture.
 *
 * Reference: Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions"
 * (SIGGRAPH 2007).
 *
 * This is a synchronous, deterministic-when-seeded implementation suitable
 * for both server render (RSC) and client render. Cost is O(n) for n points;
 * a 600×600 field at radius 7 emits ~6k points in <10ms.
 */

export type Point = { x: number; y: number };

export type PoissonOptions = {
  /** Region to fill, in user units. */
  width: number;
  height: number;
  /** Minimum distance between any two points. */
  radius: number;
  /** Candidates per active point (Bridson's k; 30 is the canonical value). */
  k?: number;
  /** Deterministic seed. */
  seed?: number;
};

export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function poissonDisc({
  width,
  height,
  radius,
  k = 30,
  seed = 1,
}: PoissonOptions): Point[] {
  const rand = mulberry32(seed);
  const cellSize = radius / Math.SQRT2;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const grid: (Point | null)[] = new Array(cols * rows).fill(null);
  const cellOf = (p: Point) =>
    ((p.y / cellSize) | 0) * cols + ((p.x / cellSize) | 0);

  const fits = (p: Point) => {
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) return false;
    const cx = (p.x / cellSize) | 0;
    const cy = (p.y / cellSize) | 0;
    const r2 = radius * radius;
    for (let dy = -2; dy <= 2; dy++) {
      const yy = cy + dy;
      if (yy < 0 || yy >= rows) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const xx = cx + dx;
        if (xx < 0 || xx >= cols) continue;
        const n = grid[yy * cols + xx];
        if (!n) continue;
        const ddx = n.x - p.x;
        const ddy = n.y - p.y;
        if (ddx * ddx + ddy * ddy < r2) return false;
      }
    }
    return true;
  };

  const seedPoint: Point = { x: rand() * width, y: rand() * height };
  const active: Point[] = [seedPoint];
  const out: Point[] = [seedPoint];
  grid[cellOf(seedPoint)] = seedPoint;

  while (active.length) {
    const idx = (rand() * active.length) | 0;
    const p = active[idx];
    let placed = false;
    for (let i = 0; i < k; i++) {
      const a = rand() * Math.PI * 2;
      const r = radius * (1 + rand());
      const cand: Point = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
      if (fits(cand)) {
        grid[cellOf(cand)] = cand;
        active.push(cand);
        out.push(cand);
        placed = true;
        break;
      }
    }
    if (!placed) {
      active.splice(idx, 1);
    }
  }

  return out;
}
