const documentHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty("--doc-height", `${window.innerHeight}px`);
};

const draggableElems = document.querySelectorAll(".draggable, .block");
let draggies = []
for (let i = 0; i < draggableElems.length; i++) {
    let draggableElem = draggableElems[i];
    let draggie = new Draggabilly(draggableElem, {});
    draggies.push(draggie);
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
        // Clear any CSS-driven positioning so inline top/left take over cleanly
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
};

const selectElements = () => {
    const elements = document.querySelectorAll(".drag-element");
    const buttons = document.querySelectorAll(".button-element");
    const reset = document.querySelector(".reset");
    // const headerButton = document.querySelector(".button-header");
    // const headerBox = document.querySelector(".header-box");

    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            const pathName = e.currentTarget.dataset.path;
            elements.forEach(element => {
                const elementPath = element.dataset.path;
                if (pathName === elementPath && element.classList.contains("step-2")) {
                    element.classList.add("show");
                    button.classList.add("selected");
                    setTimeout(() => {
                        element.classList.add("opacity");
                    }, 500);
                    setTimeout(() => {
                        reset.classList.add("show");
                    }, 1000);
                } else {
                    element.classList.add("opacity");
                    setTimeout(() => {
                        element.classList.add("hide");
                    }, 1000);
                };
                // if (pathName != elementPath && element.classList.contains("step-1")) {
                //     element.classList.add("opacity");
                //     setTimeout(() => {
                //         element.classList.add("hide");
                //     }, 1000);
                // };
            });
        });
    });

    // headerButton.addEventListener("click", () => {
    //     elements.forEach(element => {
    //         element.style.display = "none";
    //         headerBox.style.display = "block";
    //         setTimeout(() => {
    //             headerBox.classList.add("opacity");
    //         }, 100);
    //     });
        
    // });
};

const audioPlayer = () => {
    const audioComponent = document.querySelectorAll(".audio-component");
    const playBtns = document.querySelectorAll(".play-btn");
    audioComponent.forEach(component => {
        playBtns.forEach(btn => {
            if (btn.parentNode.parentNode === component) {
                const audioPlayerContainer = component.querySelector(".audio-player");
                const seekSlider = component.querySelector(".seek-slider");
                const audio = component.querySelector("audio");
                const stopBtn = component.querySelector(".stop-btn");
                const playIcon = component.querySelector(".play-icon");
                const pauseIcon = component.querySelector(".pause-icon");
                const stopIcon = component.querySelector(".stop-icon");
                const volumeIcon = component.querySelector(".volume-icon");
                const muteIcon = component.querySelector(".mute-icon");
                const durationContainer = component.querySelector(".audio-duration");
                const currentTimeContainer = component.querySelector(".audio-progress");
                const volumeContainer = component.querySelector(".audio-volume");
                let raf = null;

                btn.addEventListener("click", () => {
                    if (audio.paused) {
                        audio.play();
                        requestAnimationFrame(whilePlaying);
                    } else {
                        audio.pause();
                        cancelAnimationFrame(raf);
                    };
                    playIcon.classList.toggle("toggle-play");
                    pauseIcon.classList.toggle("toggle-play");
                    stopIcon.classList.add("toggle-play");
                });

                stopBtn.addEventListener("click", () => {
                    stopAudio();
                });

                audio.addEventListener("timeupdate", () => {
                    if (audio.duration === audio.currentTime) {
                        stopAudio();
                    };
                });

                volumeContainer.addEventListener("click", () => {
                    controlVolume();
                })

                const controlVolume = () => {
                    if (audio.volume > 0) {
                        audio.volume = 0;
                        volumeIcon.classList.add("toggle-volume");
                        muteIcon.classList.add("toggle-volume");
                    } else {
                        audio.volume = 1;
                        volumeIcon.classList.remove("toggle-volume");
                        muteIcon.classList.remove("toggle-volume");
                    }
                }

                const stopAudio = () => {
                    audio.pause();
                    audio.currentTime = 0;
                    playIcon.classList.remove("toggle-play");
                    pauseIcon.classList.remove("toggle-play");
                    stopIcon.classList.remove("toggle-play");
                };

                const showRangeProgress = (rangeInput) => {
                    audioPlayerContainer.style.setProperty("--seek-before-width", rangeInput.value / rangeInput.max * 100 + "%");
                };

                seekSlider.addEventListener("input", (e) => {
                    showRangeProgress(e.target);
                });

                const calculateTime = (sec) => {
                    let minutes = Math.floor(sec / 60);
                    let seconds = Math.floor(sec - minutes * 60);
                    if (seconds < 10) {
                        seconds = `0${seconds}`;
                    }
                    return `${minutes}:${seconds}`;
                };

                const displayDuration = () => {
                    durationContainer.textContent = calculateTime(audio.duration);
                };

                const setSliderMax = () => {
                    seekSlider.max = Math.floor(audio.duration);
                };

                const whilePlaying = () => {
                    seekSlider.value = Math.floor(audio.currentTime);
                    currentTimeContainer.textContent = calculateTime(seekSlider.value);
                    audioPlayerContainer.style.setProperty("--seek-before-width", `${seekSlider.value / seekSlider.max * 100}%`);
                    raf = requestAnimationFrame(whilePlaying);
                };

                if (audio.readyState > 0) {
                    displayDuration();
                    setSliderMax();
                }

                audio.addEventListener("playing", () => {
                    displayDuration();
                    setSliderMax();
                });

                seekSlider.addEventListener("input", () => {
                    currentTimeContainer.textContent = calculateTime(seekSlider.value);
                    if (!audio.paused) {
                        cancelAnimationFrame(raf);
                    };
                });

                seekSlider.addEventListener("change", () => {
                    audio.currentTime = seekSlider.value;
                    if (!audio.paused) {
                        requestAnimationFrame(whilePlaying);
                    }
                });
            };
        });
    });

    const buttonsClose = document.querySelectorAll(".subpage .popup-ui");
    const audios = document.querySelectorAll("audio");
    buttonsClose.forEach(button => {
        button.addEventListener("click", () => {
            audios.forEach(audio => {
                if (audio.play) {
                    audio.pause();
                };
            });
        });
    });
};

window.addEventListener("load", () => {
    documentHeight();
    positionDragElements();
    selectElements();
    audioPlayer();
});

window.addEventListener("resize", () => {
    documentHeight();
});