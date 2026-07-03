let count = 0;

let startX;
let startY;

let paths = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    startX = windowWidth / 2;
    startY = windowHeight / 2;

    blocks = Array.from(document.querySelectorAll(".blocks-stored p"))
        .map(p => p.outerHTML);
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

    if (count < blocks.length) {
        const aim = guidePointer || { x: mouseX, y: mouseY };
        let guide = new Path(startX, startY, aim.x, aim.y);
        guide.show();
    };

    for (let i = 0; i < paths.length; i++) {
        paths[i].show();
    };
};

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    startX = windowWidth / 2;
    startY = windowHeight / 2;
};

function resetMap() {
    paths = [];
    document.querySelectorAll(".block").remove();
    count = 0;
};

// function mouseMoved() {
//     let newEndX = mouseX;
//     let newEndY = mouseY;

//     let p = new Path(startX, startY, newEndX, newEndY);

//     paths.push(p);

//     startX = newEndX;
//     startY = newEndY;
// };

function mousePressed(event) {
    if (event && event.target.closest(".logo")) return;
    if (event && event.target.closest(".nav-label")) return;
    if (event && event.target.closest(".drag-element")) return;

    let newEndX = mouseX;
    let newEndY = mouseY;
    let p = new Path(startX, startY, newEndX, newEndY);

    startX = newEndX;
    startY = newEndY;

    placeItem(mouseX, mouseY);
    paths.push(p);
};

class Path {
    constructor(x1, y1, x2, y2) {
        this.startX = x1;
        this.startY = y1;

        this.endX = x2;
        this.endY = y2;
    }

    show() {
        stroke(216, 26, 125);
        strokeWeight(1);
        line(this.startX, this.startY, this.endX, this.endY)
    }
};


let blocks = [];

function placeItem(x, y) {

    // let DOM_DIV = document.createElement('div');
    // DOM_DIV.innerHTML = blocks[count];

    // DOM_DIV.style.top = y + 'px';
    // DOM_DIV.style.left = x + 'px';

    // let class_name = "block";
    // DOM_DIV.setAttribute("class", class_name);

    // if (count < blocks.length) {
    //     document.querySelector(".blocks").append(DOM_DIV);
    //     count++;
    // }
    if (blocks.length === 0) return;

    let DOM_DIV = document.createElement('div');
    DOM_DIV.innerHTML = blocks[count];

    DOM_DIV.style.top = y + 'px';
    DOM_DIV.style.left = x + 'px';

    let class_name = "block";
    DOM_DIV.setAttribute("class", class_name);

    document.querySelector(".blocks").append(DOM_DIV);

    count = (count + 1) % blocks.length;
};
