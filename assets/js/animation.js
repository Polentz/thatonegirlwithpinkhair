let count = 0;

let startX;
let startY;

let paths = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    startX = windowWidth / 2;
    startY = windowHeight / 2;
};

function draw() {
    background(255, 255, 255);

    if (count < blocks.length) {
        let guide = new Path(startX, startY, mouseX, mouseY);
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

function mouseMoved() {
    let newEndX = mouseX;
    let newEndY = mouseY;

    let p = new Path(startX, startY, newEndX, newEndY);

    paths.push(p);

    startX = newEndX;
    startY = newEndY;
};

function mousePressed() {
    let newEndX = mouseX;
    let newEndY = mouseY;

    startX = newEndX;
    startY = newEndY;

    placeItem(mouseX, mouseY);
};

class Path {
    constructor(x1, y1, x2, y2) {
        this.startX = x1;
        this.startY = y1;

        this.endX = x2;
        this.endY = y2;
    }

    show() {
        stroke(0, 0, 0);
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
    let DOM_DIV = document.createElement('div');
    DOM_DIV.innerHTML = 'Pink hair';

    DOM_DIV.style.top = y + 'px';
    DOM_DIV.style.left = x + 'px';

    let class_name = "block";
    DOM_DIV.setAttribute("class", class_name);

    document.querySelector(".blocks").append(DOM_DIV);

    // if (count < blocks.length) {
    //     document.querySelector(".blocks").append(DOM_DIV);
    //     count++;
    // }
};

