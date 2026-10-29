<?= snippet('head') ?>
<?= snippet('header') ?>

<main class="text-page">
    <div class="text-page-content">
        <?= $page->text()->toBlocks() ?>
    </div>
</main>

<?= snippet('slider', ['id' => 'info-slider', 'label' => 'info', 'text' => $site->infoText()]) ?>
<?= snippet('slider', ['id' => 'contact-slider', 'label' => 'contact', 'text' => $site->contactText()]) ?>

<?= snippet('foot') ?>