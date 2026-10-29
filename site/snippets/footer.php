<?php if ($page->howToText()->isNotEmpty()): ?>
    <footer class="footer">
        <button class="nav-label slider-toggle" type="button" aria-controls="how-to-slider" aria-expanded="false">?</button>
    </footer>
<?php endif ?>

<script type="importmap">
    {
        "imports": {
            "three": "<?= url('assets/js/vendor/three/three.module.min.js') ?>",
            "three/addons/": "<?= url('assets/js/vendor/three/addons/') ?>"
        }
    }
</script>
<script>
    window.UNIVERSE_CLUSTERS = <?= json_encode($clusters, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;
</script>
<script type="module" src="<?= url('assets/js/3d.js') ?>"></script>