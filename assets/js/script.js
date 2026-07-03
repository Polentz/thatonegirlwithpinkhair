const documentHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty("--doc-height", `${window.innerHeight}px`);
};


// Makes `target` follow the pointer while `handle` is dragged.
// Delta-based, so it works regardless of any transform on the target.
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
        target.style.left = `${startLeft + (e.clientX - startX)}px`;
        target.style.top = `${startTop + (e.clientY - startY)}px`;
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
        const toScale = gsap.quickTo(wrapper, "scale", { duration: 0.35, ease: "power3.out" });

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

const positionDragElements = () => {
    const container = document.querySelector(".drag-layout");
    if (!container) return;

    const elements = Array.from(document.querySelectorAll(".drag-element"));
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const gap = 10; // minimum space kept between elements
    const maxAttempts = 300;
    const placed = []; // bounding boxes already positioned

    elements.forEach(element => {
        element.style.right = "auto";
        element.style.bottom = "auto";

        const rect = element.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const maxLeft = Math.max(0, containerWidth - width);
        const maxTop = Math.max(0, containerHeight - height);

        let left = 0;
        let top = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            left = Math.random() * maxLeft;
            top = Math.random() * maxTop;

            const overlaps = placed.some(box =>
                left < box.left + box.width + gap &&
                left + width + gap > box.left &&
                top < box.top + box.height + gap &&
                top + height + gap > box.top
            );

            if (!overlaps) break; // found a free spot, keep this position
        }

        placed.push({ left, top, width, height });
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
    });
    gsap.to(elements, { opacity: 1, duration: 0.1, stagger: 0.01, ease: 'power2.out' });
};

window.addEventListener("load", () => {
    documentHeight();
    positionDragElements();
    // hoverInteraction();
    dragElements();
});

window.addEventListener("resize", () => {
    documentHeight();
});