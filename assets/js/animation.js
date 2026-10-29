// The last click and the lines are kept in .drag-layout's own (unzoomed)
// coordinates, so they zoom and pan with the images. The first click on an
// image marks where the trail starts (nothing is drawn); lines and the guide
// to the pointer start from there.
let startX = null; // last click; null until the first one
let startY = null;
let startCluster = null; // the .cluster of the last click

let paths = [];

// How .drag-layout currently sits on the canvas: its zoom and the canvas
// position of its top-left corner.
const layoutTransform = () => {
    const layout = document.querySelector(".drag-layout");
    const canvas = document.querySelector("canvas");
    if (!layout || !canvas) return { s: 1, x: 0, y: 0 };
    const r = layout.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return { s: r.width / layout.offsetWidth, x: r.left - c.left, y: r.top - c.top };
};

function setup() {
    createCanvas(windowWidth, windowHeight);
};

// While a drag-element is dragged it calls preventDefault on the pointer
// events, so p5 stops receiving mouse moves and mouseX/mouseY freeze.
// The drag handler feeds the live pointer position in here so the guide
// line keeps following it. Null when nothing is being dragged.
let guidePointer = null;

window.setGuidePointer = (clientX, clientY) => {
    const rect = document.querySelector("canvas")?.getBoundingClientRect();
    guidePointer = rect
        ? { x: clientX - rect.left, y: clientY - rect.top }
        : { x: clientX, y: clientY };
};

window.clearGuidePointer = () => {
    // Don't snap back to mouseX/mouseY right away: they froze during the drag,
    // so using them now makes the line jump. Hold the guide at the release
    // point until the pointer genuinely moves again (which also refreshes
    // p5's mouseX/mouseY), then resume real-mouse tracking seamlessly.
    window.addEventListener("pointermove", () => { guidePointer = null; }, { once: true });
};

// Each piece of the trail belongs to the clusters its ends were clicked on and
// shows at their lowest opacity, so it fades out and back in with them when
// a filter hides or shows them. Read once per frame.
let clusterOpacity = new Map();
const opacityOf = (cluster) => {
    if (!cluster) return 1;
    if (!clusterOpacity.has(cluster)) clusterOpacity.set(cluster, parseFloat(getComputedStyle(cluster).opacity));
    return clusterOpacity.get(cluster);
};

function draw() {
    background(255, 255, 255);

    const t = layoutTransform();
    clusterOpacity = new Map();

    if (startX !== null && !document.body.classList.contains("stamp-mode")) {
        // The guide runs from the last stamp (layout coords) to the pointer
        // (canvas coords), so convert the pointer back into layout coords.
        const aim = guidePointer || { x: mouseX, y: mouseY };
        let guide = new Path(startX, startY, (aim.x - t.x) / t.s, (aim.y - t.y) / t.s, startCluster);
        guide.show(t);
    };

    for (let i = 0; i < paths.length; i++) {
        paths[i].show(t);
    };
};

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
};

function resetMap() {
    paths = [];
    startX = startY = null;
    startCluster = null;
};

// function mouseMoved() {
//     let newEndX = mouseX;
//     let newEndY = mouseY;

//     let p = new Path(startX, startY, newEndX, newEndY);

//     paths.push(p);

//     startX = newEndX;
//     startY = newEndY;
// };

// Called by an image click (2d.js) with the click position and the
// image's .cluster: the first click marks where the trail starts, later ones
// draw a line from the previous click.
window.stampPoint = (clientX, clientY, cluster = null) => {
    const layout = document.querySelector(".drag-layout");
    const rect = layout.getBoundingClientRect();
    const s = rect.width / layout.offsetWidth;
    const x = (clientX - rect.left) / s;
    const y = (clientY - rect.top) / s;

    // The first click draws nothing; it only marks where the trail starts.
    if (startX !== null) paths.push(new Path(startX, startY, x, y, startCluster, cluster));
    startX = x;
    startY = y;
    startCluster = cluster;
};

class Path {
    // `clusters`: the .cluster elements its ends belong to (may be none).
    constructor(x1, y1, x2, y2, ...clusters) {
        this.startX = x1;
        this.startY = y1;

        this.endX = x2;
        this.endY = y2;

        this.clusters = clusters;
    }

    // `t` is layoutTransform(): maps layout coords onto the canvas.
    show(t) {
        const alpha = Math.min(1, ...this.clusters.map(opacityOf));
        if (alpha <= 0) return;
        stroke(216, 26, 125, alpha * 255);
        strokeWeight(1);
        line(
            t.x + this.startX * t.s, t.y + this.startY * t.s,
            t.x + this.endX * t.s, t.y + this.endY * t.s
        );
    }
};

