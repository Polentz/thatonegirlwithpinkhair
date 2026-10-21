/* ---------- CURRENTLY NOT IN USE! ---------- */

// CURRENTLY NOT IN USE!
const dragElements = () => {
    document.querySelectorAll(".draggable").forEach((handle) => {
        const target = handle.closest(".drag-element") || handle;
        makeDraggable(handle, target);
    });
};

// CURRENTLY NOT IN USE!
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

// CURRENTLY NOT IN USE!
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

// CURRENTLY NOT IN USE!
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

// CURRENTLY NOT IN USE!
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

/* ---------- IN USE ---------- */

const IMAGE_GAP = 8;    // px between neighbours inside a cluster: close, so they read as a group
const CLUSTER_GAP = 40; // min px between clusters
const MAX_ATTEMPTS = 8;

const documentHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty("--doc-height", `${window.innerHeight}px`);
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
    // During a close-up the bounds grow by half the layout, so an image right
    // at the edge can still sit in the middle of the screen.
    const clampAndRender = (s) => {
        const extraX = focused ? layout.offsetWidth / 2 : 0;
        const extraY = focused ? layout.offsetHeight / 2 : 0;
        const maxX = Math.max(0, (layout.offsetWidth * (s - 1)) / 2 + extraX);
        const maxY = Math.max(0, (layout.offsetHeight * (s - 1)) / 2 + extraY);
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
    const toScaleX = gsap.quickTo(layout, "scaleX", { duration: 0.1, ease: "power3.out", onUpdate: () => panUpdater() });
    const toScaleY = gsap.quickTo(layout, "scaleY", { duration: 0.1, ease: "power3.out" });
    const applyScale = () => {
        // Start from the live scale: a close-up animation may have changed it.
        const live = gsap.getProperty(layout, "scaleX") || 1;
        toScaleX(scale, live);
        toScaleY(scale, live);
    };

    // --- Close-up: zoom in on one image ---------------------------------
    // Eases the view until the image sits centred and fills CLOSE_UP_SIZE of
    // the screen, like moving closer to it, with its cluster's text as a
    // caption. The view from before is restored when the close-up ends.
    const CLOSE_UP_SIZE = 0.5;
    const CLOSE_UP_DURATION = 0.9;

    const caption = document.createElement("div");
    caption.className = "closeup-caption";
    document.body.appendChild(caption);

    let focused = null;   // the .drag-element in close-up
    let savedView = null; // { s, x, y } to return to
    let animating = false;
    const view = { s: 1, x: 0, y: 0 }; // tweened, then written to the layout

    const animateView = (s, x, y) => {
        gsap.killTweensOf(layout); // stop any wheel-zoom easing
        gsap.killTweensOf(view);
        view.s = gsap.getProperty(layout, "scaleX") || 1;
        view.x = panX;
        view.y = panY;
        scale = s;
        animating = true;
        // Blurred glows are what make each zoom frame expensive (their blur
        // grows with the zoom), so drop them while moving and bring them back
        // once the view settles.
        layout.classList.add("is-zooming");
        gsap.to(view, {
            s, x, y,
            duration: CLOSE_UP_DURATION,
            ease: "power3.inOut",
            onUpdate: () => {
                panX = view.x;
                panY = view.y;
                gsap.set(layout, { scaleX: view.s, scaleY: view.s, x: view.x, y: view.y });
            },
            onComplete: () => {
                animating = false;
                layout.classList.remove("is-zooming");
                updateCursor();
            },
        });
    };

    window.focusImage = (element, html) => {
        if (!focused) {
            savedView = { s: gsap.getProperty(layout, "scaleX") || 1, x: panX, y: panY };
        } else {
            focused.style.zIndex = "";
        }
        focused = element;
        element.style.zIndex = 2000; // above its neighbours and the cluster text

        // Pan that puts the image's centre in the middle of the screen at
        // scale s: the layout's centre sits at origin + pan, and a point d
        // (unscaled) from it lands at origin + pan + d·s.
        const rect = layout.getBoundingClientRect();
        const liveS = gsap.getProperty(layout, "scaleX") || 1;
        const originX = rect.left + rect.width / 2 - gsap.getProperty(layout, "x");
        const originY = rect.top + rect.height / 2 - gsap.getProperty(layout, "y");
        const r = element.getBoundingClientRect();
        const dx = (r.left + r.width / 2 - (rect.left + rect.width / 2)) / liveS;
        const dy = (r.top + r.height / 2 - (rect.top + rect.height / 2)) / liveS;

        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const s = CLOSE_UP_SIZE * Math.min(window.innerHeight / height, window.innerWidth / width);
        animateView(s, window.innerWidth / 2 - originX - dx * s, window.innerHeight / 2 - originY - dy * s);

        // Caption under where the image will end up; fades in as it arrives.
        caption.innerHTML = html ? `<p>${html}</p>` : "";
        caption.style.left = `${window.innerWidth / 2}px`;
        caption.style.top = `${window.innerHeight / 2 + (height * s) / 2}px`;
        caption.style.maxWidth = `${width * s}px`; // no wider than the image
        caption.style.transitionDelay = `${CLOSE_UP_DURATION * 0.6}s`;
        caption.classList.toggle("is-visible", !!html);
    };

    const unfocus = () => {
        if (!focused) return;
        focused.style.zIndex = "";
        focused = null;
        caption.style.transitionDelay = "0s";
        caption.classList.remove("is-visible");
        animateView(savedView.s, savedView.x, savedView.y);
        savedView = null;
    };

    // Keeps the caption under the close-up image while it's panned around.
    const placeCaption = () => {
        const r = focused.getBoundingClientRect();
        caption.style.left = `${r.left + r.width / 2}px`;
        caption.style.top = `${r.bottom}px`;
        caption.style.maxWidth = `${r.width}px`;
    };

    window.unfocusImage = unfocus;
    window.focusedImage = () => focused;

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") unfocus();
    });

    // --- Zoom (wheel), anchored to the cursor ---------------------------
    window.addEventListener("wheel", (e) => {
        if (e.target.closest(".slider")) return; // let the info panel scroll normally
        e.preventDefault(); // drive the zoom instead of scrolling the page

        // Zooming during a close-up ends it; wait until the view settles.
        if (focused) unfocus();
        if (animating) return;

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

    let captured = false; // pointer captured once the press has turned into a drag

    layout.addEventListener("pointerdown", (e) => {
        if (animating) return;
        // Pan from empty space only, except in a close-up, where the image
        // fills most of the screen and dragging it pans too.
        if (!focused && e.target.closest(".drag-element")) return;
        if (scale <= 1) return; // nothing to pan until zoomed in
        if (activeId !== null) return; // already panning with another pointer

        activeId = e.pointerId;
        captured = false;

        startX = e.clientX;
        startY = e.clientY;
        startPanX = panX;
        startPanY = panY;

        panUpdater = renderPan; // a lingering zoom tween shouldn't fight the drag
        layout.style.cursor = "grabbing";
    });

    layout.addEventListener("pointermove", (e) => {
        if (e.pointerId !== activeId) return;
        // Capture only once it's really a drag, so a plain click still lands
        // on the image under the pointer (to switch or end the close-up).
        if (!captured) {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) <= 5) return;
            layout.setPointerCapture(activeId); // keep moves even if the pointer leaves
            captured = true;
            // Promote the layout to its own GPU layer while panning, so moving
            // it doesn't repaint every image and glow on each frame. Only
            // during the pan: left on, zoom would scale a stale bitmap and
            // look blurry.
            layout.style.willChange = "transform";
        }
        panX = startPanX + (e.clientX - startX);
        panY = startPanY + (e.clientY - startY);
        renderPan(); // instant 1:1 tracking, kept within bounds
        if (focused) placeCaption();
    });

    const endPan = (e) => {
        if (e.pointerId !== activeId) return;
        if (captured) layout.releasePointerCapture(activeId);
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

// Filters menu in the nav: the label opens the list; choosing a filter keeps
// only the clusters tagged with it ("All" shows every cluster). Clicking
// outside or Escape closes the list. The choice is also announced as a
// "clusterfilter" event, which the 3D page listens to.
const filtersMenu = () => {
    const toggle = document.querySelector(".filters-toggle");
    const list = document.getElementById("filters-list");
    if (!toggle || !list) return;

    const setOpen = (open) => {
        list.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", (e) => {
        e.preventDefault();
        setOpen(list.hidden);
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-filters")) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
    });

    const options = list.querySelectorAll(".filter-option");
    options.forEach((option) => {
        option.addEventListener("click", () => {
            const filter = option.dataset.filter; // "" for All
            options.forEach((o) => o.classList.toggle("is-active", o === option));

            // 2D: fade clusters out/in (in CSS), one after another.
            const changing = Array.from(document.querySelectorAll(".cluster")).filter((cluster) => {
                const filters = JSON.parse(cluster.dataset.filters || "[]");
                const hide = !!filter && !filters.includes(filter);
                return hide !== cluster.classList.contains("is-filtered-out");
            });
            changing.forEach((cluster, i) => {
                cluster.style.setProperty("--filter-delay", `${i * 0.08}s`);
                cluster.classList.toggle("is-filtered-out");
            });
            // Don't stay zoomed in on an image that just disappeared.
            if (window.focusedImage?.()?.closest(".is-filtered-out")) window.unfocusImage();

            window.dispatchEvent(new CustomEvent("clusterfilter", { detail: { filter } }));
        });
    });
};

// Clicking an image (not dragging) marks the trail (a dot first, then a line
// from the previous click) and zooms in on it, captioned with its cluster's
// text. Clicking it again or clicking empty space zooms back out.
const imageClicks = () => {
    const DRAG_SLOP = 5; // px of movement that counts as a drag, not a click

    document.querySelectorAll(".drag-element").forEach((element) => {
        const wrapper = element.querySelector(".drag-element-wrapper") || element;
        const text = element.closest(".cluster")?.querySelector(".cluster-text")?.innerHTML.trim() || "";

        let downX = 0, downY = 0;
        wrapper.addEventListener("pointerdown", (e) => {
            downX = e.clientX;
            downY = e.clientY;
        });

        wrapper.addEventListener("click", (e) => {
            if (document.body.classList.contains("stamp-mode")) return; // logo stamping instead
            if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_SLOP) return; // dragged
            if (window.focusedImage?.() === element) return window.unfocusImage();
            window.stampPoint?.(e.clientX, e.clientY);
            window.focusImage?.(element, text);
        });
    });

    // Clicking empty space ends the close-up; the click that ends a pan doesn't.
    let pressX = 0, pressY = 0;
    document.addEventListener("pointerdown", (e) => {
        pressX = e.clientX;
        pressY = e.clientY;
    }, true);

    document.addEventListener("click", (e) => {
        if (e.target.closest(".drag-element-wrapper, .slider, .header, .footer")) return;
        if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > DRAG_SLOP) return;
        window.unfocusImage?.();
    });
};

// Packs each cluster tightly around its text, then scatters the clusters
// across the layout. If they don't all fit side by side, it tries again with
// smaller images (via --card-scale) until nothing overlaps.
const positionDragElements = () => {
    const layout = document.querySelector(".drag-layout");
    if (!layout) return;

    const clusters = Array.from(layout.querySelectorAll(".cluster"));
    let cardScale = 1;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        layout.style.setProperty("--card-scale", cardScale);
        clusters.forEach(packCluster);
        scatter(layout, clusters, CLUSTER_GAP);
        if (!clustersCollide(layout, clusters)) break;
        cardScale *= 0.9;
    };

    gsap.to(".drag-element, .cluster-text", { opacity: 1, duration: 0.1, stagger: 0.01, ease: 'power2.out' });
};

// Text in the middle; each image (in random order) takes the closest free
// spot, searched along a spiral from the centre in a random direction, so
// the cluster forms a tight, irregular bunch. The cluster is then sized to
// its contents.
const packCluster = (cluster) => {
    const boxes = new Map(); // element -> box around (0, 0)
    const fits = (box) => Array.from(boxes.values()).every((other) =>
        box.left >= other.left + other.width + IMAGE_GAP ||
        box.left + box.width + IMAGE_GAP <= other.left ||
        box.top >= other.top + other.height + IMAGE_GAP ||
        box.top + box.height + IMAGE_GAP <= other.top
    );
    const boxAt = (el, x, y) => ({
        left: x - el.offsetWidth / 2, top: y - el.offsetHeight / 2,
        width: el.offsetWidth, height: el.offsetHeight,
    });

    const text = cluster.querySelector(".cluster-text");
    if (text) boxes.set(text, boxAt(text, 0, 0));

    const images = Array.from(cluster.querySelectorAll(".drag-element"));
    for (let i = images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
    };

    images.forEach((image) => {
        const startAngle = Math.random() * Math.PI * 2;
        for (let radius = 0; ; radius += 4) {
            const steps = Math.max(8, Math.ceil((2 * Math.PI * radius) / 6)); // a try every ~6px
            for (let k = 0; k < steps; k++) {
                const angle = startAngle + (k / steps) * Math.PI * 2;
                const box = boxAt(image, radius * Math.cos(angle), radius * Math.sin(angle));
                if (fits(box)) return boxes.set(image, box);
            };
        };
    });

    // Shift everything so the cluster's top-left is (0, 0) and size it to fit.
    const all = Array.from(boxes.values());
    const minLeft = Math.min(...all.map((b) => b.left));
    const minTop = Math.min(...all.map((b) => b.top));
    const maxRight = Math.max(...all.map((b) => b.left + b.width));
    const maxBottom = Math.max(...all.map((b) => b.top + b.height));

    boxes.forEach((box, el) => {
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.left = `${box.left - minLeft}px`;
        el.style.top = `${box.top - minTop}px`;
    });
    cluster.style.width = `${maxRight - minLeft}px`;
    cluster.style.height = `${maxBottom - minTop}px`;
};

// True if any two clusters overlap or one sticks out of the layout. Items
// inside a cluster can't overlap: packCluster only uses free spots.
const clustersCollide = (layout, clusters) => {
    const boxes = clusters.map((c) => ({
        left: c.offsetLeft, top: c.offsetTop,
        right: c.offsetLeft + c.offsetWidth, bottom: c.offsetTop + c.offsetHeight,
    }));
    const outside = boxes.some((b) =>
        b.left < 0 || b.top < 0 || b.right > layout.clientWidth || b.bottom > layout.clientHeight
    );
    const overlap = boxes.some((a, i) => boxes.slice(i + 1).some((b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    ));
    return outside || overlap;
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
    imageClicks();
    dashboardControls();
    sliders();
    filtersMenu();
});

window.addEventListener("resize", () => {
    documentHeight();
});