<?php if ($page->howToText()->isNotEmpty()): ?>
    <footer class="footer">
        <a class="nav-label slider-toggle" href="#how-to-slider" aria-controls="how-to-slider" aria-expanded="false">?</a>
    </footer>
<?php endif ?>

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