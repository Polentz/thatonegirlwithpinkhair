<?php
$clusters = [];
$readMorePanels = []; // panel id => [title, text]
foreach ($page->children()->listed()->template('cluster') as $cluster) {
    $images = [];
    foreach ($cluster->gallery() as $file) {
        $images[] = [
            'url' => $file->resize(600)->url(),
            'ratio' => $file->ratio() ?: 1, // width / height
        ];
    }
    $readMoreId = null;
    if ($cluster->readMore()->isNotEmpty()) {
        $readMoreId = 'read-more-' . (count($clusters) + 1);
        $readMorePanels[$readMoreId] = [$cluster->title(), $cluster->readMore()];
    }
    $clusters[] = [
        'text' => $cluster->title()->value(),
        'images' => $images,
        'filters' => $cluster->filters()->split(),
        'readMore' => $readMoreId,
    ];
}
?>
<?= snippet('head') ?>
<?= snippet('header') ?>

<section class="universe" aria-label="Clusters of images in 3D"></section>

<ul class="universe-fallback">
    <?php foreach ($clusters as $cluster): ?>
        <li><?= $cluster['text'] ?></li>
    <?php endforeach ?>
</ul>

<?php foreach ($readMorePanels as $id => [$title, $text]): ?>
    <?= snippet('slider', ['id' => $id, 'label' => 'read more', 'title' => $title, 'text' => $text]) ?>
<?php endforeach ?>
<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>
<?= snippet('slider', ['id' => 'how-to-slider', 'label' => 'how-to', 'text' => $page->howToText()]) ?>

<?= snippet('footer', ['clusters' => $clusters]) ?>
<?= snippet('foot') ?>