<?php

$filters = [];
$clustersPage = $page;
$shownClusters = $page->children()->listed()->template('cluster')
    ->filter(fn($c) => $c->images()->isNotEmpty());

if ($clustersPage) {
    $used = [];
    foreach ($shownClusters as $cluster) {
        $used = array_merge($used, $cluster->filters()->split());
    }
    // key => name, keeping only filters some shown cluster uses
    $filters = array_intersect_key($clustersPage->filterOptions(), array_flip($used));
}
?>

<header class="header">
    <h1><?= $site->title() ?></h1>
    <nav class="nav">
        <?php if ($site->infoText()->isNotEmpty() && $site->infoLabel()->isNotEmpty()): ?>
            <a class="nav-label slider-toggle" href="#info-slider" aria-controls="info-slider"
                aria-expanded="false"><?= $site->infoLabel() ?></a>
        <?php endif ?>
        <?php if ($site->contactText()->isNotEmpty() && $site->contactLabel()->isNotEmpty()): ?>
            <a class="nav-label slider-toggle" href="#contact-slider" aria-controls="contact-slider" aria-expanded="false">
                <?= $site->contactLabel() ?></a>
        <?php endif ?>
        <?php if (!empty($filters) && $site->filtersLabel()->isNotEmpty()): ?>
            <div class="nav-filters">
                <a class="nav-label filters-toggle" href="#filters-list" aria-controls="filters-list"
                    aria-expanded="false"><?= $site->filtersLabel() ?><span class="filters-count" hidden>*</span></a>
                <ul class="filters-list" id="filters-list" hidden>
                    <?php foreach ($filters as $key => $name): ?>
                        <li><button class="filter-option" type="button" data-filter="<?= esc($key, 'attr') ?>">
                                <?= esc($name) ?>
                            </button></li>
                    <?php endforeach ?>
                </ul>
            </div>
        <?php endif ?>
    </nav>
</header>