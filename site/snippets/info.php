<?php if ($site->infoText()->isNotEmpty()): ?>
    <aside class="slider" id="info-slider" aria-hidden="true">
        <div class="slider-button">
            <button class="slider-close" type="button" aria-label="Close info">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="4" y1="4" x2="20" y2="20" />
                    <line x1="20" y1="4" x2="4" y2="20" />
                </svg>
            </button>
        </div>
        <div class="slider-content">
            <?= $site->infoText()->kt() ?>
        </div>
    </aside>
<?php endif ?>