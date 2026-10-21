<?php
// Same clusters as the 2D page, handed to 3d.js as JSON. Clusters with images
// are numbered in order; the number names each "Read more" panel, as on 2D.
$clusters = [];
$readMorePanels = []; // panel id => [title, text]
foreach ($page->clusters()->toStructure() as $cluster) {
    $images = [];
    foreach ($cluster->images()->toFiles() as $file) {
        $images[] = [
            'url' => $file->resize(600)->url(),
            'ratio' => $file->ratio() ?: 1, // width / height
        ];
    }
    if (empty($images))
        continue;
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

<footer class="footer">
    <a class="nav-label slider-toggle" href="#how-to-slider" aria-controls="how-to-slider" aria-expanded="false">?</a>
</footer>

<script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
        }
    }
</script>
<script>
    window.UNIVERSE_CLUSTERS = <?= json_encode($clusters, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;
</script>
<script type="module" src="<?= url('assets/js/3d.js') ?>"></script>

<?= snippet('foot') ?>