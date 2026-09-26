# romanlendormy.github.io

Personal website of Roman Lendormy: machine learning, combinatorial optimization, generative models.

Static site, no build step: plain HTML, CSS and JavaScript. All figures are drawn with the Canvas 2D API, without external libraries. Fonts are self-hosted (SIL Open Font License, see `assets/fonts/LICENSE-*.txt`), so no request is sent to third-party servers.

Designed and coded with Claude.

## Structure

```
index.html            page content
assets/style.css      layout, responsive breakpoints (1180px, 900px, 760px), reduced-motion rules
assets/site.js        animations + e-mail obfuscation
assets/img/           portrait, project images, social preview (og-image.jpg), favicon
assets/fonts/         Instrument Serif, IBM Plex Mono, Manrope (woff2)
```

## Preview locally

The shoe animation reads image pixels, which browsers only allow over HTTP (not `file://`):

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish with GitHub Pages

1. Push these files to the root of the `romanlendormy.github.io` repository (branch `main`).
2. Settings → Pages → Build and deployment → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Keep *Enforce HTTPS* enabled. The site is live at https://romanlendormy.github.io after a minute or two.

Note: with a free GitHub account, Pages only publishes from public repositories.

## To update later

- CV: put the PDF at `assets/cv.pdf`, then in `index.html` replace the `Download CV` link's `aria-disabled="true" title="CV coming soon"` with `href="assets/cv.pdf" download`.
- E-mail: change `data-u` / `data-d` on the `.js-mail` and `.js-mail-text` elements (the address is only assembled in the browser).

## Security

- **Content-Security-Policy** (meta tag in `index.html`): scripts, styles, images and fonts may only come from this site; no inline scripts, no outbound requests (`connect-src 'none'`), no forms, no plugins. Keep it that way: add new scripts as files in `assets/`, never as inline `<script>` blocks or `onclick=` attributes.
- **No third-party requests**: fonts are self-hosted, there is no analytics, no CDN, no dependency.
- **E-mail obfuscation**: the address never appears in the HTML source; it is assembled in the browser from `data-u` + `data-d`.
- **Images**: stripped of all metadata (EXIF, GPS, comments). Strip new images too before committing (e.g. `exiftool -all= file.jpg`).
- **Referrer policy**: `strict-origin-when-cross-origin`.
- GitHub Pages cannot send custom HTTP headers, so `frame-ancestors` / `X-Frame-Options` cannot be set. The page has no sensitive actions, so clickjacking has no real impact here.
- The main risk is the GitHub account itself: enable two-factor authentication (passkey or TOTP app), remove unused SSH keys, tokens and OAuth apps.
