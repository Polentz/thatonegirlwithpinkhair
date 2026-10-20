<?= snippet('head') ?>
<?= snippet('header') ?>

<section class="background"></section>

<section class="drag-layout">
    <?php foreach ($page->clusters()->toStructure() as $cluster): ?>
        <?php if ($cluster->images()->toFiles()->isEmpty())
            continue ?>
            <div class="cluster">
            <?php if ($cluster->text()->isNotEmpty()): ?>
                <p class="cluster-text"><?= $cluster->text() ?></p>
            <?php endif ?>
            <?php foreach ($cluster->images()->toFiles() as $file): ?>
                <div class="drag-element">
                    <div class="drag-element-wrapper draggable">
                        <img class="drag-image" src="<?= $file->resize(600)->url() ?>">
                    </div>
                </div>
            <?php endforeach ?>
        </div>
    <?php endforeach ?>
</section>

<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>
<?= snippet('slider', ['id' => 'how-to-slider', 'label' => 'how-to', 'text' => $site->howToText()]) ?>

<footer class="footer">
    <a class="nav-label slider-toggle" href="#how-to-slider" aria-controls="how-to-slider" aria-expanded="false">?</a>
    <a class="nav-label" href="<?= url('universe') ?>">3D</a>
</footer>

<?= snippet('foot') ?>