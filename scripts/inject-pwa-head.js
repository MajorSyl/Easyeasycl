#!/usr/bin/env node
// Patches the PWA manifest link, iOS install meta tags, and service worker
// registration into dist/index.html after `expo export --platform web`.
//
// Why this exists instead of app/+html.tsx: Expo Router only renders that
// custom document template when web.output is "static" (per-route static
// HTML generation) or "server". This project intentionally stays on the
// default "single" output (one index.html, client-side routed) -- vercel.json
// has a matching catch-all SPA rewrite (`/(.*) -> /index.html`), and
// switching output modes would mean generating a separate static HTML file
// per route instead, which is a much bigger change than "add a manifest"
// should require. So the tags get injected here as a build step instead.
//
// Safe to run more than once -- skips re-injecting if the manifest link is
// already present.
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

const HEAD_INJECTION = `
    <!-- PWA manifest -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#3E6FBF" />

    <!-- Standalone/full-screen mode on iOS needs viewport-fit=cover to draw
         correctly behind the notch/home indicator; a later viewport meta
         tag wins over Expo's default one earlier in <head>. -->
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

    <!-- iOS home-screen install support -- Safari doesn't read the web app
         manifest for most of this, it needs its own meta tags. -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Easyfen" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
    <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
`;

const BODY_INJECTION = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {
            // Offline resilience is a nice-to-have, not load-bearing -- a
            // failed registration should never break the app.
          });
        });
      }
    </script>
`;

function main() {
  if (!fs.existsSync(INDEX_HTML)) {
    console.error(`inject-pwa-head: ${INDEX_HTML} does not exist. Run "expo export --platform web" first.`);
    process.exit(1);
  }

  let html = fs.readFileSync(INDEX_HTML, 'utf8');

  if (html.includes('rel="manifest"')) {
    console.log('inject-pwa-head: manifest link already present, skipping (already injected).');
    return;
  }

  if (!html.includes('</head>') || !html.includes('</body>')) {
    console.error('inject-pwa-head: dist/index.html is missing </head> or </body> -- unexpected export output, aborting.');
    process.exit(1);
  }

  html = html.replace('</head>', `${HEAD_INJECTION}  </head>`);
  html = html.replace('</body>', `${BODY_INJECTION}  </body>`);

  fs.writeFileSync(INDEX_HTML, html);
  console.log('inject-pwa-head: PWA meta tags and service worker registration injected into dist/index.html.');
}

main();
