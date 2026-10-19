// 3D prototype: the home page clusters float in space as groups of image
// cards. Drag empty space to orbit, wheel/pinch to zoom, right-drag to pan.
// Clicking a card stamps its cluster's text at that spot, linked to the
// previous stamp by a pink line, and brings that card up close; it floats back
// on the next click, or Escape. Dragging on a card orbits, like empty space.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

const PINK = 0xd81a7d;
const CARD_SIZE = 2;          // longest side of an image card, in world units 1.2
const CARD_SPACING = 10;       // min distance between cards in a cluster 1.4
const CLUSTER_RADIUS = 5;     // cards stay within this distance of their cluster's centre 2.4
const CLUSTER_SPACING = 2 * CLUSTER_RADIUS + 2.5; // min distance between cluster centres 
const UNIVERSE_RADIUS = 16;     // clusters are scattered inside this sphere 16
const STAMP_SCALE = 0.01;       // CSS px → world units for the stamped text 0.01
const CLOSE_UP_DISTANCE = 6;    // how far in front of the camera a clicked card floats
const CLOSE_UP_SIZE = 0.6;      // share of the screen the close-up card fills
const DRAG_SLOP = 5;            // px of movement that counts as a drag, not a click 5

const container = document.querySelector(".universe");
const data = window.UNIVERSE_CLUSTERS || [];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Scene, camera, renderers ---------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
// scene.fog = new THREE.Fog(0xffffff, 18, 60); // far clusters fade into the white

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Stamped text is real HTML placed in 3D, so it keeps the site's font and glow.
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.classList.add("css3d-layer");
container.appendChild(cssRenderer.domElement);

// --- Placement --------------------------------------------------------------

const randomInSphere = (radius) => {
    const v = new THREE.Vector3();
    do {
        v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    } while (v.lengthSq() > 1);
    return v.multiplyScalar(radius);
};

// `count` random points inside a sphere, trying to keep `minDistance` apart.
const scatterPoints = (count, radius, minDistance) => {
    const points = [];
    for (let i = 0; i < count; i++) {
        let point;
        for (let attempt = 0; attempt < 300; attempt++) {
            point = randomInSphere(radius);
            if (points.every((other) => other.distanceTo(point) >= minDistance)) break;
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

const loader = new THREE.TextureLoader();
const cards = [];   // card meshes, for picking
const holders = []; // card + glow pairs, turned to face the camera every frame

const clusterCentres = scatterPoints(data.length, UNIVERSE_RADIUS, CLUSTER_SPACING);

data.forEach((clusterData, i) => {
    const group = new THREE.Group();
    group.position.copy(clusterCentres[i]);
    scene.add(group);

    const cluster = { group, text: clusterData.text };
    const offsets = scatterPoints(clusterData.images.length, CLUSTER_RADIUS - CARD_SIZE / 2, CARD_SPACING);

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
        holder.userData = { home: offsets[j].clone(), width, height };
        holder.add(glow, card);
        group.add(holder);

        card.userData = { cluster, holder };
        cards.push(card);
        holders.push(holder);
    });
});

// --- Stamps -------------------------------------------------------------------

const lineMaterial = new THREE.LineBasicMaterial({ color: PINK });
const stamps = [];
const lastStamp = new THREE.Vector3(0, 0, 0); // the first line starts at the centre

const stamp = (html, point) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([lastStamp.clone(), point.clone()]);
    scene.add(new THREE.Line(geometry, lineMaterial));
    lastStamp.copy(point);

    const element = document.createElement("div");
    element.className = "universe-stamp";
    element.innerHTML = `<p>${html}</p>`;

    const label = new CSS3DObject(element);
    label.position.copy(point);
    label.scale.setScalar(STAMP_SCALE);
    scene.add(label);
    stamps.push(label);
};

// --- Pointer: click a card to stamp ---------------------------------------------

const raycaster = new THREE.Raycaster();
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
// that ends where it started is a click, and stamps the card under it.
renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.button === 0) press = { id: e.pointerId, x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!press) container.classList.toggle("is-over-card", !!pickCard(e));
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

    if (cluster.text) stamp(cluster.text, hit.point);
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

const closeUp = (holder) => {
    if (closeUpHolder) moving.add(closeUpHolder); // the previous one heads home
    closeUpHolder = holder;
    if (holder) moving.add(holder);
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

    // Cards and stamps always face the viewer.
    holders.forEach((holder) => holder.quaternion.copy(camera.quaternion));
    stamps.forEach((label) => label.quaternion.copy(camera.quaternion));

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
});

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});
