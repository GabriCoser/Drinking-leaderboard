// Genera le icone PWA: boccale di birra stilizzato su sfondo scuro.
// Uso: node scripts/gen-icons.mjs
import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0d0d0d"/>
  <rect x="140" y="170" width="180" height="220" rx="20" fill="#F5C518"/>
  <rect x="140" y="170" width="180" height="50" rx="20" fill="#fff8dc"/>
  <circle cx="160" cy="160" r="28" fill="#fff8dc"/>
  <circle cx="215" cy="145" r="34" fill="#fff8dc"/>
  <circle cx="275" cy="150" r="30" fill="#fff8dc"/>
  <circle cx="315" cy="165" r="24" fill="#fff8dc"/>
  <path d="M320 220 h36 a36 36 0 0 1 36 36 v60 a36 36 0 0 1 -36 36 h-36 v-36 h30 a8 8 0 0 0 8 -8 v-44 a8 8 0 0 0 -8 -8 h-30 z" fill="#F5C518"/>
  <rect x="165" y="240" width="22" height="120" rx="11" fill="#c9a014"/>
  <rect x="219" y="240" width="22" height="120" rx="11" fill="#c9a014"/>
  <rect x="273" y="240" width="22" height="120" rx="11" fill="#c9a014"/>
</svg>`

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icon-${size}.png`)
  console.log(`public/icon-${size}.png ok`)
}
