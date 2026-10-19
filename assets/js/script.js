const documentHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty("--doc-height", `${window.innerHeight}px`);
};


// Makes `target` follow the pointer while `handle` is dragged.
// Delta-based, so it works regardless of any transform on the target.
// The target is kept inside its offset parent (its .cluster) and stops when it
// bumps into a sibling image.
const makeDraggable = (handle, target) => {
    let dragZ = 1000;
    handle.style.touchAction = "none"; // don't scroll/zoom the page while dragging on touch

    let startX, startY, startLeft, startTop, activeId = null;

    handle.addEventListener("pointerdown", (e) => {
        if (activeId !== null) return; // already dragging with another pointer
        activeId = e.pointerId;
        handle.setPointerCapture(activeId); // keep receiving moves even if the pointer leaves

        startX = e.clientX;
        startY = e.clientY;

        const cs = getComputedStyle(target);
        startLeft = parseFloat(cs.left) || 0;
        startTop = parseFloat(cs.top) || 0;

        target.style.zIndex = ++dragZ; // bring the grabbed item to the front
        e.preventDefault(); // stop native image drag / text selection
    });

    handle.addEventListener("pointermove", (e) => {
        if (e.pointerId !== activeId) return;
        // Divide the screen-pixel delta by the current zoom so the element
        // keeps tracking the pointer 1:1 even when .drag-layout is scaled.
        const zoom = window.getDragZoom?.() ?? 1;
        const bounds = target.offsetParent;
        const maxLeft = Math.max(0, bounds.clientWidth - target.offsetWidth);
        const maxTop = Math.max(0, bounds.clientHeight - target.offsetHeight);
        const left = Math.min(maxLeft, Math.max(0, startLeft + (e.clientX - startX) / zoom));
        const top = Math.min(maxTop, Math.max(0, startTop + (e.clientY - startY) / zoom));

        // Move to the new spot if it's free; otherwise slide along whichever
        // axis is still free, or stay put.
        const curLeft = target.offsetLeft;
        const curTop = target.offsetTop;
        const [nextLeft, nextTop] = [[left, top], [left, curTop], [curLeft, top]]
            .find(([l, t]) => !hitsSibling(target, l, t)) ?? [curLeft, curTop];
        target.style.left = `${nextLeft}px`;
        target.style.top = `${nextTop}px`;
        window.setGuidePointer?.(e.clientX, e.clientY); // keep the p5 guide line tracking
    });

    const endDrag = (e) => {
        if (e.pointerId !== activeId) return;
        handle.releasePointerCapture(activeId);
        activeId = null;
        window.clearGuidePointer?.(); // hand control back to the real mouse
    };
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
};

// True if `target` placed at (left, top) would overlap another image in the
// same cluster.
const hitsSibling = (target, left, top) => {
    const width = target.offsetWidth;
    const height = target.offsetHeight;
    return Array.from(target.parentElement.children).some((other) =>
        other !== target &&
        other.classList.contains("drag-element") &&
        left < other.offsetLeft + other.offsetWidth &&
        left + width > other.offsetLeft &&
        top < other.offsetTop + other.offsetHeight &&
        top + height > other.offsetTop
    );
};

const dragElements = () => {
    document.querySelectorAll(".draggable").forEach((handle) => {
        const target = handle.closest(".drag-element") || handle;
        makeDraggable(handle, target);
    });
};

// Playful "pop & wobble" when the pointer hovers a card: it jumps forward,
// scales up and does a quick springy tilt before settling.
const hoverInteraction = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let hoverZ = 500;

    document.querySelectorAll(".drag-element").forEach((element) => {
        const wrapper = element.querySelector(".drag-element-wrapper") || element;

        // Smoothed setters so rapid enter/leave never fights itself.
        // Drive scaleX/scaleY (not the "scale" shorthand): quickTo uses resetTo,
        // which can't reset a shorthand that splits into two properties.
        const toScaleX = gsap.quickTo(wrapper, "scaleX", { duration: 0.35, ease: "power3.out" });
        const toScaleY = gsap.quickTo(wrapper, "scaleY", { duration: 0.35, ease: "power3.out" });
        const toScale = (v) => { toScaleX(v); toScaleY(v); };

        wrapper.addEventListener("pointerenter", () => {
            element.style.zIndex = ++hoverZ; // sit above its neighbours
            toScale(1.12);
            gsap.to(wrapper, {
                // boxShadow: "0 0 40px 12px rgb(216 26 125 / 55%)",
                keyframes: { rotation: [0, -7, 5, -3, 0] },
                duration: 0.6,
                ease: "power2.out",
            });
        });

        wrapper.addEventListener("pointerleave", () => {
            toScale(1);
            gsap.to(wrapper, {
                rotation: 0,
                // boxShadow: "0 0 24px 8px rgb(216 26 125 / 30%)",
                duration: 0.4,
                ease: "power2.out",
            });
        });
    });
};

// Turns .drag-layout into a zoomable, pannable dashboard:
//  - wheel zooms (smoothed) about the centre,
//  - dragging empty space pans,
//  - the pan is bounded so the layout never reveals a gap past its edges,
//  - double-clicking empty space eases zoom + pan back to the start.
// The live zoom is exposed via window.getDragZoom so the card-drag handler can
// keep elements tracking the pointer while zoomed.
const dashboardControls = () => {
    const layout = document.querySelector(".drag-layout");
    if (!layout) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MIN_SCALE = 0.2;
    const MAX_SCALE = 5;
    const SENSITIVITY = 0.0015; // scale change per wheel-delta unit

    let scale = 1;          // target zoom the wheel drives toward
    let panX = 0, panY = 0; // current translate, in screen pixels

    window.getDragZoom = () => scale;

    // Bounds: the layout is viewport-sized and scales about its centre, so each
    // axis has slack of size·(s-1)/2 in either direction; at <=1x there is none,
    // so it locks to centre. Clamps panX/panY in place, then writes them out.
    const clampAndRender = (s) => {
        const maxX = Math.max(0, (layout.offsetWidth * (s - 1)) / 2);
        const maxY = Math.max(0, (layout.offsetHeight * (s - 1)) / 2);
        panX = Math.min(maxX, Math.max(-maxX, panX));
        panY = Math.min(maxY, Math.max(-maxY, panY));
        gsap.set(layout, { x: panX, y: panY });
    };

    // Cursor-anchored zoom. At wheel time we capture the layout-local point
    // under the pointer (anchorWorld); then on every frame we recompute the pan
    // from the *live* scale so that point stays pinned under the cursor — no
    // drift, even while the zoom eases. originX/Y is the layout's untransformed
    // centre in client coords.
    let anchorClientX = 0, anchorClientY = 0;
    let anchorWorldX = 0, anchorWorldY = 0;
    let originX = 0, originY = 0;

    const anchoredPan = () => {
        const s = gsap.getProperty(layout, "scaleX") || 1;
        panX = anchorClientX - originX - s * anchorWorldX;
        panY = anchorClientY - originY - s * anchorWorldY;
        clampAndRender(s);
    };

    const renderPan = () => clampAndRender(gsap.getProperty(layout, "scaleX") || 1);

    // The scale setters call panUpdater every frame; swapping it lets the same
    // eased scale drive cursor-anchored zoom (anchoredPan) or free pan/reset
    // (renderPan).
    let panUpdater = renderPan;

    // Smoothed scale setters. Drive scaleX/scaleY (not the "scale" shorthand):
    // quickTo uses resetTo, which can't reset a shorthand that splits in two.
    const toScaleX = gsap.quickTo(layout, "scaleX", { duration: 0.4, ease: "power3.out", onUpdate: () => panUpdater() });
    const toScaleY = gsap.quickTo(layout, "scaleY", { duration: 0.4, ease: "power3.out" });
    const applyScale = () => { toScaleX(scale); toScaleY(scale); };

    // --- Zoom (wheel), anchored to the cursor ---------------------------
    window.addEventListener("wheel", (e) => {
        if (e.target.closest(".slider")) return; // let the info panel scroll normally
        e.preventDefault(); // drive the zoom instead of scrolling the page

        // Capture the point under the cursor in layout-local coords. originX/Y is
        // the untransformed centre, backed out of the live transform (so it holds
        // through resize/scroll); dividing by the live scale removes the zoom.
        const rect = layout.getBoundingClientRect();
        const liveX = gsap.getProperty(layout, "x");
        const liveY = gsap.getProperty(layout, "y");
        const liveS = gsap.getProperty(layout, "scaleX") || 1;
        originX = rect.left + rect.width / 2 - liveX;
        originY = rect.top + rect.height / 2 - liveY;
        anchorClientX = e.clientX;
        anchorClientY = e.clientY;
        anchorWorldX = (e.clientX - originX - liveX) / liveS;
        anchorWorldY = (e.clientY - originY - liveY) / liveS;

        // Wheel down (deltaY > 0) zooms in, wheel up zooms out. Negate to flip.
        scale += e.deltaY * SENSITIVITY;
        scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

        panUpdater = anchoredPan; // pin the cursor point while the scale eases
        applyScale();
        updateCursor(); // grab cursor appears once we're zoomed in
    }, { passive: false });

    // --- Pan (drag empty space, only while zoomed in) -------------------
    layout.style.touchAction = "none"; // don't let touch scroll the page while panning

    let startX, startY, startPanX, startPanY, activeId = null;

    // Show the grab cursor only when there's room to pan (zoomed in), and never
    // override 'grabbing' mid-drag.
    const updateCursor = () => {
        if (activeId === null) layout.style.cursor = scale > 1 ? "grab" : "";
    };

    layout.addEventListener("pointerdown", (e) => {
        // Only pan from empty space — let cards run their own drag handlers.
        if (e.target.closest(".drag-element")) return;
        if (scale <= 1) return; // nothing to pan until zoomed in
        if (activeId !== null) return; // already panning with another pointer

        activeId = e.pointerId;
        layout.setPointerCapture(activeId); // keep moves even if the pointer leaves

        startX = e.clientX;
        startY = e.clientY;
        startPanX = panX;
        startPanY = panY;

        panUpdater = renderPan; // a lingering zoom tween shouldn't fight the drag
        layout.style.cursor = "grabbing";
        // Promote the layout to its own GPU layer while panning, so moving it
        // doesn't repaint every image and glow on each frame. Only during the
        // pan: left on, zoom would scale a stale bitmap and look blurry.
        layout.style.willChange = "transform";
    });

    layout.addEventListener("pointermove", (e) => {
        if (e.pointerId !== activeId) return;
        panX = startPanX + (e.clientX - startX);
        panY = startPanY + (e.clientY - startY);
        renderPan(); // instant 1:1 tracking, kept within bounds
    });

    const endPan = (e) => {
        if (e.pointerId !== activeId) return;
        layout.releasePointerCapture(activeId);
        activeId = null;
        layout.style.willChange = "";
        updateCursor(); // back to grab if still zoomed in, else default
    };
    layout.addEventListener("pointerup", endPan);
    layout.addEventListener("pointercancel", endPan);

    // --- Double-click empty space to reset zoom + pan -------------------
    // layout.addEventListener("dblclick", (e) => {
    //     if (e.target.closest(".drag-element")) return; // don't hijack card dblclicks

    //     panUpdater = renderPan; // ease pan freely to centre, not cursor-anchored
    //     scale = 1;
    //     applyScale(); // eases scale back to 1x (renderPan clamps each frame)

    //     const p = { px: panX, py: panY };
    //     gsap.to(p, {
    //         px: 0, py: 0, duration: 0.4, ease: "power3.out",
    //         onUpdate: () => { panX = p.px; panY = p.py; renderPan(); },
    //     });
    // });
};

// Click the logo to toggle "stamp mode": the logo image trails the pointer (over
// a normal crosshair cursor) and clicking a drag-element stamps the logo on top
// of it (once per element).
const logoStamp = () => {
    const logo = document.querySelector(".logo");
    if (!logo) return;
    const logoSrc = logo.querySelector("img")?.getAttribute("src");

    let stampMode = false;

    const preview = document.createElement("img");
    preview.src = logoSrc;
    preview.className = "stamp-cursor";
    document.body.appendChild(preview);

    const movePreview = (e) => {
        preview.style.left = `${e.clientX}px`;
        preview.style.top = `${e.clientY}px`;
    };

    // Hide the trailing logo over the nav so it doesn't cover the links.
    const nav = document.querySelector(".nav");
    if (nav) {
        nav.addEventListener("pointerenter", () => preview.classList.add("over-nav"));
        nav.addEventListener("pointerleave", () => preview.classList.remove("over-nav"));
    }

    logo.addEventListener("click", (e) => {
        e.stopPropagation();
        stampMode = !stampMode;
        document.body.classList.toggle("stamp-mode", stampMode);
        if (stampMode) {
            window.addEventListener("pointermove", movePreview);
        } else {
            window.removeEventListener("pointermove", movePreview);
        }
    });

    const DRAG_SLOP = 5; // px of movement that counts as a drag, not a click

    document.querySelectorAll(".drag-element").forEach((element) => {
        // Listen on the wrapper: .drag-element has pointer-events:none, the
        // wrapper is the visible, clickable box, and stamping into it makes the
        // stamp travel with the card when it's dragged.
        const wrapper = element.querySelector(".drag-element-wrapper") || element;

        // Remember where the press started so a click that followed a drag can
        // be told apart from a clean click-in-place.
        let downX = 0, downY = 0;
        wrapper.addEventListener("pointerdown", (e) => {
            downX = e.clientX;
            downY = e.clientY;
        });

        wrapper.addEventListener("click", (e) => {
            if (!stampMode) return;
            if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_SLOP) return; // dragged, not stamped
            if (wrapper.querySelector(".logo-stamp")) return; // one stamp per card

            const rect = wrapper.getBoundingClientRect();
            const stamp = document.createElement("img");
            stamp.src = logoSrc;
            stamp.className = "logo-stamp";
            stamp.style.left = `${((e.clientX - rect.left) / rect.width) * 100}%`;
            stamp.style.top = `${((e.clientY - rect.top) / rect.height) * 100}%`;

            wrapper.appendChild(stamp);
        });
    });
};

// Info link toggles the side panel; Escape or a click outside closes it.
// Each .slider-toggle opens the panel named by its aria-controls. Only one
// panel is open at a time; the X, Escape or a click outside closes it.
const sliders = () => {
    const pairs = Array.from(document.querySelectorAll(".slider-toggle"))
        .map((toggle) => ({ toggle, slider: document.getElementById(toggle.getAttribute("aria-controls")) }))
        .filter(({ slider }) => slider);
    if (!pairs.length) return;

    const setOpen = ({ toggle, slider }, open) => {
        slider.classList.toggle("is-open", open);
        slider.setAttribute("aria-hidden", String(!open));
        toggle.setAttribute("aria-expanded", String(open));
    };
    const closeAll = () => pairs.forEach((pair) => setOpen(pair, false));

    pairs.forEach((pair) => {
        pair.toggle.addEventListener("click", (e) => {
            e.preventDefault();
            const wasOpen = pair.slider.classList.contains("is-open");
            closeAll();
            if (!wasOpen) setOpen(pair, true);
        });

        pair.slider.querySelector(".slider-close")?.addEventListener("click", () => setOpen(pair, false));
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAll();
    });

    document.addEventListener("click", (e) => {
        if (e.target.closest(".slider, .slider-toggle")) return;
        closeAll();
    });
};

// Clicking a cluster (not dragging inside it) stamps that cluster's text at
// the click point. Every click adds another copy.
const clusterStamps = () => {
    const DRAG_SLOP = 5; // px of movement that counts as a drag, not a click

    document.querySelectorAll(".cluster").forEach((cluster) => {
        const text = cluster.querySelector(".cluster-text")?.innerHTML.trim();
        if (!text) return;

        let downX = 0, downY = 0;
        cluster.addEventListener("pointerdown", (e) => {
            downX = e.clientX;
            downY = e.clientY;
        });

        cluster.addEventListener("click", (e) => {
            if (document.body.classList.contains("stamp-mode")) return; // logo stamping instead
            if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_SLOP) return; // dragged
            window.stampText?.(text, e.clientX, e.clientY);
        });
    });
};

// Scatters clusters across the layout without overlap, then scatters each
// cluster's images inside it.
const IMAGE_GAP = 16;   // min px between images inside a cluster
const CLUSTER_GAP = 40; // min px between clusters
const CLUSTER_ROOM = 1.5; // cell size vs. largest image: >1 leaves room to scatter and drag

// Sizes each cluster to fit its images, scatters the images inside it, then
// scatters the clusters across the layout. Nothing overlaps.
const positionDragElements = () => {
    const layout = document.querySelector(".drag-layout");
    if (!layout) return;

    const clusters = Array.from(layout.querySelectorAll(".cluster"));

    clusters.forEach((cluster) => {
        const images = Array.from(cluster.querySelectorAll(".drag-element"));
        const maxW = Math.max(...images.map((el) => el.offsetWidth));
        const maxH = Math.max(...images.map((el) => el.offsetHeight));
        const cols = Math.ceil(Math.sqrt(images.length));
        const rows = Math.ceil(images.length / cols);

        cluster.style.width = `${cols * (maxW * CLUSTER_ROOM + IMAGE_GAP)}px`;
        cluster.style.height = `${rows * (maxH * CLUSTER_ROOM + IMAGE_GAP)}px`;
        scatter(cluster, images, IMAGE_GAP);
    });

    scatter(layout, clusters, CLUSTER_GAP);

    gsap.to(".drag-element", { opacity: 1, duration: 0.1, stagger: 0.01, ease: 'power2.out' });
};

// Places `elements` at random inside `container` without overlap: the
// container is split into a grid with at least one cell per element, each
// element gets its own random cell and a random spot inside it, keeping `gap`
// px clear of the cell edges' neighbours.
const scatter = (container, elements, gap) => {
    if (!elements.length) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const maxW = Math.max(...elements.map((el) => el.offsetWidth));
    const maxH = Math.max(...elements.map((el) => el.offsetHeight));

    // Pick the grid shape that leaves the most free room around the largest
    // element, so the grid follows the container's proportions.
    let cols = 1;
    let bestRoom = -Infinity;
    for (let c = 1; c <= elements.length; c++) {
        const r = Math.ceil(elements.length / c);
        const room = Math.min(containerWidth / c - maxW, containerHeight / r - maxH);
        if (room > bestRoom) {
            bestRoom = room;
            cols = c;
        }
    }
    const rows = Math.ceil(elements.length / cols);
    const cellW = containerWidth / cols;
    const cellH = containerHeight / rows;
    // Shrink the gap when cells are tight (e.g. on phones) rather than push
    // elements into the neighbouring cell.
    const gapX = Math.max(0, Math.min(gap, cellW - maxW));
    const gapY = Math.max(0, Math.min(gap, cellH - maxH));

    // Shuffle the cells so empty ones end up in random places.
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    elements.forEach((element, i) => {
        element.style.right = "auto";
        element.style.bottom = "auto";

        const col = cells[i] % cols;
        const row = Math.floor(cells[i] / cols);
        const freeX = Math.max(0, cellW - element.offsetWidth - gapX);
        const freeY = Math.max(0, cellH - element.offsetHeight - gapY);

        element.style.left = `${col * cellW + gapX / 2 + Math.random() * freeX}px`;
        element.style.top = `${row * cellH + gapY / 2 + Math.random() * freeY}px`;
    });
};

window.addEventListener("load", () => {
    documentHeight();
    positionDragElements();
    // hoverInteraction();
    // dragElements();
    clusterStamps();
    dashboardControls();
    // logoStamp();
    sliders();
});

window.addEventListener("resize", () => {
    documentHeight();
});