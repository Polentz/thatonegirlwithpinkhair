// The last click and the lines are kept in .drag-layout's own (unzoomed)
// coordinates, so they zoom and pan with the images. The first click on an
// image marks a dot; lines (and the guide to the pointer) start from there.
let startX = null; // last click; null until the first one
let startY = null;
let startDot = null; // where the trail begins

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

function draw() {
    background(255, 255, 255);

    const t = layoutTransform();

    if (startDot) {
        // Glowing pink dot where the trail starts, drawn like the 3D one: a
        // quarter of an image's width across, solid in the middle and fading out.
        const cardWidth = document.querySelector(".drag-element-wrapper")?.offsetWidth || 40;
        const radius = (cardWidth * 0.25 * t.s) / 2;
        const x = t.x + startDot.x * t.s;
        const y = t.y + startDot.y * t.s;
        const gradient = drawingContext.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(216, 26, 125, 1)");
        gradient.addColorStop(0.15, "rgba(216, 26, 125, 1)");
        gradient.addColorStop(0.3, "rgba(216, 26, 125, 0.5)");
        gradient.addColorStop(1, "rgba(216, 26, 125, 0)");
        drawingContext.fillStyle = gradient;
        drawingContext.beginPath();
        drawingContext.arc(x, y, radius, 0, Math.PI * 2);
        drawingContext.fill();
    };

    if (startX !== null && !document.body.classList.contains("stamp-mode")) {
        // The guide runs from the last stamp (layout coords) to the pointer
        // (canvas coords), so convert the pointer back into layout coords.
        const aim = guidePointer || { x: mouseX, y: mouseY };
        let guide = new Path(startX, startY, (aim.x - t.x) / t.s, (aim.y - t.y) / t.s);
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
    startDot = null;
    startX = startY = null;
};

// function mouseMoved() {
//     let newEndX = mouseX;
//     let newEndY = mouseY;

//     let p = new Path(startX, startY, newEndX, newEndY);

//     paths.push(p);

//     startX = newEndX;
//     startY = newEndY;
// };

// Called by an image click (script.js) with the click position: the first
// click marks the start dot, later ones draw a line from the previous click.
window.stampPoint = (clientX, clientY) => {
    const layout = document.querySelector(".drag-layout");
    const rect = layout.getBoundingClientRect();
    const s = rect.width / layout.offsetWidth;
    const x = (clientX - rect.left) / s;
    const y = (clientY - rect.top) / s;

    if (startX === null) {
        startDot = { x, y };
    } else {
        paths.push(new Path(startX, startY, x, y));
    }
    startX = x;
    startY = y;
};

class Path {
    constructor(x1, y1, x2, y2) {
        this.startX = x1;
        this.startY = y1;

        this.endX = x2;
        this.endY = y2;
    }

    // `t` is layoutTransform(): maps layout coords onto the canvas.
    show(t) {
        stroke(216, 26, 125);
        strokeWeight(1);
        line(
            t.x + this.startX * t.s, t.y + this.startY * t.s,
            t.x + this.endX * t.s, t.y + this.endY * t.s
        );
    }
};

