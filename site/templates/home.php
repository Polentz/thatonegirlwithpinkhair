<?php
// Same clusters as the home page, handed to 3d.js as JSON.
$clusters = [];
foreach (page('2d')->clusters()->toStructure() as $cluster) {
    $images = [];
    foreach ($cluster->images()->toFiles() as $file) {
        $images[] = [
            'url' => $file->resize(600)->url(),
            'ratio' => $file->ratio() ?: 1, // width / height
        ];
    }
    if (empty($images))
        continue;
    $clusters[] = [
        'text' => $cluster->text()->value(),
        'images' => $images,
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

<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>
<?= snippet('slider', ['id' => 'how-to-slider', 'label' => 'how-to', 'text' => $site->howToText()]) ?>

<footer class="footer">
    <a class="nav-label slider-toggle" href="#how-to-slider" aria-controls="how-to-slider" aria-expanded="false">?</a>
    <a class="nav-label" href="<?= url('2d') ?>">2D</a>
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