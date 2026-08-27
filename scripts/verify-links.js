const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const htmlFiles = execFileSync('find', [
  '.', '-type', 'f', '-name', '*.html', '-not', '-path', './media/*'
], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const publicFiles = new Set(execFileSync('find', [
  '.', '-type', 'f', '-not', '-path', './.git/*', '-not', '-path', './media/*'
], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map((file) => file.replace(/^\.\//, '')));

const brokenLinks = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const currentPath = file === './index.html' ? '/' : `/${file.replace(/^\.\//, '').replace(/index\.html$/, '')}`;
  const baseUrl = new URL(`https://odysseysolutions.co${currentPath}`);

  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const rawUrl = match[1];
    if (/^(#|mailto:|tel:|javascript:|data:)/i.test(rawUrl)) continue;

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl, baseUrl);
    } catch {
      continue;
    }
    if (targetUrl.origin !== 'https://odysseysolutions.co') continue;

    let localPath = decodeURIComponent(targetUrl.pathname).replace(/^\//, '');
    if (!localPath) localPath = 'index.html';
    const candidates = [
      localPath,
      `${localPath}.html`,
      path.posix.join(localPath, 'index.html')
    ];
    if (!candidates.some((candidate) => publicFiles.has(candidate))) {
      brokenLinks.push(`${file}: ${rawUrl}`);
    }
  }
}

if (brokenLinks.length) {
  console.error(brokenLinks.join('\n'));
  process.exit(1);
}

console.log(`Internal-link check passed across ${htmlFiles.length} HTML files`);
