import * as THREE from "three";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;
const mobile = innerWidth < 760;
const canvas = document.querySelector("#webgl");
const hero = document.querySelector("#hero");
const scanner = document.querySelector("#scanner");
const signalButton = document.querySelector("#signalButton");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: "high-performance" });
} catch (error) {
  document.documentElement.classList.add("no-webgl");
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 80);
camera.position.set(0, 0, 10);
const world = new THREE.Group();
scene.add(world);

if (renderer) {
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

const COUNT = mobile ? 1300 : 3600;
const positions = new Float32Array(COUNT * 3);
const origins = new Float32Array(COUNT * 3);
const targets = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);
const pointX = new Float32Array(COUNT);

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

for (let i = 0; i < COUNT; i += 1) {
  const x = (hash(i * 3) - 0.5) * 10.5;
  const y = (hash(i * 3 + 1) - 0.5) * 6.2;
  const z = (hash(i * 3 + 2) - 0.5) * 6.5;
  positions.set([x, y, z], i * 3);
  origins.set([x, y, z], i * 3);
  targets.set([x, y, z], i * 3);
  seeds[i] = hash(i + 77) * 20;
  pointX[i] = x;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

const pointMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: mobile ? 8 : 11 },
    uAccent: { value: new THREE.Color("#3d68ff") },
    uPale: { value: new THREE.Color("#dfe4ff") },
    uOpacity: { value: 0.82 }
  },
  vertexShader: `
    attribute float aSeed;
    varying float vSeed;
    uniform float uTime;
    uniform float uSize;
    void main(){
      vec3 p=position;
      p.z += sin(uTime*.42+aSeed)*.025;
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_PointSize=uSize*(.75+fract(aSeed)*.8)*(7.0/max(1.0,-mv.z));
      gl_Position=projectionMatrix*mv;
      vSeed=aSeed;
    }
  `,
  fragmentShader: `
    varying float vSeed;
    uniform vec3 uAccent;
    uniform vec3 uPale;
    uniform float uOpacity;
    void main(){
      float d=length(gl_PointCoord-.5);
      if(d>.5) discard;
      float edge=smoothstep(.5,.05,d);
      vec3 color=mix(uAccent,uPale,fract(vSeed*.371));
      gl_FragColor=vec4(color,edge*uOpacity);
    }
  `
});

const particles = new THREE.Points(geometry, pointMaterial);
world.add(particles);

const lineCount = mobile ? 30 : 72;
const linePositions = new Float32Array(lineCount * 6);
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x9fb3ff, transparent: true, opacity: 0 });
const connections = new THREE.LineSegments(lineGeometry, lineMaterial);
world.add(connections);

const decorCobalt = new THREE.MeshBasicMaterial({ color: 0x2457ff, wireframe: true, transparent: true, opacity: 0.68 });
const decorAcid = new THREE.MeshBasicMaterial({ color: 0xb9ff38, wireframe: true, transparent: true, opacity: 0.74 });
const decorPale = new THREE.MeshBasicMaterial({ color: 0xe8e6de, wireframe: true, transparent: true, opacity: 0.48 });
const cropDecor = new THREE.Group();
const terrainGrid = new THREE.GridHelper(6.5, 18, 0xb9ff38, 0x44506b);
terrainGrid.material.transparent = true;
terrainGrid.material.opacity = 0.22;
terrainGrid.position.y = -1.05;
cropDecor.add(terrainGrid);
for (let i = 0; i < 18; i += 1) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, 0.6 + hash(i) * 1.35, 6), i % 3 === 0 ? decorAcid : decorCobalt);
  stem.position.set((i % 6 - 2.5) * 0.62, -0.55 + stem.geometry.parameters.height * 0.5, (Math.floor(i / 6) - 1) * 0.72);
  cropDecor.add(stem);
}
cropDecor.visible = false;
world.add(cropDecor);

const beautyDecor = new THREE.Group();
for (let i = 0; i < 4; i += 1) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75 + i * 0.48, 0.012, 6, 110), i === 2 ? decorAcid : decorPale);
  ring.rotation.set(0.15 * i, 0.22 * i, 0);
  beautyDecor.add(ring);
}
beautyDecor.visible = false;
world.add(beautyDecor);

const traceDecor = new THREE.Group();
const tracePoints = [];
for (let i = 0; i < 7; i += 1) tracePoints.push(new THREE.Vector3(-3.2 + i * 1.05, Math.sin(i * 1.35) * 0.52, 0));
const traceCurve = new THREE.CatmullRomCurve3(tracePoints);
traceDecor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(traceCurve.getPoints(100)), new THREE.LineBasicMaterial({ color: 0xb9ff38, transparent: true, opacity: 0.72 })));
tracePoints.forEach((point, index) => {
  const node = new THREE.Mesh(new THREE.SphereGeometry(index === 5 ? 0.13 : 0.075, 10, 8), index === 5 ? decorAcid : decorPale);
  node.position.copy(point);
  traceDecor.add(node);
});
traceDecor.visible = false;
world.add(traceDecor);

const dataWords = ["19.4", "rainfall", "SELECT *", "0.87", "customer_id", "N = 90", "AQI", "forecast_hour", "rating", "15,000+", "temperature", "NULL", "P: 42", "K: 38", "{ city }", "humidity", "brand_id", "soil_ph", "confidence", "model.score", "category", "wind_kph", "GROUP BY", "skin_type"];
const labelGroup = new THREE.Group();
world.add(labelGroup);
const labels = [];

function labelTexture(text) {
  const surface = document.createElement("canvas");
  surface.width = 512;
  surface.height = 96;
  const context = surface.getContext("2d");
  context.clearRect(0, 0, 512, 96);
  context.font = "500 29px monospace";
  context.fillStyle = "rgba(226,230,236,.92)";
  context.fillText(text, 6, 52);
  context.fillStyle = "#b9ff38";
  context.fillRect(6, 68, Math.max(14, text.length * 5), 2);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

dataWords.forEach((word, index) => {
  const material = new THREE.SpriteMaterial({ map: labelTexture(word), transparent: true, opacity: 0.88, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const x = (hash(index * 9 + 2) - 0.5) * 9.4;
  const y = (hash(index * 9 + 4) - 0.5) * 5.4;
  const z = (hash(index * 9 + 8) - 0.5) * 4;
  sprite.position.set(x, y, z);
  sprite.scale.set(1.75, 0.33, 1);
  sprite.userData.origin = new THREE.Vector3(x, y, z);
  sprite.userData.target = new THREE.Vector3((index % 6 - 2.5) * 1.42, (1.5 - Math.floor(index / 6)) * 0.85, -0.8 + (index % 3) * 0.12);
  labelGroup.add(sprite);
  labels.push(sprite);
});

// A persistent stream of ideas. Each node and label is physically attached to
// its curve, so the About section reads as motion rather than decorated copy.
const thoughtPaths = new THREE.Group();
thoughtPaths.visible = false;
world.add(thoughtPaths);
const thoughtLabels = ["CURIOUS", "ANALYSIS", "PATTERNS", "LEARNING", "QUESTIONS", "INSIGHT"];
const thoughtStreams = thoughtLabels.map((text, index) => {
  const depth = -0.45 - (index % 3) * 0.62;
  const baseY = -1.7 + index * 0.68;
  const points = Array.from({ length: 9 }, (_, pointIndex) => {
    const x = -7.5 + pointIndex * 1.9;
    return new THREE.Vector3(x, baseY + Math.sin(pointIndex * 1.15 + index) * 0.43, depth);
  });
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(150));
  const material = new THREE.LineBasicMaterial({ color: index === 2 ? 0xb9ff38 : 0x6687ff, transparent: true, opacity: 0.34 + (index % 2) * 0.14 });
  const line = new THREE.Line(geometry, material);
  const node = new THREE.Mesh(new THREE.SphereGeometry(index === 2 ? 0.095 : 0.065, 10, 8), index === 2 ? decorAcid : decorPale);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text), transparent: true, opacity: 0.92, depthWrite: false }));
  label.scale.set(1.42, 0.27, 1);
  thoughtPaths.add(line, node, label);
  return { text, index, baseY, depth, curve, points, geometry, line, node, label, offset: index / thoughtLabels.length, speed: 0.027 + index * 0.0035 };
});

const worldObjects = new THREE.Group();
worldObjects.visible = false;
world.add(worldObjects);
const cobalt = new THREE.MeshBasicMaterial({ color: 0x2457ff, wireframe: true, transparent: true, opacity: 0.65 });
const acid = new THREE.MeshBasicMaterial({ color: 0xb9ff38, wireframe: true, transparent: true, opacity: 0.72 });
const pale = new THREE.MeshBasicMaterial({ color: 0xe8e6de, wireframe: true, transparent: true, opacity: 0.48 });

const cup = new THREE.Group();
cup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.58, 0.85, 28, 1, true), cobalt));
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.09, 10, 28, Math.PI * 1.55), cobalt);
handle.position.set(0.63, 0.05, 0);
handle.rotation.y = Math.PI / 2;
cup.add(handle);
cup.position.set(1.9, 0.8, 0);
worldObjects.add(cup);
const teaPour = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.25, 10), new THREE.MeshBasicMaterial({ color: 0xb9ff38, transparent: true, opacity: 0.72 }));
teaPour.position.set(1.9, 1.78, 0);
teaPour.scale.y = 0;
worldObjects.add(teaPour);
const teaFill = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 0.55, 28), new THREE.MeshBasicMaterial({ color: 0xb9ff38, transparent: true, opacity: 0.25 }));
teaFill.position.set(1.9, 0.61, 0);
teaFill.scale.y = 0.02;
worldObjects.add(teaFill);
const teapot = new THREE.Group();
teapot.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), cobalt));
const spout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 12), cobalt);
spout.rotation.z = -Math.PI / 2;
spout.position.x = 0.55;
teapot.add(spout);
teapot.position.set(0.78, 2.18, 0);
worldObjects.add(teapot);
const steam = new THREE.Group();
for (let i = 0; i < 3; i += 1) {
  const steamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(i * 0.16 - 0.16, 0, 0), new THREE.Vector3(i * 0.16 - 0.24, 0.35, 0), new THREE.Vector3(i * 0.16 - 0.1, 0.72, 0)
  ]);
  steam.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(steamCurve.getPoints(24)), new THREE.LineBasicMaterial({ color: 0xe8e6de, transparent: true, opacity: 0 })));
}
steam.position.set(1.9, 1.22, 0);
worldObjects.add(steam);

const book = new THREE.Group();
const coverA = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 2.15), pale);
const coverB = coverA.clone();
coverA.position.y = 0.22;
coverB.position.y = -0.22;
book.add(coverA, coverB);
book.add(new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.38, 2.02), cobalt));
book.rotation.set(0.2, -0.45, -0.12);
book.position.set(-1.8, -0.9, -0.2);
worldObjects.add(book);

const flower = new THREE.Group();
const flowerPetals = [];
const fallingPetals = [];
for (let i = 0; i < 8; i += 1) {
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), i % 2 ? acid : cobalt);
  petal.scale.set(1.25, 0.48, 0.22);
  petal.position.set(Math.cos(i * Math.PI / 4) * 0.62, Math.sin(i * Math.PI / 4) * 0.62, 0);
  petal.rotation.z = i * Math.PI / 4;
  flower.add(petal);
  flowerPetals.push(petal);
}
flower.position.set(-1.7, 1.55, 0.5);
worldObjects.add(flower);
for (let i = 0; i < 4; i += 1) {
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 6), i % 2 ? acid : cobalt);
  petal.scale.set(1.25, 0.42, 0.18);
  petal.position.set(-1.45 + i * 0.19, 1.55, 0.45);
  petal.visible = false;
  worldObjects.add(petal);
  fallingPetals.push(petal);
}

const contours = [];
for (let i = 0; i < 5; i += 1) {
  const contour = new THREE.Mesh(new THREE.TorusGeometry(0.85 + i * 0.22, 0.012, 6, 80), pale);
  contour.position.set(1.45, -1.3, -0.9 - i * 0.06);
  contour.scale.y = 0.48 + i * 0.025;
  worldObjects.add(contour);
  contours.push(contour);
}

const brush = new THREE.Group();
const brushHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.55, 12), pale);
brushHandle.rotation.z = -0.62;
const brushTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 12), acid);
brushTip.position.set(0.48, -0.57, 0);
brushTip.rotation.z = -0.62;
brush.add(brushHandle, brushTip);
brush.position.set(0.15, -1.75, 0.45);
worldObjects.add(brush);

const notebook = new THREE.Group();
const notebookCover = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.65, 0.08), cobalt);
const notebookPage = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.48), pale);
notebookPage.position.z = 0.06;
notebook.add(notebookCover, notebookPage);
notebook.position.set(0.35, 1.65, -0.4);
notebook.rotation.set(-0.08, 0.25, 0.1);
worldObjects.add(notebook);

let mode = "chaos";
let resolveProgress = 0.02;
let resolveTarget = 0.02;
let scannerPosition = 0.1;
let targetScannerPosition = 0.1;
let pointerX = 0;
let pointerY = 0;
let visible = true;
let sceneProgress = 0;
let hoveredCluster = -1;
let sculptureDrag = false;
let dragStartX = 0;
let dragRotation = 0;

const introWaveCanvas = document.querySelector("#introWaveCanvas");
const introWaveContext = introWaveCanvas?.getContext("2d");
const introSection = document.querySelector("#about");
const introWaveLabels = ["CURIOUS", "ANALYSIS", "PATTERNS", "LEARNING", "QUESTIONS", "INSIGHT"];
const introSignals = [
  { index: 0, label: "CURIOUS", lastLap: null, start: .76, end: .18, amplitude: .11, phase: .25, offset: .04, speed: 98, alpha: .98, width: 2.7 },
  { index: 1, label: "ANALYSIS", lastLap: null, start: .18, end: .80, amplitude: .10, phase: 2.20, offset: .29, speed: 86, alpha: .84, width: 2.2 },
  { index: 2, label: "PATTERNS", lastLap: null, start: .59, end: .38, amplitude: .17, phase: 4.10, offset: .55, speed: 92, alpha: .72, width: 1.85 },
  { index: 3, label: "LEARNING", lastLap: null, start: .84, end: .55, amplitude: .08, phase: 5.35, offset: .79, speed: 78, alpha: .60, width: 1.5 }
];
const activeIntroLabels = new Set(introSignals.map((signal) => signal.label));
let nextIntroLabel = 4;
let introWaveWidth = 1;
let introWaveHeight = 1;
let introWavesVisible = true;

function sizeIntroWaves() {
  if (!introWaveCanvas || !introWaveContext) return;
  const bounds = introWaveCanvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, mobile ? 1.25 : 1.6);
  introWaveWidth = Math.max(1, bounds.width);
  introWaveHeight = Math.max(1, bounds.height);
  introWaveCanvas.width = Math.floor(introWaveWidth * ratio);
  introWaveCanvas.height = Math.floor(introWaveHeight * ratio);
  introWaveContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  introWaveContext.lineCap = "round";
  introWaveContext.lineJoin = "round";
}

function introSignalY(signal, x, time, pointerXLocal, pointerYLocal) {
  const progress = Math.max(0, Math.min(1, (x + 110) / (introWaveWidth + 220)));
  let y = introWaveHeight * (signal.start + (signal.end - signal.start) * progress);
  y += introWaveHeight * signal.amplitude * Math.sin(progress * Math.PI * 1.65 + signal.phase + time * .09);
  const dx = x - pointerXLocal;
  const reach = Math.max(150, introWaveWidth * .15);
  const influence = Math.exp(-(dx * dx) / (2 * reach * reach));
  y += influence * Math.max(-38, Math.min(38, (y - pointerYLocal) * .11));
  return y;
}

function reserveIntroLabel(signal, lap) {
  if (signal.lastLap === null) {
    signal.lastLap = lap;
    return;
  }
  if (signal.lastLap === lap) return;
  activeIntroLabels.delete(signal.label);
  const unused = introWaveLabels.filter((label) => !activeIntroLabels.has(label));
  if (unused.length) {
    const preferred = introWaveLabels[nextIntroLabel % introWaveLabels.length];
    signal.label = unused.includes(preferred) ? preferred : unused[0];
    nextIntroLabel = introWaveLabels.indexOf(signal.label) + 1;
  }
  activeIntroLabels.add(signal.label);
  signal.lastLap = lap;
}

function drawIntroWaves(milliseconds) {
  if (!introWaveContext || !introWaveCanvas) return;
  requestAnimationFrame(drawIntroWaves);
  if (!introWavesVisible || document.hidden) return;
  const time = reducedMotion ? 7.5 : milliseconds * .001;
  const bounds = introWaveCanvas.getBoundingClientRect();
  const localPointerX = pointerX * innerWidth + innerWidth * .5 - bounds.left;
  const localPointerY = pointerY * innerHeight + innerHeight * .5 - bounds.top;
  introWaveContext.clearRect(0, 0, introWaveWidth, introWaveHeight);

  introSignals.forEach((signal) => {
    const travelSpan = introWaveWidth + 280;
    const travelled = time * signal.speed + signal.offset * travelSpan;
    const lap = Math.floor(travelled / travelSpan);
    reserveIntroLabel(signal, lap);
    const headX = -110 + travelled % travelSpan;
    const headY = introSignalY(signal, headX, time, localPointerX, localPointerY);
    const enterOpacity = Math.max(0, Math.min(1, (headX + 110) / 90));
    const exitOpacity = Math.max(0, Math.min(1, (introWaveWidth + 155 - headX) / 135));
    const lifecycleOpacity = Math.min(enterOpacity, exitOpacity);
    introWaveContext.beginPath();
    for (let x = -110; x <= headX; x += 8) {
      const y = introSignalY(signal, x, time, localPointerX, localPointerY);
      if (x === -110) introWaveContext.moveTo(x, y);
      else introWaveContext.lineTo(x, y);
    }
    introWaveContext.lineTo(headX, headY);
    introWaveContext.strokeStyle = `rgba(36,87,255,${signal.alpha * lifecycleOpacity})`;
    introWaveContext.lineWidth = signal.width;
    introWaveContext.shadowColor = "rgba(36,87,255,.55)";
    introWaveContext.shadowBlur = signal.width > 2 ? 11 : 6;
    introWaveContext.stroke();
    introWaveContext.shadowBlur = 0;
    if (headX > -24 && headX < introWaveWidth + 28) {
      const radius = signal.index === 0 ? 6.5 : 4.6;
      introWaveContext.beginPath();
      introWaveContext.arc(headX, headY, radius, 0, Math.PI * 2);
      introWaveContext.fillStyle = `rgba(36,87,255,${lifecycleOpacity})`;
      introWaveContext.shadowColor = "rgba(36,87,255,.82)";
      introWaveContext.shadowBlur = 14;
      introWaveContext.fill();
      introWaveContext.shadowBlur = 0;
      const alignRight = headX > introWaveWidth - 145;
      introWaveContext.font = `600 ${mobile ? 8 : 10}px "DM Mono", monospace`;
      introWaveContext.textAlign = alignRight ? "right" : "left";
      introWaveContext.textBaseline = "bottom";
      introWaveContext.fillStyle = `rgba(18,63,222,${lifecycleOpacity})`;
      introWaveContext.fillText(signal.label, headX + (alignRight ? -11 : 11), headY - 9);
    }
  });
}

if (introWaveCanvas && introWaveContext) {
  sizeIntroWaves();
  new IntersectionObserver(([entry]) => { introWavesVisible = entry.isIntersecting; }, { rootMargin: "20% 0px" }).observe(introSection);
  requestAnimationFrame(drawIntroWaves);
}

const projectTransition = document.querySelector("#projectTransition");
const projectTransitionCanvas = document.querySelector("#projectTransitionCanvas");
const projectTransitionContext = projectTransitionCanvas?.getContext("2d");
const transitionTiles = document.querySelector("#transitionTiles");
const transitionTileOrder = [0, 15, 5, 10, 3, 12, 6, 9, 1, 14, 4, 11, 2, 13, 7, 8, 16, 17, 18, 19];
if (transitionTiles) {
  transitionTileOrder.forEach((order, index) => {
    const tile = document.createElement("i");
    tile.dataset.order = order;
    tile.className = index >= 16 ? `transition-tile transition-tile-overlay tile-overlay-${index - 15}` : "transition-tile";
    transitionTiles.appendChild(tile);
  });
}
let projectTransitionWidth = 1;
let projectTransitionHeight = 1;
let projectTransitionProgress = reducedMotion ? 1 : 0;
let projectTransitionVisible = false;

function sizeProjectTransition() {
  if (!projectTransitionCanvas || !projectTransitionContext) return;
  const bounds = projectTransitionCanvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, mobile ? 1.15 : 1.5);
  projectTransitionWidth = Math.max(1, bounds.width);
  projectTransitionHeight = Math.max(1, bounds.height);
  projectTransitionCanvas.width = Math.floor(projectTransitionWidth * ratio);
  projectTransitionCanvas.height = Math.floor(projectTransitionHeight * ratio);
  projectTransitionContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  projectTransitionContext.lineCap = "round";
  projectTransitionContext.lineJoin = "round";
}

function drawProjectTransition(milliseconds) {
  if (!projectTransitionContext || !projectTransitionCanvas) return;
  requestAnimationFrame(drawProjectTransition);
  if (!projectTransitionVisible || document.hidden) return;
  const time = reducedMotion ? 8 : milliseconds * .001;
  const context = projectTransitionContext;
  const width = projectTransitionWidth;
  const height = projectTransitionHeight;
  const organize = Math.max(0, Math.min(1, (projectTransitionProgress - .12) / .42));
  const pointPresence = 1 - Math.max(0, Math.min(1, (projectTransitionProgress - .48) / .3));
  context.clearRect(0, 0, width, height);

  const columns = mobile ? 4 : 6;
  const pointCount = mobile ? 16 : 24;
  for (let index = 0; index < pointCount; index += 1) {
    const flowX = ((time * (42 + index % 5 * 7) + index * 113) % (width + 180)) - 90;
    const flowY = height * (.28 + ((index * 37) % 46) / 100) + Math.sin(time * .55 + index * 1.7) * height * .055;
    const gridX = width * (.22 + (index % columns) * (.62 / Math.max(1, columns - 1)));
    const gridY = height * (.30 + Math.floor(index / columns) * .13);
    const x = flowX + (gridX - flowX) * organize;
    const y = flowY + (gridY - flowY) * organize;
    const opacity = pointPresence * (.28 + (index % 4) * .13);
    context.beginPath();
    context.arc(x, y, index % 7 === 0 ? 4.8 : 2.4, 0, Math.PI * 2);
    context.fillStyle = `rgba(36,87,255,${opacity})`;
    context.shadowColor = "rgba(36,87,255,.55)";
    context.shadowBlur = index % 7 === 0 ? 11 : 4;
    context.fill();
  }
  context.shadowBlur = 0;

}

if (projectTransitionCanvas && projectTransitionContext) {
  sizeProjectTransition();
  new IntersectionObserver(([entry]) => { projectTransitionVisible = entry.isIntersecting; }, { rootMargin: "20% 0px" }).observe(projectTransition);
  requestAnimationFrame(drawProjectTransition);
}

const stageNames = {
  crop: ["POINTS", "SOIL"],
  weather: ["SOIL", "ATMOSPHERE"],
  customers: ["FLOW", "CLUSTERS"],
  beauty: ["CLUSTERS", "PRODUCTS"],
  spectrace: ["REQUEST", "REVIEW"]
};

function setTarget(nextMode) {
  mode = nextMode;
  labelGroup.visible = nextMode === "chaos";
  worldObjects.visible = nextMode === "world";
  cropDecor.visible = nextMode === "crop";
  beautyDecor.visible = nextMode === "beauty";
  traceDecor.visible = nextMode === "spectrace";
  thoughtPaths.visible = nextMode === "grid";
  lineMaterial.opacity = nextMode === "spectrace" ? 0.26 : nextMode === "network" ? 0.2 : nextMode === "grid" ? 0.12 : nextMode === "final" ? 0.24 : 0;
  const stage = document.querySelector(".project-stage");
  if (stageNames[nextMode] && stage) {
    stage.children[0].textContent = stageNames[nextMode][0];
    stage.children[2].textContent = stageNames[nextMode][1];
  }
  const clusterCenters = [[-2.2, 1.1, 0.2], [0.1, 1.35, -0.4], [2.15, 0.9, 0.35], [-1.35, -1.15, -0.2], [1.35, -1.2, 0.4]];

  for (let i = 0; i < COUNT; i += 1) {
    const u = i / COUNT;
    let x = 0;
    let y = 0;
    let z = 0;
    if (nextMode === "chaos") {
      x = origins[i * 3]; y = origins[i * 3 + 1]; z = origins[i * 3 + 2];
    } else if (nextMode === "grid") {
      const columns = 72;
      x = (i % columns) / (columns - 1) * 7 - 3.5;
      y = (Math.floor(i / columns) / Math.ceil(COUNT / columns) - 0.5) * 4.3;
      z = Math.sin(x * 2.2 + y) * 0.12;
    } else if (nextMode === "crop") {
      const row = i % 46;
      const depth = Math.floor(i / 46) / Math.ceil(COUNT / 46);
      x = (row / 45 - 0.5) * 6.5;
      z = (depth - 0.5) * 4;
      y = Math.sin(x * 1.8) * 0.2 + Math.pow(Math.max(0, Math.sin(depth * Math.PI)), 2) * 1.5 - 0.75;
    } else if (nextMode === "weather") {
      const lane = i % 24;
      const t = Math.floor(i / 24) / Math.ceil(COUNT / 24);
      x = (t - 0.5) * 8;
      y = (lane / 23 - 0.5) * 4 + Math.sin(t * 14 + lane * 0.45) * 0.5;
      z = Math.cos(t * 11 + lane) * 0.65;
    } else if (nextMode === "customers") {
      const c = i % clusterCenters.length;
      const center = clusterCenters[c];
      const angle = hash(i + 2) * Math.PI * 2;
      const radius = Math.sqrt(hash(i + 19)) * 0.78;
      x = center[0] + Math.cos(angle) * radius;
      y = center[1] + Math.sin(angle) * radius;
      z = center[2] + (hash(i + 38) - 0.5) * 1.1;
    } else if (nextMode === "beauty") {
      const category = i % 7;
      const angle = u * Math.PI * 30 + category * 0.35;
      const radius = 0.55 + category * 0.35 + Math.sin(i * 0.18) * 0.12;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
      z = Math.sin(angle * 3) * 0.35;
    } else if (nextMode === "spectrace") {
      const branch = i % 9;
      const t = Math.floor(i / 9) / Math.ceil(COUNT / 9);
      x = (t - 0.5) * 7.2;
      y = (branch - 4) * 0.42 + Math.sin(t * Math.PI * 4 + branch) * 0.16;
      z = Math.cos(t * Math.PI * 5 + branch * 0.7) * 0.38;
      if (branch === 4) y *= 0.18;
    } else if (nextMode === "network") {
      const lane = i % 8;
      const t = Math.floor(i / 8) / Math.ceil(COUNT / 8);
      const angle = t * Math.PI * 16 + lane * 0.45;
      x = Math.cos(angle) * (0.55 + lane * 0.34);
      y = (t - 0.5) * 5.2;
      z = Math.sin(angle) * (0.55 + lane * 0.34);
    } else if (nextMode === "archive") {
      const shelf = i % 9;
      const column = Math.floor(i / 9) / Math.ceil(COUNT / 9);
      x = (column - 0.5) * 7;
      y = (shelf - 4) * 0.48;
      z = Math.sin(column * 22 + shelf) * 0.3;
    } else if (nextMode === "world") {
      const angle = u * Math.PI * 28;
      const radius = 2.4 + Math.sin(i * 0.4) * 0.35;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 0.7;
      z = (hash(i + 11) - 0.5) * 2;
    } else if (nextMode === "helix") {
      const angle = u * Math.PI * 22;
      const side = i % 2 ? 1 : -1;
      x = Math.cos(angle) * 1.35 * side;
      y = (u - 0.5) * 5.6;
      z = Math.sin(angle) * 1.35 * side;
    } else {
      const row = i % 70;
      x = (row / 69 - 0.5) * 6.2;
      y = (Math.floor(i / 70) / Math.ceil(COUNT / 70) - 0.5) * 3.8;
      z = 0;
    }
    targets.set([x, y, z], i * 3);
  }

  const state = {
    chaos: [0, 0, 1, 0.86], grid: [2.6, 0, 0.92, 0.35], crop: [-2.2, 0, 1.08, 0.76], weather: [2.25, 0, 1.05, 0.68],
    customers: [-2.2, 0, 1.07, 0.74], beauty: [2.25, 0, 1.05, 0.69], spectrace: [0, 0, 1.02, 0.78], network: [2.5, 0, 1.05, 0.46], archive: [-2.4, 0, 1, 0.38],
    world: [0.4, 0, 1.08, 0.65], helix: [2.5, 0, 1.1, 0.8], final: [2.3, 0, 0.95, 0.35]
  }[nextMode] || [0, 0, 1, 0.7];
  const sceneX = mobile ? state[0] * 0.36 : state[0];
  if (gsap && !reducedMotion) {
    gsap.to(world.position, { x: sceneX, y: state[1], duration: 1.25, ease: "power3.inOut" });
    gsap.to(world.scale, { x: state[2], y: state[2], z: state[2], duration: 1.25, ease: "power3.inOut" });
    gsap.to(pointMaterial.uniforms.uOpacity, { value: state[3], duration: 0.8 });
  } else {
    world.position.set(sceneX, state[1], 0);
    world.scale.setScalar(state[2]);
    pointMaterial.uniforms.uOpacity.value = state[3];
  }
}

function resolveAt(value) {
  targetScannerPosition = THREE.MathUtils.clamp(value, 0.02, 0.98);
  resolveTarget = Math.max(resolveTarget, targetScannerPosition);
  scanner.setAttribute("aria-valuenow", Math.round(targetScannerPosition * 100));
  if (targetScannerPosition > 0.82 && !hero.classList.contains("is-resolved")) {
    hero.classList.add("is-resolved");
    hero.querySelector(".hero-copy").setAttribute("aria-hidden", "true");
    hero.querySelector(".identity").setAttribute("aria-hidden", "false");
    signalButton.setAttribute("aria-label", "Continue to introduction");
  }
}

function moveFromPointer(clientX) {
  const bounds = scanner.parentElement.getBoundingClientRect();
  resolveAt((clientX - bounds.left) / bounds.width);
}

let dragging = false;
scanner.addEventListener("pointerdown", (event) => {
  dragging = true;
  scanner.setPointerCapture(event.pointerId);
  moveFromPointer(event.clientX);
});
scanner.addEventListener("pointermove", (event) => { if (dragging) moveFromPointer(event.clientX); });
scanner.addEventListener("pointerup", () => { dragging = false; });
scanner.addEventListener("pointercancel", () => { dragging = false; });
scanner.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    resolveAt(targetScannerPosition + (event.key === "ArrowRight" ? 0.08 : -0.08));
  }
});

function completeSignal() {
  if (hero.classList.contains("is-resolved")) {
    document.querySelector(".intro").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    return;
  }
  const proxy = { value: targetScannerPosition };
  if (gsap && !reducedMotion) {
    gsap.to(proxy, { value: 0.96, duration: 0.9, ease: "power3.inOut", onUpdate: () => resolveAt(proxy.value) });
  } else resolveAt(0.96);
}
signalButton.addEventListener("click", completeSignal);

if (coarsePointer || reducedMotion) setTimeout(() => resolveAt(0.96), reducedMotion ? 150 : 1700);

addEventListener("pointermove", (event) => {
  pointerX = event.clientX / innerWidth - 0.5;
  pointerY = event.clientY / innerHeight - 0.5;
  const about = document.querySelector(".about-paths");
  if (about && mode === "grid") {
    about.style.setProperty("--path-x", (pointerX * 18).toFixed(2));
    about.style.setProperty("--path-y", (pointerY * 12).toFixed(2));
    about.querySelectorAll("path").forEach((path, index) => {
      const depth = 8 + index * 7;
      path.style.translate = `${(pointerX * depth).toFixed(2)}px ${(pointerY * depth * 0.65).toFixed(2)}px`;
    });
  }
  if (sculptureDrag) dragRotation += (event.clientX - dragStartX) * 0.003;
  dragStartX = event.clientX;
});
document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

document.querySelectorAll(".customer-notes span").forEach((label, index) => {
  label.addEventListener("pointerenter", () => { hoveredCluster = index; });
  label.addEventListener("pointerleave", () => { hoveredCluster = -1; });
});

const beyondSection = document.querySelector("#beyond");
beyondSection.addEventListener("pointerdown", (event) => {
  sculptureDrag = true;
  dragStartX = event.clientX;
  beyondSection.setPointerCapture?.(event.pointerId);
});
beyondSection.addEventListener("pointerup", () => { sculptureDrag = false; });
beyondSection.addEventListener("pointercancel", () => { sculptureDrag = false; });

const objectButtons = [...document.querySelectorAll(".world-stop button")];
let activeObject = "";
function activateWorldObject(button, react = false) {
    activeObject = button.closest(".world-stop").dataset.object;
    objectButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
      item.closest(".world-stop").classList.toggle("is-active", item === button);
    });
    if (!gsap || !react) return;
    if (activeObject === "tea") {
      gsap.timeline().to(teapot.rotation, { z: -0.58, duration: 0.55, ease: "power2.inOut" }).fromTo(teaPour.scale, { y: 0 }, { y: 1, duration: 0.45, yoyo: true, repeat: 1, repeatDelay: 0.55 }, "-=.12").to(teaFill.scale, { y: 1, duration: 0.9 }, "-=.9").to(steam.children.map((item) => item.material), { opacity: 0.42, stagger: 0.1, duration: 0.5 }, "-=.35").to(teapot.rotation, { z: 0, duration: 0.7, ease: "power2.inOut" });
      gsap.to(steam.children.map((item) => item.material), { opacity: 0, delay: 2.4, duration: 1.2 });
      gsap.to(teaFill.scale, { y: 0.02, delay: 2.7, duration: 0.8 });
    }
    if (activeObject === "books") {
      gsap.to(coverA.rotation, { x: -1.15, z: 0.12, duration: 0.8, ease: "power3.inOut", yoyo: true, repeat: 1, repeatDelay: 0.7 });
      gsap.to(book.position, { y: -0.68, duration: 0.6, ease: "back.out(1.5)", yoyo: true, repeat: 1, repeatDelay: 0.9 });
    }
    if (activeObject === "flowers") {
      flowerPetals.forEach((petal, index) => gsap.to(petal.scale, { x: 1.65, y: 0.68, duration: 0.55, delay: index * 0.025, ease: "back.out(2)" }));
      fallingPetals.forEach((petal, index) => {
        petal.visible = true;
        gsap.fromTo(petal.position, { y: 1.55, x: -1.45 + index * 0.19 }, { y: -1.9, x: `+=${index % 2 ? .65 : -.55}`, duration: 2.6 + index * .2, delay: index * .12, ease: "power1.in", onComplete: () => { petal.visible = false; } });
        gsap.to(petal.rotation, { z: Math.PI * (2 + index), duration: 2.7, delay: index * .12 });
      });
    }
    if (activeObject === "travel") contours.forEach((contour, index) => gsap.to(contour.position, { y: -1.3 + index * 0.13, z: -0.9 + index * 0.12, duration: 0.75, delay: index * 0.06, ease: "power3.out", yoyo: true, repeat: 1, repeatDelay: 0.8 }));
    if (activeObject === "writing") gsap.to(notebook.rotation, { y: -0.38, x: 0.08, duration: 0.7, ease: "back.out(1.6)", yoyo: true, repeat: 1, repeatDelay: 0.8 });
    if (activeObject === "painting") gsap.to(brush.rotation, { z: 0.35, duration: 0.5, ease: "back.out(1.8)", yoyo: true, repeat: 1 });
}
objectButtons.forEach((button) => {
  button.addEventListener("click", () => activateWorldObject(button, true));
});

const personalDeck = document.querySelector(".personal-deck");
const personalCards = [...document.querySelectorAll(".personal-card")];
personalCards.forEach((card) => card.addEventListener("click", () => {
  const willOpen = !card.classList.contains("is-active");
  personalCards.forEach((item) => item.classList.remove("is-active"));
  card.classList.toggle("is-active", willOpen);
}));
if (personalDeck && beyondSection) {
  const beyondObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) beyondSection.classList.add("is-seen");
  }, { threshold: .28 });
  beyondObserver.observe(beyondSection);
  personalDeck.addEventListener("pointermove", (event) => {
    if (matchMedia("(max-width: 700px)").matches || reducedMotion) return;
    const rect = personalDeck.getBoundingClientRect();
    personalDeck.style.setProperty("--deck-ry", `${((event.clientX - rect.left) / rect.width - .5) * 2.2}deg`);
    personalDeck.style.setProperty("--deck-rx", `${((event.clientY - rect.top) / rect.height - .5) * -1.6}deg`);
  });
  personalDeck.addEventListener("pointerleave", () => {
    personalDeck.style.setProperty("--deck-ry", "0deg");
    personalDeck.style.setProperty("--deck-rx", "0deg");
  });
}

const paintCanvas = document.querySelector("#paintLayer");
const paintContext = paintCanvas.getContext("2d");
let painting = false;
let paintFadeTimer;
function sizePaintCanvas() {
  const ratio = Math.min(devicePixelRatio, 1.5);
  paintCanvas.width = Math.max(1, Math.floor(paintCanvas.clientWidth * ratio));
  paintCanvas.height = Math.max(1, Math.floor(paintCanvas.clientHeight * ratio));
  paintContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  paintContext.lineCap = "round";
  paintContext.lineJoin = "round";
  paintContext.lineWidth = 5;
  paintContext.strokeStyle = "rgba(185,255,56,.55)";
}
sizePaintCanvas();
beyondSection.addEventListener("pointerdown", (event) => {
  if (activeObject !== "painting" || event.target.closest("button")) return;
  painting = true;
  const rect = paintCanvas.getBoundingClientRect();
  paintContext.beginPath();
  paintContext.moveTo(event.clientX - rect.left, event.clientY - rect.top);
});
beyondSection.addEventListener("pointermove", (event) => {
  if (!painting) return;
  const rect = paintCanvas.getBoundingClientRect();
  paintContext.lineTo(event.clientX - rect.left, event.clientY - rect.top);
  paintContext.stroke();
});
function stopPainting() {
  if (!painting) return;
  painting = false;
  clearTimeout(paintFadeTimer);
  paintFadeTimer = setTimeout(() => paintContext.clearRect(0, 0, paintCanvas.clientWidth, paintCanvas.clientHeight), 1300);
}
beyondSection.addEventListener("pointerup", stopPainting);
beyondSection.addEventListener("pointercancel", stopPainting);

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mobileMenu.classList.toggle("is-open", !open);
  document.body.classList.toggle("menu-open", !open);
});
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

function updateActiveNav(id) {
  document.querySelectorAll(".desktop-nav a, .mobile-menu a").forEach((link) => {
    const active = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
addEventListener("resize", () => { if (innerWidth > 900) closeMenu(); }, { passive: true });

document.querySelectorAll(".chapter[data-scene]").forEach((section) => {
  if (!ScrollTrigger) return;
  ScrollTrigger.create({
    trigger: section,
    start: "top 55%",
    end: "bottom 45%",
    onEnter: () => setTarget(section.dataset.scene),
    onEnterBack: () => setTarget(section.dataset.scene),
    onToggle: (self) => {
      if (self.isActive) {
        document.querySelector("#sectionCount").textContent = `${section.dataset.index} / 07`;
        if (section.id) updateActiveNav(section.id);
      }
    }
  });
});

const projectScenes = [...document.querySelectorAll(".project[data-project]")];
const projectTransitionWrappers = projectScenes.map((project) => {
  const wrapper = document.createElement("div");
  wrapper.className = "project-transition-wrapper";
  project.parentNode.insertBefore(wrapper, project);
  wrapper.appendChild(project);
  return wrapper;
});

const weatherVisual = document.querySelector(".weather-notes");
if (weatherVisual) {
  weatherVisual.insertAdjacentHTML("afterbegin", `<svg class="weather-flow" viewBox="0 0 600 420" preserveAspectRatio="none" aria-hidden="true"><path id="airflow-a" d="M-30 285 C110 70 235 360 630 115"/><path id="airflow-b" d="M-35 120 C160 300 330 30 635 250"/><path id="airflow-c" d="M-20 345 C180 210 315 390 625 185"/><path id="airflow-d" d="M-30 205 C135 115 375 315 630 75"/><circle r="3"><animateMotion dur="7.5s" repeatCount="indefinite"><mpath href="#airflow-a"/></animateMotion></circle><circle r="2.5"><animateMotion dur="9s" begin="-3s" repeatCount="indefinite"><mpath href="#airflow-b"/></animateMotion></circle><circle r="2"><animateMotion dur="6.8s" begin="-4.5s" repeatCount="indefinite"><mpath href="#airflow-c"/></animateMotion></circle><circle r="2.5"><animateMotion dur="10s" begin="-6s" repeatCount="indefinite"><mpath href="#airflow-d"/></animateMotion></circle></svg>`);
}

document.querySelectorAll(".customer-notes span").forEach((cluster, clusterIndex) => {
  const pointCount = mobile ? 7 : 12;
  for (let index = 0; index < pointCount; index += 1) {
    const point = document.createElement("i");
    point.style.setProperty("--point-x", `${16 + ((index * 31 + clusterIndex * 17) % 68)}%`);
    point.style.setProperty("--point-y", `${15 + ((index * 43 + clusterIndex * 23) % 70)}%`);
    point.style.setProperty("--point-delay", `${-(index * .37 + clusterIndex)}s`);
    cluster.appendChild(point);
  }
});

const beautyVisual = document.querySelector(".beauty-notes");
if (beautyVisual) {
  const layerLabels = [...beautyVisual.querySelectorAll("div span")];
  layerLabels.forEach((label, index) => {
    label.dataset.layer = index;
    const ring = document.createElement("i");
    ring.className = "beauty-layer-ring";
    ring.style.setProperty("--layer", index);
    beautyVisual.appendChild(ring);
    label.addEventListener("pointerenter", () => beautyVisual.dataset.focus = String(index));
    label.addEventListener("click", () => beautyVisual.dataset.focus = beautyVisual.dataset.focus === String(index) ? "overview" : String(index));
  });
  beautyVisual.addEventListener("pointerleave", () => beautyVisual.dataset.focus = "overview");
  beautyVisual.dataset.focus = "overview";
  const particleField = document.createElement("span");
  particleField.className = "beauty-particles";
  const pointCount = mobile ? 18 : 38;
  for (let index = 0; index < pointCount; index += 1) {
    const point = document.createElement("i");
    point.style.setProperty("--orbit-angle", `${index * (360 / pointCount)}deg`);
    point.style.setProperty("--orbit-radius", `${72 + (index % 5) * (mobile ? 22 : 38)}px`);
    point.style.setProperty("--orbit-delay", `${-index * .29}s`);
    point.style.setProperty("--node-layer", index % 5);
    particleField.appendChild(point);
  }
  beautyVisual.appendChild(particleField);
  if (!reducedMotion) {
    let beautyFocusStep = 0;
    setInterval(() => {
      if (beautyVisual.matches(":hover")) return;
      beautyFocusStep = (beautyFocusStep + 1) % 11;
      beautyVisual.dataset.focus = beautyFocusStep % 2 ? String(Math.floor(beautyFocusStep / 2)) : "overview";
    }, 2800);
  }
}
projectScenes.forEach((project) => {
  if (!ScrollTrigger) return;
  ScrollTrigger.create({
    trigger: project,
    start: "top 55%",
    end: "bottom 45%",
    onEnter: () => setTarget(project.dataset.project),
    onEnterBack: () => setTarget(project.dataset.project),
    onUpdate: (self) => {
      sceneProgress = self.progress;
      project.style.setProperty("--scene-progress", self.progress.toFixed(3));
      camera.position.z = 10 - Math.sin(self.progress * Math.PI) * 0.52;
      camera.position.y = Math.sin(self.progress * Math.PI * 2) * 0.12;
    }
  });
  gsap.set(project.querySelectorAll(".project-index, h2, .project-deck, .story-grid, .project-foot"), {
    clearProps: "transform,opacity,visibility,filter"
  });
});

document.querySelector(".legacy-experience-system")?.remove();
document.querySelector(".learning .community-map")?.remove();

if (ScrollTrigger) {
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => { document.querySelector("#progressBar").style.height = `${self.progress * 100}%`; } });
  if (projectTransition) {
    if (reducedMotion) {
      projectTransitionProgress = 1;
    } else {
      const hookCopy = projectTransition.querySelector(".project-hook-copy");
      const hookLabel = hookCopy.querySelector("p");
      const hookHeadline = hookCopy.querySelector("h2");
      const transitionGrid = projectTransition.querySelector(".transition-grid");
      const tiles = [...projectTransition.querySelectorAll(".transition-tile")].sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
      gsap.set([hookLabel, hookHeadline], { opacity: 0, y: 38 });
      gsap.set(tiles, { opacity: 0, scale: 0 });
      const transitionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: projectTransition,
          start: "top top",
          end: "+=112%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            projectTransitionProgress = self.progress;
          }
        }
      });
      tiles.forEach((tile, index) => {
        const start = .04 + index * .018;
        const horizontal = index % 3 === 0;
        transitionTimeline.to(tile, {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          duration: horizontal ? .20 : .17,
          ease: "power2.inOut"
        }, start);
      });
      transitionTimeline
        .to(projectTransition, { color: "#f1efe8", duration: .14, ease: "power1.inOut" }, .45)
        .to(hookLabel, { opacity: 1, y: 0, duration: .12, ease: "power2.out" }, .48)
        .to(hookHeadline, { opacity: 1, y: 0, duration: .20, ease: "power3.out" }, .53)
        .to(transitionGrid, { opacity: .48, y: 0, duration: .22, ease: "power2.out" }, .68);
    }
  }
  if (!reducedMotion) {
    document.querySelectorAll(".intro-layout, .section-head, .learning-intro, .community-map, .archive-list, .beyond-title, .world-tour, .contact h2, .contact-links").forEach((element) => {
      gsap.from(element, { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 86%" } });
    });
    gsap.to(".about-paths", { scale: 0.12, opacity: 0, transformOrigin: "50% 55%", ease: "power2.inOut", scrollTrigger: { trigger: "#about", start: "55% top", end: "bottom top", scrub: 1 } });
    gsap.to(".path-dominant", { strokeDashoffset: -180, ease: "none", scrollTrigger: { trigger: "#about", start: "top center", end: "bottom top", scrub: 1 } });
    gsap.to(".path-node", { y: (index) => index % 2 ? -24 : 18, stagger: 0.03, ease: "power1.inOut", scrollTrigger: { trigger: "#about", start: "top 70%", end: "bottom 20%", scrub: 1 } });
    gsap.to(".intro-layout", { y: -18, opacity: 0, ease: "power2.in", scrollTrigger: { trigger: "#about", start: "78% top", end: "bottom top", scrub: .45 } });
    gsap.to(".intro-wave-canvas", { x: "10vw", opacity: 0, ease: "power1.in", scrollTrigger: { trigger: "#about", start: "84% top", end: "bottom top", scrub: .45 } });
  }

  const experienceStageV4 = document.querySelector(".experience-v4-stage");
  const experienceChoicesV4 = [...document.querySelectorAll("[data-experience-choice]")];
  const experienceFormsV4 = [...document.querySelectorAll("[data-v4-detail]")];
  const experienceDetailsV4 = [...document.querySelectorAll(".experience-v4-detail [data-experience-detail]")];
  const showExperienceDetailV4 = (name) => {
    experienceFormsV4.forEach((form) => form.classList.toggle("is-active", form.dataset.v4Detail === name));
    experienceDetailsV4.forEach((detail) => detail.classList.toggle("is-active", detail.dataset.experienceDetail === name));
  };
  const selectExperienceV4 = (mode) => {
    if (!experienceStageV4) return;
    experienceStageV4.dataset.mode = mode;
    experienceChoicesV4.forEach((choice) => {
      const selected = choice.dataset.experienceChoice === mode;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    showExperienceDetailV4(mode === "koder" ? "discover" : "speak");
    if (!reducedMotion && gsap) {
      if (mode === "koder") {
        const arrivals = [{ x: -130, y: -70, r: -9 }, { x: 20, y: 130, r: 7 }, { x: 125, y: -80, r: 8 }, { x: -110, y: 95, r: -6 }, { x: 145, y: 105, r: 9 }];
        gsap.fromTo(".puzzle-piece", { opacity: 0, x: (i) => arrivals[i].x, y: (i) => arrivals[i].y, z: (i) => 70 + i * 8, rotation: (i) => arrivals[i].r, rotateX: -10 }, { opacity: 1, x: 0, y: 0, z: 0, rotation: 0, rotateX: 0, stagger: .16, duration: 1.05, ease: "expo.out", overwrite: true, onComplete: () => gsap.set(".puzzle-piece", { clearProps: "transform,opacity" }) });
      } else {
        gsap.fromTo(".network-person", { opacity: 0, z: -65, scale: .78 }, { opacity: 1, z: 0, scale: 1, stagger: .11, duration: .75, ease: "power3.out", overwrite: true });
      }
    }
  };
  experienceChoicesV4.forEach((choice) => choice.addEventListener("click", () => selectExperienceV4(choice.dataset.experienceChoice)));
  experienceFormsV4.forEach((form) => {
    form.addEventListener("pointerenter", () => showExperienceDetailV4(form.dataset.v4Detail));
    form.addEventListener("focus", () => showExperienceDetailV4(form.dataset.v4Detail));
    form.addEventListener("click", () => showExperienceDetailV4(form.dataset.v4Detail));
  });
  if (experienceStageV4) requestAnimationFrame(() => selectExperienceV4("koder"));
  objectButtons.forEach((button, index) => {
    const stop = button.closest(".world-stop");
    ScrollTrigger.create({
      trigger: stop,
      start: "top 58%",
      end: "bottom 42%",
      onEnter: () => activateWorldObject(button),
      onEnterBack: () => activateWorldObject(button),
      onUpdate: (self) => {
        if (activeObject !== stop.dataset.object) return;
        worldObjects.position.x += (((index - 2.5) * -0.32 + pointerX * .18) - worldObjects.position.x) * .08;
        worldObjects.position.y += ((.35 - index * .12 + (self.progress - .5) * .4) - worldObjects.position.y) * .08;
        worldObjects.position.z += ((index % 2 ? .2 : -.12) - worldObjects.position.z) * .08;
      }
    });
  });
  if (!reducedMotion) gsap.from(".archive-list li", { x: (index) => index % 2 ? 42 : -42, opacity: 0, stagger: 0.09, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: ".archive-list", start: "top 82%" } });
}

function updateHeroResolution() {
  scannerPosition += (targetScannerPosition - scannerPosition) * 0.1;
  resolveProgress += (resolveTarget - resolveProgress) * 0.055;
  scanner.style.left = `${scannerPosition * 100}%`;

  for (let i = 0; i < COUNT; i += 1) {
    const normalizedX = THREE.MathUtils.clamp((pointX[i] + 5.25) / 10.5, 0, 1);
    const localResolve = THREE.MathUtils.smoothstep(resolveProgress - normalizedX, -0.04, 0.12);
    const gridX = (i % 70) / 69 * 7.8 - 3.9;
    const gridY = (Math.floor(i / 70) / Math.ceil(COUNT / 70) - 0.5) * 4.2;
    targets[i * 3] = THREE.MathUtils.lerp(origins[i * 3], gridX, localResolve);
    targets[i * 3 + 1] = THREE.MathUtils.lerp(origins[i * 3 + 1], gridY, localResolve);
    targets[i * 3 + 2] = THREE.MathUtils.lerp(origins[i * 3 + 2], -0.35, localResolve);
  }
  labels.forEach((sprite, index) => {
    const normalizedX = THREE.MathUtils.clamp((sprite.userData.origin.x + 4.7) / 9.4, 0, 1);
    const localResolve = THREE.MathUtils.smoothstep(resolveProgress - normalizedX, -0.04, 0.13);
    sprite.position.lerpVectors(sprite.userData.origin, sprite.userData.target, localResolve);
    sprite.material.opacity = 0.88 - localResolve * 0.5;
    sprite.scale.x = 1.75 - localResolve * 0.3 + Math.sin(index) * 0.02;
  });
  lineMaterial.opacity = Math.max(0, resolveProgress - 0.55) * 0.9;
}

function updateConnections() {
  const source = geometry.attributes.position.array;
  for (let i = 0; i < lineCount; i += 1) {
    const a = (i * 41) % COUNT;
    const b = (a + 1 + (i % 6)) % COUNT;
    linePositions.set([source[a * 3], source[a * 3 + 1], source[a * 3 + 2], source[b * 3], source[b * 3 + 1], source[b * 3 + 2]], i * 6);
  }
  lineGeometry.attributes.position.needsUpdate = true;
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !visible) return;
  const time = clock.getElapsedTime();
  pointMaterial.uniforms.uTime.value = reducedMotion ? 0 : time;
  if (mode === "chaos") updateHeroResolution();

  const positionArray = geometry.attributes.position.array;
  const ease = reducedMotion ? 0.14 : 0.075;
  for (let i = 0; i < COUNT; i += 1) {
    let goalX = targets[i * 3];
    let goalY = targets[i * 3 + 1];
    let goalZ = targets[i * 3 + 2];
    if (mode === "crop") {
      const growth = 0.18 + THREE.MathUtils.smoothstep(sceneProgress, 0.08, 0.72) * 0.82;
      goalY = targets[i * 3 + 1] * growth - (1 - growth) * 0.65;
      goalZ += Math.sin(i * 0.07) * (1 - growth) * 0.8;
    } else if (mode === "weather" && !reducedMotion) {
      const flow = time * (0.7 + sceneProgress * 0.45) + i * 0.021;
      goalY += Math.sin(flow) * (0.12 + Math.abs(pointerX) * 0.42);
      goalZ += Math.cos(flow * 0.73) * 0.16 + pointerY * 0.45;
      goalX += pointerX * 0.8;
    } else if (mode === "customers" && hoveredCluster >= 0 && i % 5 === hoveredCluster) {
      goalX *= 1.16;
      goalY *= 1.16;
      goalZ *= 1.25;
    }
    positionArray[i * 3] += (goalX - positionArray[i * 3]) * ease;
    positionArray[i * 3 + 1] += (goalY - positionArray[i * 3 + 1]) * ease;
    positionArray[i * 3 + 2] += (goalZ - positionArray[i * 3 + 2]) * ease;
  }
  geometry.attributes.position.needsUpdate = true;
  updateConnections();

  if (!reducedMotion) {
    world.rotation.y += 0.0007;
    world.rotation.x += ((-pointerY * 0.11) - world.rotation.x) * 0.022;
    camera.position.x += (pointerX * 0.2 - camera.position.x) * 0.025;
    worldObjects.rotation.y += ((pointerX * 0.35 + dragRotation) - worldObjects.rotation.y) * 0.035;
    worldObjects.rotation.x += ((-pointerY * 0.18) - worldObjects.rotation.x) * 0.035;
    flower.rotation.z = time * 0.08;
    cup.position.y = 0.8 + Math.sin(time * 0.7) * 0.08;
    if (mode === "beauty") particles.rotation.z = sceneProgress * Math.PI * 0.32 + pointerX * 0.08;
    else particles.rotation.z *= 0.94;
    if (mode === "crop") {
      cropDecor.rotation.y += ((pointerX * 0.16) - cropDecor.rotation.y) * 0.04;
      cropDecor.children.slice(1).forEach((stem, index) => { stem.scale.y = 0.25 + THREE.MathUtils.smoothstep(sceneProgress - index * 0.008, 0.05, 0.62) * 0.75; });
    }
    if (mode === "beauty") beautyDecor.rotation.z = time * 0.045 + pointerX * 0.14;
    if (mode === "spectrace") traceDecor.rotation.y += ((pointerX * 0.2) - traceDecor.rotation.y) * 0.035;
    if (mode === "customers") lineMaterial.opacity += (((hoveredCluster >= 0 ? 0.2 : 0.045)) - lineMaterial.opacity) * 0.08;
  }
  if (mode === "grid") {
    thoughtStreams.forEach((stream) => {
      const travel = reducedMotion ? stream.offset : (stream.offset + time * stream.speed) % 1;
      stream.points.forEach((point, pointIndex) => {
        const normalizedX = pointIndex / (stream.points.length - 1);
        const distance = Math.abs(normalizedX - (.5 + pointerX * .32));
        const repel = reducedMotion ? 0 : Math.max(0, 1 - distance * 8) * (-pointerY * .62);
        point.y = stream.baseY + Math.sin(pointIndex * 1.15 + stream.index + time * (.13 + stream.index * .01)) * .43 + repel;
      });
      stream.curve.points = stream.points;
      stream.geometry.setFromPoints(stream.curve.getPoints(150));
      const position = stream.curve.getPointAt(travel);
      stream.node.position.copy(position);
      stream.label.position.copy(position).add(new THREE.Vector3(.5, .2, 0));
      stream.line.position.x = ((time * (.08 + stream.index * .012)) % 1.9) - .95;
      stream.node.position.x += stream.line.position.x;
      stream.label.position.x += stream.line.position.x;
    });
  }
  if (mode === "world" && !reducedMotion) {
    steam.position.y = 1.22 + Math.sin(time * 1.4) * .05;
    fallingPetals.forEach((petal, index) => { if (petal.visible) petal.position.x += Math.sin(time * 1.8 + index) * .0018; });
  }
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (renderer) {
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.25 : 1.65));
  }
  sizePaintCanvas();
  sizeIntroWaves();
  sizeProjectTransition();
}
addEventListener("resize", resize, { passive: true });

setTarget("chaos");
animate();
requestAnimationFrame(() => {
  document.body.classList.remove("is-loading");
  document.body.classList.add("is-ready");
  if (gsap && !reducedMotion) {
    gsap.from(".hero-copy>*", { y: 35, opacity: 0, stagger: 0.08, duration: 0.9, delay: 0.25, ease: "power3.out" });
    gsap.from(".scanner", { scaleY: 0, duration: 1.1, delay: 0.4, ease: "power3.inOut" });
  }
});
