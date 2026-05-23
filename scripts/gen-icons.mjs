import sharp from "sharp"
import { execFileSync } from "child_process"
import { writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(__dirname, "..", "build")

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#4f46e5"/>
  <rect x="120" y="140" width="272" height="232" rx="20" fill="none" stroke="white" stroke-width="24"/>
  <line x1="120" y1="210" x2="392" y2="210" stroke="white" stroke-width="24"/>
  <circle cx="185" cy="175" r="16" fill="white"/>
  <circle cx="256" cy="175" r="16" fill="white"/>
  <rect x="160" y="248" width="60" height="44" rx="8" fill="white"/>
  <rect x="226" y="248" width="60" height="44" rx="8" fill="white"/>
  <rect x="292" y="248" width="60" height="44" rx="8" fill="white" opacity="0.5"/>
  <rect x="160" y="304" width="192" height="44" rx="8" fill="white"/>
</svg>`

const svgBuf = Buffer.from(svg)

// PNG 512×512
await sharp(svgBuf).resize(512, 512).png().toFile(path.join(buildDir, "icon.png"))
console.log("✓ build/icon.png")

// ICO via ImageMagick (16, 32, 48, 256)
const sizes = [16, 32, 48, 256]
const tmpFiles = []
for (const s of sizes) {
  const tmp = path.join(buildDir, `_tmp_${s}.png`)
  await sharp(svgBuf).resize(s, s).png().toFile(tmp)
  tmpFiles.push(tmp)
}
execFileSync("convert", [...tmpFiles, path.join(buildDir, "icon.ico")])
for (const f of tmpFiles) {
  try { execFileSync("rm", [f]) } catch {}
}
console.log("✓ build/icon.ico")
