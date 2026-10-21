import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const PINK = 0xd81a7d;
const CARD_SIZE = 2;          // longest side of an image card, in world units 1.2
const CARD_SPACING = 10;       // min distance between cards in a cluster 1.4
const CLUSTER_RADIUS = 5;     // cards stay within this distance of their cluster's centre 2.4
const CLUSTER_SPACING = 2 * CLUSTER_RADIUS + 2.5; // min distance between cluster centres 
const UNIVERSE_RADIUS = 16;     // clusters are scattered inside this sphere 16
const TEXT_LINE_HEIGHT = CARD_SIZE * 0.1; // height of one line of cluster text
const TEXT_MAX_WIDTH = CARD_SIZE * 2;      // cluster text wraps beyond this width
const CLOSE_UP_DISTANCE = 6;    // how far in front of the camera a clicked card floats
const CLOSE_UP_SIZE = 0.6;      // share of the screen the close-up card fills
const TEXT_CLOSE_UP_SIZE = 0.3; // same for a cluster's text (+ "Read more") brought close
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
const makeTextLabel = (html, { lineHeight: worldLineHeight = TEXT_LINE_HEIGHT } = {}) => {
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent.trim();

    const fontSize = 20;
    const lineHeight = fontSize * 1.2;
    const glowScale = fontSize / 20; // the site's glow is sized for ~20px text
    const glows = [[40, 0.8], [20, 0.7], [10, 0.5], [5, 0.2]]; // same layers as the CSS text-shadow
    const padding = 40 * glowScale;
    const pxPerUnit = lineHeight / worldLineHeight;
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
    const drawLines = (offsetX) => lines.forEach((l, i) => {
        const x = canvas.width / 2 + offsetX;
        const y = padding + lineHeight * (i + 0.5);
        ctx.fillText(l, x, y);
    });

    // Like CSS text-shadow: the glow layers go underneath and the text itself
    // is drawn once. Drawing the text once per layer would stack its soft
    // edges and make it look bold, so each layer draws the text off-canvas
    // and shifts only its shadow back into place.
    const offCanvas = canvas.width * 2;
    ctx.shadowOffsetX = offCanvas;
    glows.forEach(([blur, alpha]) => {
        ctx.shadowColor = `rgba(216, 26, 125, ${alpha})`;
        ctx.shadowBlur = blur * glowScale;
        drawLines(-offCanvas);
    });
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0;
    drawLines(0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const label = new THREE.Mesh(
        new THREE.PlaneGeometry(canvas.width / pxPerUnit, canvas.height / pxPerUnit),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    label.raycast = () => { }; // not clickable
    label.userData.textHeight = lines.length * worldLineHeight; // without the glow padding
    label.userData.textWidth = textWidth / pxPerUnit;
    return label;
};

// "Read more" drawn like the 2D button (.read-more in style.css): a white pill
// with a thin pink border and glowing pink text; on hover it fills pink with
// white text and a softer glow. Both looks are drawn once and crossfaded.
// Sizes follow the CSS in em: text the size of the cluster text, padding
// 2/3em × 4/3em (.5rem 1rem at 12px), border 1/12em (1px), line-height 1.
const READ_MORE_FONT = (TEXT_LINE_HEIGHT / 1.2) * 0.8; // 0.8 × the cluster text's size, like 0.6rem vs 0.75rem in 2D

const makeReadMoreButton = (text) => {
    const fontSize = 20; // canvas px per em
    const pxPerUnit = fontSize / READ_MORE_FONT;
    const glowScale = fontSize / 10; // the site's glow is sized for ~20px text
    const font = `${fontSize}px Helvetica, Arial, sans-serif`;
    const pink = "rgb(216, 26, 125)";

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = font;
    const padX = fontSize * 4 / 3;
    const padY = fontSize * 2 / 3;
    const border = fontSize / 12;
    const margin = fontSize * 2; // room for the text glow around the pill
    const pillW = measure.measureText(text).width + padX * 2;
    const pillH = fontSize + padY * 2;

    const draw = (hover) => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(pillW + margin * 2);
        canvas.height = Math.ceil(pillH + margin * 2);
        const ctx = canvas.getContext("2d");
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.beginPath();
        ctx.roundRect(cx - pillW / 2 + border / 2, cy - pillH / 2 + border / 2, pillW - border, pillH - border, pillH / 2);
        ctx.fillStyle = hover ? pink : "#fff";
        ctx.fill();
        ctx.lineWidth = border;
        ctx.strokeStyle = pink;
        ctx.stroke();

        // Glow under the text, then the text once (see makeTextLabel).
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const glows = hover
            ? [[40, 0.2], [20, 0.2], [10, 0.2], [5, 0.2]]
            : [[40, 0.8], [20, 0.7], [10, 0.5], [5, 0.2]];
        const offCanvas = canvas.width * 2;
        ctx.fillStyle = pink;
        ctx.shadowOffsetX = offCanvas;
        glows.forEach(([blur, alpha]) => {
            ctx.shadowColor = `rgba(216, 26, 125, ${alpha})`;
            ctx.shadowBlur = blur * glowScale;
            ctx.fillText(text, cx - offCanvas, cy);
        });
        ctx.shadowColor = "transparent";
        ctx.shadowOffsetX = 0;
        ctx.fillStyle = hover ? "#fff" : pink;
        ctx.fillText(text, cx, cy);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return { texture, width: canvas.width / pxPerUnit, height: canvas.height / pxPerUnit };
    };

    const normal = draw(false);
    const hovered = draw(true);
    const geometry = new THREE.PlaneGeometry(normal.width, normal.height);

    const button = new THREE.Mesh(geometry,
        new THREE.MeshBasicMaterial({ map: normal.texture, transparent: true, depthWrite: false }));
    const hoverLayer = new THREE.Mesh(geometry,
        new THREE.MeshBasicMaterial({ map: hovered.texture, transparent: true, depthWrite: false, opacity: 0 }));
    hoverLayer.position.z = 0.001;
    button.add(hoverLayer);

    // Only the pill is clickable, not the glow around it.
    const hitArea = new THREE.Mesh(
        new THREE.PlaneGeometry(pillW / pxPerUnit, pillH / pxPerUnit),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    button.add(hitArea);
    button.raycast = () => { };
    hoverLayer.raycast = () => { };

    button.userData = {
        height: pillH / pxPerUnit,
        hitArea,
        hover: 0, // 0 normal … 1 hovered, eased each frame
        baseMaterial: button.material,
        hoverMaterial: hoverLayer.material,
    };
    return button;
};

const loader = new THREE.TextureLoader();
const clusters = []; // { group, text, filters }
const cards = [];   // card meshes, for picking
const clickables = []; // cards and "Read more" hit areas
const readMoreButtons = []; // { button, cluster }
const holders = []; // card + glow pairs and text labels, turned to face the camera every frame

const clusterCentres = scatterPoints(data.length, UNIVERSE_RADIUS, CLUSTER_SPACING);

data.forEach((clusterData, i) => {
    const group = new THREE.Group();
    group.position.copy(clusterCentres[i]);
    scene.add(group);

    const cluster = {
        group,
        text: clusterData.text,
        filters: clusterData.filters || [],
        shown: true,
        opacity: 1,
        anim: null,
        cardMaterials: [], // solid normally, see-through only while fading
        fadeMaterials: [], // always see-through (glow, text)
    };
    clusters.push(cluster);
    group.userData.cluster = cluster;

    // The text sits at the cluster's centre; the cards keep clear of it.
    const taken = [];
    let label = null;
    if (clusterData.text) {
        label = makeTextLabel(clusterData.text);
        cluster.fadeMaterials.push(label.material);
        group.add(label);
        holders.push(label); // faces the camera like the cards
        taken.push(new THREE.Vector3());
    }
    if (!label && clusterData.readMore) taken.push(new THREE.Vector3()); // keep the centre for the button
    const offsets = scatterPoints(clusterData.images.length, CLUSTER_RADIUS - CARD_SIZE / 2, CARD_SPACING, taken);

    // "Read more" sits right under the text. As a child of the text label it
    // turns with it, so it stays under the text on screen from any angle.
    if (clusterData.readMore) {
        const button = makeReadMoreButton("Read more");
        const { hitArea } = button.userData;
        hitArea.userData = { cluster, readMore: clusterData.readMore, button };
        clickables.push(hitArea);
        readMoreButtons.push({ button, cluster });
        if (label) {
            const gap = READ_MORE_FONT * 0.25; // 0.25em, as in .cluster-label
            button.position.y = -(label.userData.textHeight / 2 + gap + button.userData.height / 2);
            label.add(button);
        } else {
            group.add(button); // no text: the button takes the centre
            holders.push(button); // faces the camera
        }
    }

    // Clicking the text brings it (with its "Read more") up close like a
    // card: it gets the same home/size data the close-up code uses, and no
    // caption text, since it is the text.
    if (label) {
        const button = label.children.find((child) => child.userData.hitArea);
        const blockHeight = label.userData.textHeight + (button ? 2 * Math.abs(button.position.y) : 0);
        Object.assign(label.userData, {
            home: new THREE.Vector3(),
            width: label.userData.textWidth,
            height: blockHeight,
            text: "",
            closeUpSize: TEXT_CLOSE_UP_SIZE,
        });

        const hitArea = new THREE.Mesh(
            new THREE.PlaneGeometry(label.userData.textWidth, label.userData.textHeight),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        hitArea.userData = { cluster, holder: label };
        label.add(hitArea);
        clickables.push(hitArea);
    }

    // Own copy of the glow (same texture), so this cluster can fade alone.
    const clusterGlow = glowMaterial.clone();
    cluster.fadeMaterials.push(clusterGlow);

    clusterData.images.forEach((image, j) => {
        const width = image.ratio >= 1 ? CARD_SIZE : CARD_SIZE * image.ratio;
        const height = image.ratio >= 1 ? CARD_SIZE / image.ratio : CARD_SIZE;

        const texture = loader.load(image.url);
        texture.colorSpace = THREE.SRGBColorSpace;

        const cardMaterial = new THREE.MeshBasicMaterial({ map: texture });
        cluster.cardMaterials.push(cardMaterial);
        const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), cardMaterial);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, height * 2), clusterGlow);
        glow.position.z = -0.01;
        glow.raycast = () => { }; // only the card itself is clickable

        const holder = new THREE.Group();
        holder.position.copy(offsets[j]);
        holder.userData = { home: offsets[j].clone(), width, height, text: clusterData.text };
        holder.add(glow, card);
        group.add(holder);

        card.userData = { cluster, holder };
        cards.push(card);
        clickables.push(card);
        holders.push(holder);
    });
});

// --- Stamps -------------------------------------------------------------------

const lineMaterial = new THREE.LineBasicMaterial({ color: PINK });
let lastStamp = null; // where the last click landed; null until the first one

// Each piece of the trail remembers the clusters its ends were clicked on and
// shows at their lowest opacity (updateTrail), so it fades out and back in
// with them when a filter hides or shows them.
const trail = []; // { object, clusters }
let lastStampCluster = null;

const stamp = (point, cluster) => {
    if (lastStamp) {
        const geometry = new THREE.BufferGeometry().setFromPoints([lastStamp.clone(), point.clone()]);
        const line = new THREE.Line(geometry, lineMaterial.clone());
        line.material.transparent = true;
        scene.add(line);
        trail.push({ object: line, clusters: [lastStampCluster, cluster] });
    }
    // The first click draws nothing; it only marks where the trail starts.
    lastStamp = point.clone();
    lastStampCluster = cluster;
};

const updateTrail = () => {
    trail.forEach(({ object, clusters }) => {
        const opacity = Math.min(...clusters.map((cluster) => cluster.opacity));
        object.material.opacity = opacity;
        object.visible = opacity > 0;
    });
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
    // Cards and buttons of clusters hidden by a filter can't be clicked.
    return raycaster.intersectObjects(clickables, false)
        .find((hit) => hit.object.userData.cluster.shown);
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
        const hit = pickCard(e);
        container.classList.toggle("is-over-card", !!hit);
        hoveredButton = hit?.object.userData.button || null;
        return;
    };
    // Once a press turns into a drag (an orbit), send the close-up card back.
    if (e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_SLOP) {
        closeUp(null);
    };
});

const release = (e) => {
    if (!press || e.pointerId !== press.id) return;
    const isClick = e.type === "pointerup" && Math.hypot(e.clientX - press.x, e.clientY - press.y) <= DRAG_SLOP;
    press = null;
    if (!isClick) return;

    const hit = pickCard(e);
    if (!hit) return closeUp(null); // empty space sends the close-up card back

    // "Read more" opens the cluster's side panel (sliders in script.js).
    if (hit.object.userData.readMore) return window.openSlider?.(hit.object.userData.readMore);

    const { cluster, holder } = hit.object.userData;
    if (holder === closeUpHolder) return closeUp(null); // clicking it again sends it back

    if (!holder.userData.closeUpSize) stamp(hit.point, cluster); // only image clicks draw the trail, not the text
    focusTarget = cluster.group.position.clone(); // turn the view towards it
    closeUp(holder);
};
renderer.domElement.addEventListener("pointerup", release);
renderer.domElement.addEventListener("pointercancel", release);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeUp(null);
});

// The nav's Filters menu (script.js): show only the clusters with the chosen
// filter, or all of them for "All".
// Hidden clusters fade out and shown ones fade in, one after another.
const FILTER_FADE_MS = 350;
const FILTER_STAGGER_MS = 50; // between one cluster starting and the next

window.addEventListener("clusterfilter", (e) => {
    const { filter } = e.detail;
    const now = performance.now();
    const changing = clusters.filter((cluster) =>
        (!filter || cluster.filters.includes(filter)) !== cluster.shown
    );
    changing.forEach((cluster, i) => {
        cluster.shown = !cluster.shown;
        cluster.group.visible = true; // visible while it fades
        cluster.anim = {
            from: cluster.opacity,
            to: cluster.shown ? 1 : 0,
            start: now + (reduceMotion ? 0 : i * FILTER_STAGGER_MS),
            duration: reduceMotion ? 0 : FILTER_FADE_MS,
        };
    });
    if (closeUpHolder && !closeUpHolder.parent.userData.cluster?.shown) closeUp(null);
});

const setClusterOpacity = (cluster, opacity) => {
    cluster.opacity = opacity;
    cluster.fadeMaterials.forEach((material) => { material.opacity = opacity; });
    cluster.cardMaterials.forEach((material) => {
        material.opacity = opacity;
        const seeThrough = opacity < 1;
        if (material.transparent !== seeThrough) {
            material.transparent = seeThrough;
            material.needsUpdate = true;
        }
    });
};

const easeInOut = (t) => t * t * (3 - 2 * t);

// "Read more" buttons: ease each towards its hover look (about .35s, like the
// 2D transition) and follow its cluster's filter fade.
let hoveredButton = null;

const updateReadMoreButtons = () => {
    readMoreButtons.forEach(({ button, cluster }) => {
        const data = button.userData;
        const target = button === hoveredButton ? 1 : 0;
        data.hover += (target - data.hover) * (reduceMotion ? 1 : 0.15);
        data.baseMaterial.opacity = cluster.opacity;
        data.hoverMaterial.opacity = cluster.opacity * easeInOut(Math.min(1, Math.max(0, data.hover)));
    });
};

const updateFilterAnimations = (now) => {
    clusters.forEach((cluster) => {
        const { anim, group } = cluster;
        if (!anim) return;
        const t = anim.duration ? Math.min(1, Math.max(0, (now - anim.start) / anim.duration)) : 1;
        setClusterOpacity(cluster, anim.from + (anim.to - anim.from) * easeInOut(t));
        if (t === 1) {
            cluster.anim = null;
            group.visible = cluster.shown;
        }
    });
};

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
    };
    // The caption fades in only once the card has grown to its close-up size
    // (updateCloseUp); until then, and when there's no card, it's hidden.
    captionPending = !!holder?.userData.text;
    caption.classList.remove("is-visible");
};

let captionPending = false;

const captionAnchor = new THREE.Vector3();
const captionCorner = new THREE.Vector3();

const updateCaption = () => {
    if (!closeUpHolder) return; // keeps its last spot while fading out
    closeUpHolder.updateWorldMatrix(true, false);
    closeUpHolder.localToWorld(captionAnchor.set(0, -closeUpHolder.userData.height / 2, 0));
    captionAnchor.project(camera);
    caption.style.left = `${(captionAnchor.x + 1) / 2 * window.innerWidth}px`;
    caption.style.top = `${(1 - captionAnchor.y) / 2 * window.innerHeight}px`;

    // No wider than the image: twice the on-screen distance from its
    // bottom-centre to its bottom-right corner.
    const { width, height } = closeUpHolder.userData;
    closeUpHolder.localToWorld(captionCorner.set(width / 2, -height / 2, 0));
    captionCorner.project(camera);
    caption.style.maxWidth = `${(captionCorner.x - captionAnchor.x) * window.innerWidth}px`;
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
            const size = holder.userData.closeUpSize ?? CLOSE_UP_SIZE;
            const scale = size * Math.min(viewHeight / height, viewWidth / width);

            holder.position.lerp(closeUpSpot, ease);
            holder.scale.lerp(targetScale.setScalar(scale), ease);

            if (captionPending && holder.scale.x >= scale * 0.97) {
                captionPending = false;
                caption.classList.add("is-visible");
            }
        } else {
            holder.position.lerp(home, ease);
            holder.scale.lerp(homeScale, ease);
            if (holder.position.distanceTo(home) < 0.001) {
                holder.position.copy(home);
                holder.scale.copy(homeScale);
                holder.traverse((object) => object.layers.set(0)); // back in the scene
                moving.delete(holder);
            };
        };
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
    updateFilterAnimations(performance.now());
    updateReadMoreButtons();
    updateTrail();
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
