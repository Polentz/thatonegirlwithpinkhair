<?php

/** @var \Kirby\Cms\Block $block */
$alt = $block->alt();
$caption = $block->caption();
$crop = $block->crop()->isTrue();
$link = $block->link();
$ratio = $block->ratio()->or('auto');
$image = $block->image()->toFile();
if (!$image) {
    return;
}
$alt = $alt->or($image->alt());
$src = $image->url();


?>

<figure<?= Html::attr(['data-ratio' => $ratio, 'data-crop' => $crop], null, ' ') ?>>
    <?php if ($link->isNotEmpty()): ?>
        <a href="<?= Str::esc($link->toUrl()) ?>" target="_blank">
            <img src="<?= $src ?>" alt="<?= $alt->esc() ?>">
        </a>
    <?php else: ?>
        <img src="<?= $src ?>" alt="<?= $alt->esc() ?>">
    <?php endif ?>

    <?php if ($caption->isNotEmpty()): ?>
        <figcaption>
            <?= $caption ?>
        </figcaption>
    <?php endif ?>
    </figure>