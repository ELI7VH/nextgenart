// smoke — Sobel gradient flow field particle system
// loads a photo, extracts edge tangents via Sobel operator,
// runs particles along those curves with atmospheric decay.
// falls back to Perlin-style noise field if no image is available.

declare global {
  interface Window {
    dankstore: {
      get(key?: string): any
      set(key: string, value: any): void
      register(schema: Record<string, { type: string; default: any; parse?: (v: string) => any; min?: number; max?: number }>): void
    }
  }
}

// ─── config ──────────────────────────────────────────────────────────────────

const COLS = 120
const ROWS = 120

interface Config {
  nParticles: number
  speed: number
  decayAlpha: number    // 0–255: higher = faster clear, shorter trails
  imageAlpha: number    // 0–1: photo underlay opacity
  particleAlpha: number // 0–255 used in rgba
}

const defaults: Config = {
  nParticles: 3000,
  speed: 2.2,
  decayAlpha: 10,
  imageAlpha: 0.10,
  particleAlpha: 6,
}

// ─── state ───────────────────────────────────────────────────────────────────

const canvas = document.getElementById('c') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const debug = document.getElementById('debug')!

let field: { x: number; y: number }[][] = []
let particles: { x: number; y: number; px: number; py: number; vx: number; vy: number }[] = []
let imgPixels: ImageData | null = null
let imgEl: HTMLImageElement | null = null
let cfg: Config = { ...defaults }
let usingImage = false

// ─── helpers ─────────────────────────────────────────────────────────────────

const W = () => canvas.width
const H = () => canvas.height

// pseudo-noise: deterministic but visually smooth enough for a noise field
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return n - Math.floor(n)
}
const noise = (x: number, y: number) => {
  const ix = Math.floor(x); const iy = Math.floor(y)
  const fx = x - ix;        const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix,     iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix,     iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy
}

// ─── flow field builders ─────────────────────────────────────────────────────

const buildFieldNoise = () => {
  field = Array.from({ length: COLS }, (_, col) =>
    Array.from({ length: ROWS }, (_, row) => {
      const angle = noise(col * 0.08, row * 0.08) * Math.PI * 4
      return { x: Math.cos(angle), y: Math.sin(angle) }
    })
  )
}

const buildFieldFromImage = (pixels: ImageData) => {
  const { width: iw, height: ih, data } = pixels

  const gray = (px: number, py: number): number => {
    const cx = Math.min(Math.max(Math.round(px), 0), iw - 1)
    const cy = Math.min(Math.max(Math.round(py), 0), ih - 1)
    const i = (cy * iw + cx) * 4
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }

  field = Array.from({ length: COLS }, (_, col) =>
    Array.from({ length: ROWS }, (_, row) => {
      const ix = (col / COLS) * iw
      const iy = (row / ROWS) * ih

      // Sobel X
      const gx =
        -gray(ix - 1, iy - 1) + gray(ix + 1, iy - 1) +
        -2 * gray(ix - 1, iy)  + 2 * gray(ix + 1, iy)  +
        -gray(ix - 1, iy + 1) + gray(ix + 1, iy + 1)

      // Sobel Y
      const gy =
        -gray(ix - 1, iy - 1) - 2 * gray(ix, iy - 1) - gray(ix + 1, iy - 1) +
         gray(ix - 1, iy + 1) + 2 * gray(ix, iy + 1) + gray(ix + 1, iy + 1)

      // rotate 90° → tangent vector (along edges, not across them)
      const len = Math.sqrt(gx * gx + gy * gy) || 1
      return { x: -gy / len, y: gx / len }
    })
  )
}

// ─── particle color ──────────────────────────────────────────────────────────

const particleColor = (px: number, py: number): string => {
  if (!imgPixels || !imgEl) return `rgba(210, 225, 255, ${cfg.particleAlpha / 255})`

  const { width: iw, height: ih, data } = imgPixels
  const ix = Math.min(Math.max(Math.round((px / W()) * iw), 0), iw - 1)
  const iy = Math.min(Math.max(Math.round((py / H()) * ih), 0), ih - 1)
  const i = (iy * iw + ix) * 4
  // slightly brighten so trails read against dim bg
  const r = Math.min(data[i]     + 40, 255)
  const g = Math.min(data[i + 1] + 40, 255)
  const b = Math.min(data[i + 2] + 60, 255)
  return `rgba(${r}, ${g}, ${b}, ${cfg.particleAlpha / 255})`
}

// ─── particle system ─────────────────────────────────────────────────────────

const spawnParticle = () => {
  const x = Math.random() * W()
  const y = Math.random() * H()
  return { x, y, px: x, py: y, vx: 0, vy: 0 }
}

const tick = () => {
  // atmospheric decay
  ctx.fillStyle = `rgba(0, 0, 0, ${cfg.decayAlpha / 255})`
  ctx.fillRect(0, 0, W(), H())

  for (const p of particles) {
    const col = Math.min(Math.max(Math.floor((p.x / W()) * COLS), 0), COLS - 1)
    const row = Math.min(Math.max(Math.floor((p.y / H()) * ROWS), 0), ROWS - 1)
    const f = field[col]?.[row]
    if (!f) continue

    p.vx = p.vx * 0.94 + f.x * 0.25
    p.vy = p.vy * 0.94 + f.y * 0.25

    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (spd > cfg.speed) { p.vx = (p.vx / spd) * cfg.speed; p.vy = (p.vy / spd) * cfg.speed }

    p.px = p.x; p.py = p.y
    p.x  += p.vx; p.y  += p.vy

    if (p.x < 0 || p.x > W() || p.y < 0 || p.y > H()) {
      Object.assign(p, spawnParticle())
      continue
    }

    ctx.beginPath()
    ctx.moveTo(p.px, p.py)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = usingImage ? particleColor(p.x, p.y) : `rgba(200, 218, 255, ${cfg.particleAlpha / 255})`
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  requestAnimationFrame(tick)
}

// ─── image loader ─────────────────────────────────────────────────────────────

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = url
  })

const drawImageUnderlay = (img: HTMLImageElement) => {
  ctx.save()
  ctx.globalAlpha = cfg.imageAlpha
  ctx.drawImage(img, 0, 0, W(), H())
  ctx.restore()
}

// ─── resize ───────────────────────────────────────────────────────────────────

const resize = () => {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W(), H())
  if (imgEl) drawImageUnderlay(imgEl)
}

// ─── init ─────────────────────────────────────────────────────────────────────

const init = async () => {
  // wait for dankstore
  await new Promise<void>(resolve => {
    if (window.dankstore) return resolve()
    const t = setInterval(() => { if (window.dankstore) { clearInterval(t); resolve() } }, 10)
  })

  window.dankstore.register({
    particles:    { type: 'range', min: 500,  max: 6000, default: cfg.nParticles,    parse: Number },
    speed:        { type: 'range', min: 0.5,  max: 6,    default: cfg.speed,         parse: Number },
    decay:        { type: 'range', min: 1,    max: 60,   default: cfg.decayAlpha,    parse: Number },
    imageOpacity: { type: 'range', min: 0,    max: 30,   default: cfg.imageAlpha * 100, parse: Number },
    alpha:        { type: 'range', min: 1,    max: 40,   default: cfg.particleAlpha, parse: Number },
  })

  window.addEventListener('resize', resize)
  resize()

  // noise field runs immediately while image loads
  buildFieldNoise()
  particles = Array.from({ length: cfg.nParticles }, spawnParticle)
  requestAnimationFrame(tick)

  // dankstore sync loop
  setInterval(() => {
    cfg.nParticles    = window.dankstore.get('particles')
    cfg.speed         = window.dankstore.get('speed')
    cfg.decayAlpha    = window.dankstore.get('decay')
    cfg.imageAlpha    = window.dankstore.get('imageOpacity') / 100
    cfg.particleAlpha = window.dankstore.get('alpha')

    // respawn if count changed
    while (particles.length < cfg.nParticles) particles.push(spawnParticle())
    if (particles.length > cfg.nParticles) particles.length = cfg.nParticles
  }, 500)

  // try image — env var first, then local /smoke.jpg
  const imageUrl = (import.meta.env.VITE_SMOKE_IMAGE_URL as string | undefined) || '/smoke.jpg'

  try {
    const img = await loadImage(imageUrl)
    imgEl = img

    const off = document.createElement('canvas')
    off.width  = img.naturalWidth
    off.height = img.naturalHeight
    off.getContext('2d')!.drawImage(img, 0, 0)
    imgPixels = off.getContext('2d')!.getImageData(0, 0, off.width, off.height)

    // rebuild field from actual image edges
    buildFieldFromImage(imgPixels)
    usingImage = true

    // redraw underlay
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W(), H())
    drawImageUnderlay(img)

    debug.textContent = `▸ image flow field — ${img.naturalWidth}×${img.naturalHeight}`
  } catch {
    debug.textContent = '▸ noise flow field'
    buildFieldNoise()
  }
}

init()
