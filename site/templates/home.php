<?= snippet('head') ?>
<?= snippet('header') ?>

<h1>You're logged in as that one girl with pink hair</h1>
<section class="background"></section>

<section class="line-layout">
    <div class="blocks-stored" hidden>
        <?php foreach ($page->blocks()->toBlocks() as $block): ?>
            <?= $block ?>
        <?php endforeach ?>
    </div>
    <div class="blocks">
    </div>
</section>

<section class="drag-layout">
    <?php foreach ($page->gallery()->toFiles() as $file): ?>
        <div class="drag-element">
            <div class="drag-element-wrapper draggable">
                <img class="drag-image" src="<?= $file->url() ?>">
            </div>
        </div>
    <?php endforeach ?>
</section>

<?= snippet('foot') ?>