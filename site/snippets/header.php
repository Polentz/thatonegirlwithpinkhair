<?php

$filters = [];
$clustersPage = $page;
$shownClusters = $page->children()->listed()->template('cluster')
    ->filter(fn($c) => $c->gallery()->isNotEmpty());

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
    <h1><a href="<?= $site->url() ?>"><?= $site->title() ?></a></h1>
    <nav class="nav">
        <?php if ($site->infoText()->isNotEmpty() && $site->infoLabel()->isNotEmpty()): ?>
            <button class="nav-label slider-toggle" type="button" aria-controls="info-slider"
                aria-expanded="false"><?= $site->infoLabel() ?></button>
        <?php endif ?>
        <?php if ($site->contactText()->isNotEmpty() && $site->contactLabel()->isNotEmpty()): ?>
            <button class="nav-label slider-toggle" type="button" aria-controls="contact-slider" aria-expanded="false">
                <?= $site->contactLabel() ?></button>
        <?php endif ?>
        <?php if (!empty($filters) && $site->filtersLabel()->isNotEmpty()): ?>
            <div class="nav-filters">
                <button class="nav-label filters-toggle" type="button" aria-controls="filters-list"
                    aria-expanded="false"><?= $site->filtersLabel() ?><span class="filters-count" hidden>*</span></button>
                <ul class="filters-list" id="filters-list" hidden>
                    <?php foreach ($filters as $key => $name): ?>
                        <li class="filter-option-wrapper">
                            <button class="filter-option" type="button" data-filter="<?= esc($key, 'attr') ?>">
                                <?= esc($name) ?>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <line x1="4" y1="4" x2="20" y2="20" />
                                    <line x1="20" y1="4" x2="4" y2="20" />
                                </svg>
                            </button>
                        </li>
                    <?php endforeach ?>
                </ul>
            </div>
        <?php endif ?>
    </nav>
</header>