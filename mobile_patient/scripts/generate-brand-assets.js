#!/usr/bin/env node
// Generates the placeholder brand assets (app icon, Android adaptive icon
// foreground, splash image) as PNGs using only Node built-ins: an "M"
// monogram drawn with anti-aliased strokes on the theme's primary color.
// Usage: npm run assets:generate
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const PRIMARY = hex('#0A5C6E') // colors.primary in src/theme.ts
const ACCENT = hex('#F5A623') // colors.secondary
const WHITE = [255, 255, 255]
const SIZE = 1024
const OUT_DIR = path.join(__dirname, '..', 'assets')

function hex(value) {
  const n = parseInt(value.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// --- PNG encoding -----------------------------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Drawing ----------------------------------------------------------------
function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Coverage (0..1) of a stroked polyline at a pixel, with 1px anti-aliasing.
function strokeCoverage(x, y, points, halfWidth) {
  let distance = Infinity
  for (let i = 0; i < points.length - 1; i += 1) {
    distance = Math.min(distance, distanceToSegment(x, y, points[i], points[i + 1]))
  }
  return Math.max(0, Math.min(1, halfWidth - distance + 0.5))
}

function roundedRectCoverage(x, y, left, top, right, bottom, r) {
  const cx = Math.max(left + r, Math.min(x, right - r))
  const cy = Math.max(top + r, Math.min(y, bottom - r))
  return Math.max(0, Math.min(1, r - Math.hypot(x - cx, y - cy) + 0.5))
}

function blend(buffer, offset, color, alpha) {
  if (alpha <= 0) return
  const existing = buffer[offset + 3] / 255
  const outAlpha = alpha + existing * (1 - alpha)
  for (let c = 0; c < 3; c += 1) {
    const mixed = (color[c] * alpha + buffer[offset + c] * existing * (1 - alpha)) / (outAlpha || 1)
    buffer[offset + c] = Math.round(mixed)
  }
  buffer[offset + 3] = Math.round(outAlpha * 255)
}

// Draws the monogram scaled into a square of `box` px centered on the canvas.
function drawMonogram(buffer, box) {
  const origin = (SIZE - box) / 2
  const at = (u, v) => [origin + u * box, origin + v * box]
  const letter = [at(0.2, 0.72), at(0.2, 0.18), at(0.5, 0.52), at(0.8, 0.18), at(0.8, 0.72)]
  const halfStroke = box * 0.075
  const bar = { left: origin + 0.2 * box, right: origin + 0.8 * box, top: origin + 0.89 * box, bottom: origin + 0.95 * box }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const offset = (y * SIZE + x) * 4
      const px = x + 0.5
      const py = y + 0.5
      blend(buffer, offset, WHITE, strokeCoverage(px, py, letter, halfStroke))
      blend(buffer, offset, ACCENT, roundedRectCoverage(px, py, bar.left, bar.top, bar.right, bar.bottom, (bar.bottom - bar.top) / 2))
    }
  }
}

function canvas(background) {
  const buffer = Buffer.alloc(SIZE * SIZE * 4)
  if (background) {
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      buffer[i * 4] = background[0]
      buffer[i * 4 + 1] = background[1]
      buffer[i * 4 + 2] = background[2]
      buffer[i * 4 + 3] = 255
    }
  }
  return buffer
}

function write(name, buffer) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, name), encodePng(SIZE, SIZE, buffer))
  console.log(`wrote assets/${name}`)
}

// App icon: opaque (iOS rejects transparency), monogram fills ~62% of the tile.
const icon = canvas(PRIMARY)
drawMonogram(icon, SIZE * 0.62)
write('icon.png', icon)

// Adaptive icon foreground: transparent, kept inside the 66% safe zone; the
// background color comes from the app config.
const adaptive = canvas(null)
drawMonogram(adaptive, SIZE * 0.46)
write('adaptive-icon.png', adaptive)

// Splash image: transparent monogram shown on the primary splash background.
const splash = canvas(null)
drawMonogram(splash, SIZE * 0.5)
write('splash-icon.png', splash)
