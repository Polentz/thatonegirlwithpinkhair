// 3D prototype: the home page clusters float in space as groups of image
// cards. Drag empty space to orbit, wheel/pinch to zoom, right-drag to pan.
// The first click on a card marks a glowing dot; each later click draws a pink
// line from the previous click to that spot. A click also brings the card up close, captioned with its cluster's text; it floats back
// on the next click, drag, zoom or Escape. Each cluster shows its text among
// its images. Dragging on a card orbits, like empty space.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const PINK = 0xd81a7d;
const CARD_SIZE = 2;          // longest side of an image card, in world units 1.2
const CARD_SPACING = 10;       // min distance between cards in a cluster 1.4
const CLUSTER_RADIUS = 5;     // cards stay within this distance of their cluster's centre 2.4
const CLUSTER_SPACING = 2 * CLUSTER_RADIUS + 2.5; // min distance between cluster centres 
const UNIVERSE_RADIUS = 16;     // clusters are scattered inside this sphere 16
const TEXT_LINE_HEIGHT = CARD_SIZE * 0.25; // height of one line of cluster text
const TEXT_MAX_WIDTH = CARD_SIZE * 2;      // cluster text wraps beyond this width
const CLOSE_UP_DISTANCE = 6;    // how far in front of the camera a clicked card floats
const CLOSE_UP_SIZE = 0.6;      // share of the screen the close-up card fills
const DRAG_SLOP = 5;            // px of movement that counts as a drag, not a click 5

const container = document.querySelector(".universe");
const data = window.UNIVERSE_CLUSTERS || [];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Scene, camera, renderers ---------------------------------------------

const scene = new THREE.Scene();
const white = new THREE.Color(0xffffff);
scene.background = white;
// scene.fog = new THREE.Fog(0xffffff, 18, 60); // far clusters fade into the white

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// A see-through canvas on top of everything, for the close-up card only, so
// no other card can cover it. The close-up card is
// moved to this three.js layer while it's away from its cluster.
const CLOSE_UP_LAYER = 1;
const overlayRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
overlayRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
overlayRenderer.setSize(window.innerWidth, window.innerHeight);
overlayRenderer.domElement.classList.add("closeup-layer");
container.appendChild(overlayRenderer.domElement);

// --- Placement --------------------------------------------------------------

const randomInSphere = (radius) => {
    const v = new THREE.Vector3();
    do {
        v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    } while (v.lengthSq() > 1);
    return v.multiplyScalar(radius);
};

// `count` random points inside a sphere, trying to keep `minDistance` apart
// from each other and from any points already `taken`.
const scatterPoints = (count, radius, minDistance, taken = []) => {
    const points = [];
    for (let i = 0; i < count; i++) {
        let point;
        for (let attempt = 0; attempt < 300; attempt++) {
            point = randomInSphere(radius);
            if ([...taken, ...points].every((other) => other.distanceTo(point) >= minDistance)) break;
        }
        points.push(point);
    }
    return points;
};

// --- Cards --------------------------------------------------------------------

// Soft pink glow drawn behind each card, like the 2D box-shadow.
const glowMaterial = (() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.shadowColor = "rgba(216, 26, 125, 0.7)";
    ctx.shadowBlur = 48;
    ctx.fillStyle = "rgba(216, 26, 125, 0.35)";
    ctx.fillRect(size / 4, size / 4, size / 2, size / 2); // the card covers this middle half
    return new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
    });
})();

// The cluster's text as a glowing pink label drawn into the 3D scene, so cards
// in front of it can cover it. Wrapped to TEXT_MAX_WIDTH.
const makeTextLabel = (html) => {
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent.trim();

    const fontSize = 64;
    const lineHeight = fontSize * 1.2;
    const glowScale = fontSize / 20; // the site's glow is sized for ~20px text
    const glows = [[40, 0.8], [20, 0.7], [10, 0.5], [5, 0.2]]; // same layers as the CSS text-shadow
    const padding = 40 * glowScale;
    const pxPerUnit = lineHeight / TEXT_LINE_HEIGHT;
    const font = `${fontSize}px Helvetica, Arial, sans-serif`;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;

    const lines = [];
    let line = "";
    text.split(/\s+/).forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > TEXT_MAX_WIDTH * pxPerUnit) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);

    const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(lines.length * lineHeight + padding * 2);

    // Resizing the canvas resets the context, so set it up again.
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgb(216, 26, 125)";
    glows.forEach(([blur, alpha]) => {
        ctx.shadowColor = `rgba(216, 26, 125, ${alpha})`;
        ctx.shadowBlur = blur * glowScale;
        lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, padding + lineHeight * (i + 0.5)));
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const label = new THREE.Mesh(
        new THREE.PlaneGeometry(canvas.width / pxPerUnit, canvas.height / pxPerUnit),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    label.raycast = () => { }; // not clickable
    return label;
};

const loader = new THREE.TextureLoader();
const cards = [];   // card meshes, for picking
const holders = []; // card + glow pairs and text labels, turned to face the camera every frame

const clusterCentres = scatterPoints(data.length, UNIVERSE_RADIUS, CLUSTER_SPACING);

data.forEach((clusterData, i) => {
    const group = new THREE.Group();
    group.position.copy(clusterCentres[i]);
    scene.add(group);

    const cluster = { group, text: clusterData.text };

    // The text sits at the cluster's centre; the cards keep clear of it.
    const taken = [];
    if (clusterData.text) {
        const label = makeTextLabel(clusterData.text);
        group.add(label);
        holders.push(label); // faces the camera like the cards
        taken.push(new THREE.Vector3());
    }
    const offsets = scatterPoints(clusterData.images.length, CLUSTER_RADIUS - CARD_SIZE / 2, CARD_SPACING, taken);

    clusterData.images.forEach((image, j) => {
        const width = image.ratio >= 1 ? CARD_SIZE : CARD_SIZE * image.ratio;
        const height = image.ratio >= 1 ? CARD_SIZE / image.ratio : CARD_SIZE;

        const texture = loader.load(image.url);
        texture.colorSpace = THREE.SRGBColorSpace;

        const card = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ map: texture })
        );
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, height * 2), glowMaterial);
        glow.position.z = -0.01;
        glow.raycast = () => { }; // only the card itself is clickable

        const holder = new THREE.Group();
        holder.position.copy(offsets[j]);
        holder.userData = { home: offsets[j].clone(), width, height, text: clusterData.text };
        holder.add(glow, card);
        group.add(holder);

        card.userData = { cluster, holder };
        cards.push(card);
        holders.push(holder);
    });
});

// --- Stamps -------------------------------------------------------------------

const lineMaterial = new THREE.LineBasicMaterial({ color: PINK });
let lastStamp = null; // where the last click landed; null until the first one

// Glowing pink dot marking where the trail starts.
const makeStartDot = (point) => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(216, 26, 125, 1)");
    gradient.addColorStop(0.15, "rgba(216, 26, 125, 1)");
    gradient.addColorStop(0.3, "rgba(216, 26, 125, 0.5)");
    gradient.addColorStop(1, "rgba(216, 26, 125, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        depthWrite: false,
    }));
    dot.position.copy(point);
    dot.scale.setScalar(CARD_SIZE * 0.25);
    return dot;
};

// The first click marks the start with a dot; later ones draw a line from the
// previous click to `point`.
const stamp = (point) => {
    if (lastStamp) {
        const geometry = new THREE.BufferGeometry().setFromPoints([lastStamp.clone(), point.clone()]);
        scene.add(new THREE.Line(geometry, lineMaterial));
    } else {
        scene.add(makeStartDot(point));
    }
    lastStamp = point.clone();
};

// --- Pointer: click a card to stamp ---------------------------------------------

const raycaster = new THREE.Raycaster();
raycaster.layers.enableAll(); // the close-up card is on its own layer but still clickable
const pointer = new THREE.Vector2();

const aimAt = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
};

const pickCard = (e) => {
    aimAt(e);
    return raycaster.intersectObjects(cards, false)[0];
};

let press = null;       // where the current press started, to tell a click from a drag
let focusTarget = null; // cluster centre the view is easing towards

// Presses go to OrbitControls as usual (dragging anywhere orbits); a press
// that ends where it started is a click on the card under it.
renderer.domElement.addEventListener("pointerdown", (e) => {
    if (press) {
        // A second finger while one is down: a pinch zoom, not a click.
        press = null;
        closeUp(null);
        return;
    }
    if (e.button === 0) press = { id: e.pointerId, x: e.clientX, y: e.clientY };
});

// Zooming (wheel or trackpad) also sends the close-up card back.
renderer.domElement.addEventListener("wheel", () => closeUp(null), { passive: true });

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!press) {
        container.classList.toggle("is-over-card", !!pickCard(e));
        return;
    }
    // Once a press turns into a drag (an orbit), send the close-up card back.
    if (e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_SLOP) {
        closeUp(null);
    }
});

const release = (e) => {
    if (!press || e.pointerId !== press.id) return;
    const isClick = e.type === "pointerup" && Math.hypot(e.clientX - press.x, e.clientY - press.y) <= DRAG_SLOP;
    press = null;
    if (!isClick) return;

    const hit = pickCard(e);
    if (!hit) return closeUp(null); // empty space sends the close-up card back

    const { cluster, holder } = hit.object.userData;
    if (holder === closeUpHolder) return closeUp(null); // clicking it again sends it back

    stamp(hit.point);
    focusTarget = cluster.group.position.clone(); // turn the view towards it
    closeUp(holder);
};
renderer.domElement.addEventListener("pointerup", release);
renderer.domElement.addEventListener("pointercancel", release);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeUp(null);
});

// --- Close-up: the clicked card floats in front of the camera -------------------

let closeUpHolder = null;
const moving = new Set(); // cards on their way to or from the close-up spot

// Caption with the cluster's text under the close-up card. HTML on top of
// every canvas, moved each frame to follow the card's bottom edge.
const caption = document.createElement("div");
caption.className = "closeup-caption";
container.appendChild(caption);

const closeUp = (holder) => {
    if (closeUpHolder) moving.add(closeUpHolder); // the previous one heads home
    closeUpHolder = holder;
    if (holder) {
        holder.traverse((object) => object.layers.set(CLOSE_UP_LAYER));
        moving.add(holder);
        if (holder.userData.text) caption.innerHTML = `<p>${holder.userData.text}</p>`;
    }
    caption.classList.toggle("is-visible", !!holder?.userData.text);
};

const captionAnchor = new THREE.Vector3();

const updateCaption = () => {
    if (!closeUpHolder) return; // keeps its last spot while fading out
    closeUpHolder.updateWorldMatrix(true, false);
    closeUpHolder.localToWorld(captionAnchor.set(0, -closeUpHolder.userData.height / 2, 0));
    captionAnchor.project(camera);
    caption.style.left = `${(captionAnchor.x + 1) / 2 * window.innerWidth}px`;
    caption.style.top = `${(1 - captionAnchor.y) / 2 * window.innerHeight}px`;
};

const closeUpSpot = new THREE.Vector3();
const homeScale = new THREE.Vector3(1, 1, 1);
const targetScale = new THREE.Vector3();

// Eases each moving card towards the close-up spot (recomputed every frame,
// so it follows the camera) or back to its place in its cluster.
const updateCloseUp = () => {
    const ease = reduceMotion ? 1 : 0.12;

    moving.forEach((holder) => {
        const { home, width, height } = holder.userData;

        if (holder === closeUpHolder) {
            camera.getWorldDirection(closeUpSpot).multiplyScalar(CLOSE_UP_DISTANCE).add(camera.position);
            holder.parent.worldToLocal(closeUpSpot);

            const viewHeight = 2 * CLOSE_UP_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const viewWidth = viewHeight * camera.aspect;
            const scale = CLOSE_UP_SIZE * Math.min(viewHeight / height, viewWidth / width);

            holder.position.lerp(closeUpSpot, ease);
            holder.scale.lerp(targetScale.setScalar(scale), ease);
        } else {
            holder.position.lerp(home, ease);
            holder.scale.lerp(homeScale, ease);
            if (holder.position.distanceTo(home) < 0.001) {
                holder.position.copy(home);
                holder.scale.copy(homeScale);
                holder.traverse((object) => object.layers.set(0)); // back in the scene
                moving.delete(holder);
            }
        }
    });
};

// --- Camera controls -----------------------------------------------------------

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 60;
// Slow, constant drift. OrbitControls pauses it while the visitor is dragging
// and picks it up again on release.
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.4;

controls.addEventListener("start", () => {
    focusTarget = null; // the visitor's own move wins
    container.classList.add("is-grabbing");
});
controls.addEventListener("end", () => container.classList.remove("is-grabbing"));

// --- Loop ------------------------------------------------------------------------

renderer.setAnimationLoop(() => {
    if (focusTarget) {
        controls.target.lerp(focusTarget, reduceMotion ? 1 : 0.06);
        if (controls.target.distanceTo(focusTarget) < 0.01) focusTarget = null;
    }
    controls.update();
    updateCloseUp();
    updateCaption();

    // Cards always face the viewer.
    holders.forEach((holder) => holder.quaternion.copy(camera.quaternion));

    renderer.render(scene, camera);

    // Close-up layer on top, without the white background.
    camera.layers.set(CLOSE_UP_LAYER);
    scene.background = null;
    overlayRenderer.render(scene, camera);
    scene.background = white;
    camera.layers.set(0);
});

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    overlayRenderer.setSize(window.innerWidth, window.innerHeight);
});
