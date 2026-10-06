const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a1402" />
      <stop offset="50%" stop-color="#180b01" />
      <stop offset="100%" stop-color="#0a0400" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5ba68" />
      <stop offset="50%" stop-color="#c47a2e" />
      <stop offset="100%" stop-color="#8c4e20" />
    </linearGradient>
    <linearGradient id="cupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f5e6d3" />
    </linearGradient>
    <linearGradient id="steamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#f5ba68" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.4" />
    </linearGradient>
  </defs>

  <!-- Background Rounded Rect -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="16" />

  <!-- Steam Trails -->
  <path d="M195 160 C180 135 210 110 195 85 C185 65 200 45 195 30" stroke="url(#steamGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>
  <path d="M256 150 C275 125 240 95 260 65 C270 45 250 25 256 10" stroke="url(#steamGrad)" stroke-width="20" stroke-linecap="round" fill="none"/>
  <path d="M317 160 C332 135 302 110 317 85 C327 65 312 45 317 30" stroke="url(#steamGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>

  <!-- Cup Handle -->
  <path d="M330 235 H370 C410 235 435 265 435 300 C435 335 405 365 345 365" stroke="url(#cupGrad)" stroke-width="30" stroke-linecap="round" fill="none"/>

  <!-- Cup Body -->
  <path d="M130 205 H350 L330 360 C325 395 295 415 256 415 C217 415 187 395 182 360 Z" fill="url(#cupGrad)"/>

  <!-- Coffee Top / Crema Oval -->
  <ellipse cx="240" cy="205" rx="105" ry="22" fill="#c47a2e" />
  <ellipse cx="240" cy="205" rx="80" ry="15" fill="#542a0c" />
  
  <!-- Latte Art Heart -->
  <path d="M240 214 C232 203 218 206 222 216 C225 222 240 230 240 230 C240 230 255 222 258 216 C262 206 248 203 240 214 Z" fill="#fff5ea" />

  <!-- Saucer Base Plate -->
  <path d="M110 445 C180 470 300 470 370 445" stroke="url(#goldGrad)" stroke-width="26" stroke-linecap="round" fill="none"/>
</svg>
`;

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const sizes = [
    { file: 'icon.png', size: 48 },
    { file: 'icon-96.png', size: 96 },
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
  ];

  const svgBuf = Buffer.from(svg);

  for (const s of sizes) {
    const dest = path.join(publicDir, s.file);
    await sharp(svgBuf).resize(s.size, s.size).png().toFile(dest);
    console.log(`Generated ${dest} (${s.size}x${s.size})`);
  }

  // Favicon.ico
  const icoDest = path.join(publicDir, 'favicon.ico');
  const icoBuffer = await sharp(svgBuf).resize(48, 48).png().toBuffer();
  fs.writeFileSync(icoDest, icoBuffer);
  console.log(`Generated ${icoDest}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
