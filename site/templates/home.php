<?= snippet('head') ?>
<?= snippet('header') ?>

<h1>You're logged in as that one girl with pink hair</h1>
<section class="background"></section>

<section class="drag-layout">
    <?php foreach ($page->clusters()->toStructure() as $cluster): ?>
        <?php if ($cluster->images()->toFiles()->isEmpty()) continue ?>
        <div class="cluster">
            <?php if ($cluster->text()->isNotEmpty()): ?>
                <div class="cluster-text" hidden>
                    <p><?= $cluster->text() ?></p>
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
<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>
<?= snippet('foot') ?>