<?php
// Same clusters as the home page, handed to universe.js as JSON.
$clusters = [];
foreach (page('home')->clusters()->toStructure() as $cluster) {
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

<h1>You're logged in as that one girl with pink hair</h1>

<section class="universe" aria-label="Clusters of images in 3D"></section>

<?php /* Plain-HTML fallback for screen readers and search engines. */ ?>
<ul class="universe-fallback">
    <?php foreach ($clusters as $cluster): ?>
        <li><?= $cluster['text'] ?></li>
    <?php endforeach ?>
</ul>

<!-- <a class="universe-back nav-label" href="<?= url() ?>">2D</a> -->

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
<script type="module" src="<?= url('assets/js/universe.js') ?>"></script>

<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>
<?= snippet('foot') ?>