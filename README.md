# Aaisha Iqbal — Make Sense of It

A premium editorial portfolio built around a continuous WebGL world, interactive analytical scenes, and five grounded project stories.

## Run locally
Because the project uses ES modules, run it through a local web server instead of double-clicking `index.html`.

### VS Code
Install the "Live Server" extension, then right-click `index.html` → **Open with Live Server**.

### Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Tech
- HTML / CSS / JavaScript
- Three.js WebGL
- Custom GLSL point shader and canvas-texture data labels
- Draggable optical data-lens interaction with touch fallback
- GSAP + ScrollTrigger scene choreography
- Five interactive project chapters, including SpecTrace
- Interactive community map and personal-object gallery
- Section-specific interactions: data paths, growing terrain, directional weather, hoverable clusters, workflow progress, archive assembly, and draggable still life
- Active desktop navigation and an accessible mobile menu
- Mobile quality tiers, capped DPR, reduced-motion and WebGL fallbacks

## Content sources
Portfolio text is grounded in Aaisha's supplied CV and current LinkedIn profile details. No private credentials or secrets are embedded.

## Deploy
This is a static site and can be deployed directly to Vercel, Netlify, GitHub Pages, or Cloudflare Pages.
