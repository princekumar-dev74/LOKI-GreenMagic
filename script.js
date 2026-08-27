import * as THREE from "three";

const bgMusic = document.getElementById("bg-music");
bgMusic.volume = 0.4;

const introElem = document.getElementById("intro");
const introImage = document.getElementById("intro-image");

const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `;

const fragmentShader = `
        uniform float uProgress;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = p * 2.05 + vec2(13.7, 9.1);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          vec2 center = vec2(0.5);
          vec2 distVec = uv - center;
          float dist = length(distVec);

          float t = uProgress * 6.2831;

          float alpha = 0.0;
          vec3 color = vec3(0.0);

          if (uProgress <= 0.5) {
            float pNorm = uProgress / 0.5;
            vec2 p = uv * 3.5;
            vec2 warp = vec2(fbm(p + vec2(0.0, t * 0.1)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.08, 0.0)));
            float w = fbm(p + 1.1 * warp);

            float waves = sin(uv.x * 5.0 + t * 0.5) * 0.035 + sin(uv.x * 10.0 - t * 0.5) * 0.015;
            float wipe = uv.y + (w - 0.5) * 0.35 + waves;

            alpha = smoothstep(wipe - 0.15, wipe + 0.15, pNorm * 1.4 - 0.2);

            float tint = clamp((w - 0.5) * 0.5 + 0.5, 0.0, 1.0);
            color = mix(uColorA, uColorB, tint);
            color = mix(color, uColorC, sin(w * 6.28 + t * 0.5) * 0.5 + 0.5);

            float glow = 1.0 - smoothstep(0.0, 0.25, abs(pNorm - wipe));
            color += glow * vec3(0.05, 0.95, 0.45);
          } else {
            float pNorm = (uProgress - 0.5) / 0.5;
            
            float angle = atan(distVec.y, distVec.x);
            vec2 fireUv = vec2(dist * 3.5 - t * 0.12, angle * 2.5);
            float fireNoise = fbm(fireUv + fbm(fireUv * 1.5));

            float fireRadius = pNorm * 2.2;
            float edge = fireRadius - (fireNoise * 0.28);
            
            float bloom = 1.0 - smoothstep(edge - 0.3, edge + 0.15, dist);
            float smoothFade = 1.0 - smoothstep(0.45, 1.0, pNorm);
            alpha = bloom * smoothFade;

            float innerGlow = smoothstep(edge - 0.45, edge, dist);
            color = mix(uColorA, uColorB, fireNoise + innerGlow * 0.6);
            color = mix(color, uColorC, innerGlow);

            float rim = smoothstep(0.0, 0.15, abs(dist - edge));
            color += (1.0 - rim) * vec3(0.1, 0.95, 0.5) * 2.0;
          }

          gl_FragColor = vec4(color, alpha);
        }
      `;

const canvas = document.getElementById("shader-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const uniforms = {
  uProgress: { value: 0 },
  uColorA: { value: new THREE.Color("#022e1b") },
  uColorB: { value: new THREE.Color("#00ff99") },
  uColorC: { value: new THREE.Color("#044d2d") },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  transparent: true,
});

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(mesh);

const progress = { value: 0 };

function animate() {
  uniforms.uProgress.value = progress.value;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

let introTL = null;
function startIntroTransition() {
  if (introTL) return;

  introTL = gsap.timeline({
    onComplete: () => {
      introElem.style.display = "none";
    },
  });

  introTL.to(introImage, {
    scale: 1.25,
    opacity: 0,
    filter: "drop-shadow(0 0 60px rgba(0, 255, 136, 0.95)) blur(10px)",
    duration: 2.4,
    ease: "power2.out",
  });

  introTL.to(
    progress,
    {
      value: 0.5,
      duration: 3.2,
      ease: "power2.inOut",
    },
    "-=2.0",
  );

  introTL.to(
    introElem,
    {
      opacity: 0,
      duration: 1.4,
      ease: "power1.out",
    },
    "-=1.0",
  );

  introTL.to(
    progress,
    {
      value: 0,
      duration: 3.5,
      ease: "power2.out",
    },
    "-=0.8",
  );
}

introImage.addEventListener("click", () => {
  bgMusic.play().catch((err) => console.warn(err));
  startIntroTransition();
});
introImage.addEventListener("touchstart", (e) => {
  e.preventDefault();
  bgMusic.play().catch((err) => console.warn(err));
  startIntroTransition();
});

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});

function drawLightningSegmentOnContext(
  ctx,
  x1,
  y1,
  x2,
  y2,
  displace,
  branchProb,
) {
  if (displace < 2.5) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;

  drawLightningSegmentOnContext(
    ctx,
    x1,
    y1,
    midX,
    midY,
    displace / 2,
    branchProb,
  );
  drawLightningSegmentOnContext(
    ctx,
    midX,
    midY,
    x2,
    y2,
    displace / 2,
    branchProb,
  );

  if (Math.random() < branchProb) {
    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    const length = displace * (0.8 + Math.random() * 0.6);
    const branchX = midX + Math.cos(angle) * length;
    const branchY = midY + Math.sin(angle) * length;
    drawLightningSegmentOnContext(
      ctx,
      midX,
      midY,
      branchX,
      branchY,
      displace / 2.2,
      branchProb * 0.4,
    );
  }
}

const cursorDot = document.getElementById("custom-cursor");
const trailCanvas = document.getElementById("cursor-trail-canvas");
const trailCtx = trailCanvas.getContext("2d");

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let lastMouseX = mouseX;
let lastMouseY = mouseY;
let isHovered = false;
let cursorStrikes = [];

function resizeTrailCanvas() {
  trailCanvas.width = window.innerWidth;
  trailCanvas.height = window.innerHeight;
}
resizeTrailCanvas();

function handlePointerMove(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;

  mouseX = x;
  mouseY = y;

  gsap.to(cursorDot, {
    x: mouseX,
    y: mouseY,
    duration: 0.1,
    ease: "power2.out",
  });

  const dist = Math.hypot(mouseX - lastMouseX, mouseY - lastMouseY);
  if (dist > 8) {
    cursorStrikes.push({
      x1: lastMouseX,
      y1: lastMouseY,
      x2: mouseX,
      y2: mouseY,
      life: 1.0,
      maxLife: 1.0,
      displace: isHovered ? 16 : 9,
      branchProb: isHovered ? 0.35 : 0.2,
    });
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}

window.addEventListener("mousemove", handlePointerMove);
window.addEventListener("touchmove", handlePointerMove, { passive: true });

function renderCursorThunder() {
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

  for (let i = cursorStrikes.length - 1; i >= 0; i--) {
    const strike = cursorStrikes[i];
    if (strike.life <= 0) {
      cursorStrikes.splice(i, 1);
      continue;
    }

    const alpha = strike.life / strike.maxLife;

    trailCtx.save();
    trailCtx.strokeStyle = `rgba(0, 255, 170, ${alpha * 0.85})`;
    trailCtx.shadowColor = "#00ffaa";
    trailCtx.shadowBlur = 8;
    trailCtx.lineWidth = isHovered ? 2.0 : 1.4;
    drawLightningSegmentOnContext(
      trailCtx,
      strike.x1,
      strike.y1,
      strike.x2,
      strike.y2,
      strike.displace,
      strike.branchProb,
    );

    trailCtx.strokeStyle = `rgba(209, 250, 229, ${alpha})`;
    trailCtx.lineWidth = 0.8;
    trailCtx.shadowBlur = 2;
    drawLightningSegmentOnContext(
      trailCtx,
      strike.x1,
      strike.y1,
      strike.x2,
      strike.y2,
      strike.displace,
      strike.branchProb * 0.4,
    );
    trailCtx.restore();

    strike.life -= 0.04;
  }

  requestAnimationFrame(renderCursorThunder);
}
renderCursorThunder();

const interactables = [
  document.getElementById("home-image"),
  document.getElementById("about-image"),
  document.getElementById("intro-image"),
];
interactables.forEach((el) => {
  el.addEventListener("mouseenter", () => {
    isHovered = true;
    gsap.to(cursorDot, { scale: 1.8, duration: 0.4 });
  });
  el.addEventListener("mouseleave", () => {
    isHovered = false;
    gsap.to(cursorDot, { scale: 1, duration: 0.4 });
  });
});

const tCanvas = document.getElementById("thunder-canvas");
const tCtx = tCanvas.getContext("2d");
const thunderFlash = document.getElementById("thunder-flash");
const homeImage = document.getElementById("home-image");
let state = "home";

function resizeThunderCanvas() {
  tCanvas.width = window.innerWidth;
  tCanvas.height = window.innerHeight;
}
resizeThunderCanvas();

function triggerGreenThunder() {
  if (state !== "home") return;

  gsap.to(thunderFlash, {
    opacity: 0.7,
    duration: 0.2,
    yoyo: true,
    repeat: 1,
    ease: "power2.inOut",
  });

  gsap.to(homeImage, {
    x: () => (Math.random() - 0.5) * 6,
    y: () => (Math.random() - 0.5) * 6,
    duration: 0.1,
    repeat: 3,
    yoyo: true,
    onComplete: () => gsap.to(homeImage, { x: 0, y: 0, duration: 0.3 }),
  });

  let frames = 0;
  const startX = Math.random() * tCanvas.width;
  const startY = 0;
  const targetX = startX + (Math.random() - 0.5) * 450;
  const targetY = tCanvas.height * (0.4 + Math.random() * 0.5);

  function animateLightning() {
    tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);

    tCtx.save();
    tCtx.strokeStyle = "#00ffaa";
    tCtx.shadowColor = "#00ffaa";
    tCtx.shadowBlur = 12;
    tCtx.lineWidth = 2.5;
    drawLightningSegmentOnContext(
      tCtx,
      startX,
      startY,
      targetX,
      targetY,
      100,
      0.4,
    );

    tCtx.strokeStyle = "#d1fae5";
    tCtx.lineWidth = 1.2;
    tCtx.shadowBlur = 3;
    drawLightningSegmentOnContext(
      tCtx,
      startX,
      startY,
      targetX,
      targetY,
      100,
      0.2,
    );
    tCtx.restore();

    frames++;
    if (frames < 12) {
      requestAnimationFrame(animateLightning);
    } else {
      tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
    }
  }
  animateLightning();
}

function scheduleNextThunder() {
  const randomDelay = Math.random() * 2500 + 1500;

  setTimeout(() => {
    triggerGreenThunder();
    if (Math.random() > 0.6) {
      setTimeout(triggerGreenThunder, 350);
    }
    scheduleNextThunder();
  }, randomDelay);
}
scheduleNextThunder();

function handleResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeTrailCanvas();
  resizeThunderCanvas();
}
window.addEventListener("resize", handleResize);

const homeElem = document.getElementById("home");
const aboutLift = document.getElementById("about-lift");
const aboutImage = document.getElementById("about-image");

gsap.set(aboutLift, { y: 160 });
gsap.set(aboutImage, { opacity: 0, scale: 1, x: 0, y: 0 });

const parallaxX = gsap.quickTo(aboutImage, "x", {
  duration: 1.8,
  ease: "power2.out",
});
const parallaxY = gsap.quickTo(aboutImage, "y", {
  duration: 1.8,
  ease: "power2.out",
});

function handleParallax(e) {
  if (state !== "covered") return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const relX = clientX / window.innerWidth - 0.5;
  const relY = clientY / window.innerHeight - 0.5;
  parallaxX(relX * 50);
  parallaxY(relY * 50);
}

window.addEventListener("mousemove", handleParallax);
window.addEventListener("touchmove", handleParallax, { passive: true });

function coverScreen() {
  if (state !== "home") return;
  state = "covering";

  gsap.to(progress, {
    value: 0.5,
    duration: 4.5,
    ease: "power2.inOut",
    onComplete() {
      state = "covered";
      revealImage();
    },
  });
}

function revealImage() {
  aboutImage.style.pointerEvents = "auto";
  gsap.to(aboutLift, { y: 0, duration: 2.2, ease: "power3.out" });
  gsap.to(aboutImage, { opacity: 1, duration: 2.2, ease: "power3.out" });
}

function uncoverScreen() {
  if (state !== "covered") return;
  state = "uncovering";
  aboutImage.style.pointerEvents = "none";

  const tl = gsap.timeline();

  tl.to(aboutImage, {
    scale: 1.35,
    opacity: 0,
    duration: 2.5,
    ease: "power2.inOut",
  });

  tl.to(
    progress,
    {
      value: 1.0,
      duration: 9.0,
      ease: "power1.inOut",
      onComplete() {
        progress.value = 0;
        gsap.set(aboutLift, { y: 160 });
        gsap.set(aboutImage, { opacity: 0, scale: 1, x: 0, y: 0 });
        state = "home";
        window.dispatchEvent(new Event("transition:done"));
      },
    },
    "-=1.8",
  );

  tl.fromTo(
    homeElem,
    { opacity: 0, scale: 0.95, filter: "blur(10px)" },
    {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      duration: 5.0,
      ease: "power2.out",
    },
    "-=4.5",
  );
}

homeImage.addEventListener("click", coverScreen);
aboutImage.addEventListener("click", uncoverScreen);
homeImage.addEventListener("touchstart", (e) => {
  e.preventDefault();
  coverScreen();
});
aboutImage.addEventListener("touchstart", (e) => {
  e.preventDefault();
  uncoverScreen();
});

gsap.fromTo(
  homeElem,
  { opacity: 0, scale: 0.92 },
  { opacity: 1, scale: 1, duration: 2.8, ease: "power2.out", delay: 0.4 },
);
