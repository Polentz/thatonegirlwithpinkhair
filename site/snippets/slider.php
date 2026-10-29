<?php if ($text->isNotEmpty()): ?>
    <aside class="slider" id="<?= $id ?>" inert>
        <div class="slider-button">
            <button class="slider-close" type="button" aria-label="Close <?= $label ?>">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="4" y1="4" x2="20" y2="20" />
                    <line x1="20" y1="4" x2="4" y2="20" />
                </svg>
            </button>
        </div>
        <div class="slider-content">
            <?php if (isset($title) && $title->isNotEmpty()): ?>
                <p><strong><?= strip_tags($title->value(), '<em><i><b><strong><u><s><a>') ?></strong></p>
            <?php endif ?>
            <?= $text->kt() ?>
        </div>
    </aside>
<?php endif ?>