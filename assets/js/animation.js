// The last stamp and the lines are kept in .drag-layout's own (unzoomed)
// coordinates, like the stamped text, so they zoom and pan with the images.
let startX;
let startY;

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
    startX = windowWidth / 2;
    startY = windowHeight / 2;

    hasClusterText = !!document.querySelector(".cluster-text");
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

    if (hasClusterText && !document.body.classList.contains("stamp-mode")) {
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
    startX = windowWidth / 2;
    startY = windowHeight / 2;
};

function resetMap() {
    paths = [];
    document.querySelectorAll(".block").forEach((block) => block.remove());
};

// function mouseMoved() {
//     let newEndX = mouseX;
//     let newEndY = mouseY;

//     let p = new Path(startX, startY, newEndX, newEndY);

//     paths.push(p);

//     startX = newEndX;
//     startY = newEndY;
// };

// Called by a cluster click (script.js) with the cluster's text HTML and the
// click position: draws the line from the last stamp and places the text.
window.stampText = (html, clientX, clientY) => {
    const layout = document.querySelector(".drag-layout");
    const rect = layout.getBoundingClientRect();
    const s = rect.width / layout.offsetWidth;
    const x = (clientX - rect.left) / s;
    const y = (clientY - rect.top) / s;

    paths.push(new Path(startX, startY, x, y));
    startX = x;
    startY = y;

    placeItem(html, x, y);
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


let hasClusterText = false;

function placeItem(html, x, y) {
    let DOM_DIV = document.createElement('div');
    DOM_DIV.innerHTML = html;

    DOM_DIV.style.top = y + 'px';
    DOM_DIV.style.left = x + 'px';

    DOM_DIV.setAttribute("class", "block");

    document.querySelector(".drag-layout").append(DOM_DIV);
};
