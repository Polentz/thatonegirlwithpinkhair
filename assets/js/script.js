// Shared by the 2D and 3D pages: page height, side panels and the filters
// menu. Anything layout-specific lives in 2d.js / 3d.js.

const documentHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty("--doc-height", `${window.innerHeight}px`);
};

// Info link toggles the side panel; Escape or a click outside closes it.
// Each .slider-toggle opens the panel named by its aria-controls. Only one
// panel is open at a time; the X, Escape or a click outside closes it.
const sliders = () => {
    // Every panel, with the toggles that point at it (a panel may have none:
    // the 3D page opens "Read more" panels through window.openSlider).
    const pairs = Array.from(document.querySelectorAll(".slider")).map((slider) => ({
        slider,
        toggles: Array.from(document.querySelectorAll(`.slider-toggle[aria-controls="${slider.id}"]`)),
    }));
    if (!pairs.length) return;

    const setOpen = ({ toggles, slider }, open) => {
        slider.classList.toggle("is-open", open);
        slider.setAttribute("aria-hidden", String(!open));
        toggles.forEach((toggle) => toggle.setAttribute("aria-expanded", String(open)));
    };
    const closeAll = () => pairs.forEach((pair) => setOpen(pair, false));

    // A panel opened from a click elsewhere (the 3D canvas) shouldn't be
    // closed again straight away by that same click reaching the document.
    let ignoreClicksUntil = 0;

    window.openSlider = (id) => {
        const pair = pairs.find(({ slider }) => slider.id === id);
        if (!pair) return;
        closeAll();
        setOpen(pair, true);
        ignoreClicksUntil = performance.now() + 300;
    };

    pairs.forEach((pair) => {
        pair.toggles.forEach((toggle) => toggle.addEventListener("click", (e) => {
            e.preventDefault();
            const wasOpen = pair.slider.classList.contains("is-open");
            closeAll();
            if (!wasOpen) setOpen(pair, true);
        }));

        pair.slider.querySelector(".slider-close")?.addEventListener("click", () => setOpen(pair, false));
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAll();
    });

    document.addEventListener("click", (e) => {
        if (performance.now() < ignoreClicksUntil) return;
        if (e.target.closest(".slider, .slider-toggle")) return;
        closeAll();
    });
};

// Filters menu in the nav: the label opens the list; choosing a filter keeps
// only the clusters tagged with it, and clicking the active filter again
// turns it off (every cluster shows). Clicking outside or Escape closes the
// list. The choice is announced as a "clusterfilter" event; the 2D (2d.js)
// and 3D (3d.js) pages each listen to it and hide their own clusters.
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
            // Clicking the active filter again clears it ("" = show all).
            const filter = option.classList.contains("is-active") ? "" : option.dataset.filter;
            options.forEach((o) => o.classList.toggle("is-active", !!filter && o === option));
            // Mark the label with a superscript 1 while a filter is on.
            const count = toggle.querySelector(".filters-count");
            if (count) count.hidden = !filter;

            window.dispatchEvent(new CustomEvent("clusterfilter", { detail: { filter } }));
        });
    });
};

window.addEventListener("load", () => {
    documentHeight();
    sliders();
    filtersMenu();
});

window.addEventListener("resize", () => {
    documentHeight();
});