<?= snippet('head') ?>
<?= snippet('header') ?>

<section class="background"></section>

<?php
// Clusters with images, numbered in order; the number names each cluster's
// "Read more" panel (read-more-1, read-more-2…), the same way as on the 3D page.
$clusters = $page->clusters()->toStructure()->filter(fn ($c) => $c->images()->toFiles()->isNotEmpty());
?>
<section class="drag-layout">
    <?php $n = 0 ?>
    <?php foreach ($clusters as $cluster): ?>
        <?php $n++ ?>
            <div class="cluster" data-filters="<?= esc(json_encode($cluster->filters()->split()), 'attr') ?>">
            <?php if ($cluster->text()->isNotEmpty() || $cluster->readMore()->isNotEmpty()): ?>
                <?php /* Placed together at the cluster's centre: "Read more" right under the text. */ ?>
                <div class="cluster-label">
                    <?php if ($cluster->text()->isNotEmpty()): ?>
                        <p class="cluster-text"><?= $cluster->text() ?></p>
                    <?php endif ?>
                    <?php if ($cluster->readMore()->isNotEmpty()): ?>
                        <button class="read-more slider-toggle" type="button" aria-controls="read-more-<?= $n ?>"
                            aria-expanded="false">Read more</button>
                    <?php endif ?>
                </div>
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

<?php $n = 0 ?>
<?php foreach ($clusters as $cluster): ?>
    <?php $n++ ?>
    <?= snippet('slider', [
        'id' => 'read-more-' . $n,
        'label' => 'read more',
        'title' => $cluster->text(),
        'text' => $cluster->readMore(),
    ]) ?>
<?php endforeach ?>

<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>
<?= snippet('slider', ['id' => 'how-to-slider', 'label' => 'how-to', 'text' => $page->howToText()]) ?>

<footer class="footer">
    <a class="nav-label slider-toggle" href="#how-to-slider" aria-controls="how-to-slider" aria-expanded="false">?</a>
    <a class="nav-label" href="<?= url() ?>">3D</a>
</footer>

<?= snippet('foot') ?>