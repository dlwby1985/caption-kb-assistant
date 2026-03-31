import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(__dirname, '..', 'build')

const SIZE = 512
const BG_COLOR = '#8C1D40'
const TEXT_COLOR = '#FFC627'
const CORNER_RADIUS = 80

// Create SVG with rounded rect background and bold "C"
const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="${BG_COLOR}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="bold"
        font-size="360" fill="${TEXT_COLOR}">C</text>
</svg>`

async function main() {
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })

  // Generate 512x512 PNG
  const pngPath = path.join(buildDir, 'icon.png')
  await sharp(Buffer.from(svg)).png().toFile(pngPath)
  console.log('Created icon.png (512x512)')

  // Generate sized PNGs for ICO
  const sizes = [16, 32, 48, 256]
  const pngBuffers = await Promise.all(
    sizes.map(s => sharp(Buffer.from(svg)).resize(s, s).png().toBuffer())
  )

  // Write temp PNGs, generate ICO (max 256x256 for NSIS compatibility)
  const tempPaths = []
  for (let i = 0; i < sizes.length; i++) {
    const tp = path.join(buildDir, `icon-${sizes[i]}.png`)
    fs.writeFileSync(tp, pngBuffers[i])
    tempPaths.push(tp)
  }

  const icoBuffer = await pngToIco(tempPaths)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
  console.log('Created icon.ico (16, 32, 48, 256)')

  // Cleanup temp sized PNGs
  for (const s of sizes) {
    const tp = path.join(buildDir, `icon-${s}.png`)
    if (fs.existsSync(tp)) fs.unlinkSync(tp)
  }

  console.log('Done!')
}

main().catch(err => { console.error(err); process.exit(1) })
