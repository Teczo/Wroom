# Fonts

Four files go here. Nothing downloads them — CLAUDE.md §7.2 requires them
self-hosted, and this session was told not to fetch them.

| File | Family | Weight | Used for |
|---|---|---|---|
| `space-grotesk-500.woff2` | Space Grotesk | 500 Medium | Navigation, project and product names, metric numerals |
| `space-grotesk-700.woff2` | Space Grotesk | 700 Bold | Headings and hero titles |
| `inter-400.woff2` | Inter | 400 Regular | Body copy, descriptions, card text |
| `inter-600.woff2` | Inter | 600 SemiBold | Buttons, form labels, emphasis |

**Subset to Latin.** The `unicode-range` in `src/index.css` already declares the
Latin range, so a file carrying Cyrillic or Greek is bytes nobody downloads on
purpose but everybody pays for. `google-webfonts-helper` or `pyftsubset` both
produce the right thing:

```
pyftsubset SpaceGrotesk-Bold.ttf \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --flavor=woff2 --output-file=space-grotesk-700.woff2
```

**Only these four weights are declared.** Adding a fifth means an `@font-face`
block in `src/index.css` as well as a file here — a weight with no block is a
file the browser never asks for, and a block with no file is a 404 per page load.

Until the files land, every face falls through to the system sans stack. The
site renders correctly; it just is not in the right type yet.

`space-grotesk-700.woff2` is preloaded in `index.html`, because it is what the
first heading on every page is set in.
