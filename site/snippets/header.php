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
    $filters = array_values(array_intersect($clustersPage->filterList()->split(), $used));
}
?>

<header class="header">
    <h1><?= $site->title() ?></h1>
    <nav class="nav">
        <?php if ($site->infoText()->isNotEmpty()): ?>
            <a class="nav-label slider-toggle" href="#info-slider" aria-controls="info-slider"
                aria-expanded="false">Info</a>
        <?php endif ?>
        <?php if ($site->contactText()->isNotEmpty()): ?>
            <a class="nav-label slider-toggle" href="#contact-slider" aria-controls="contact-slider"
                aria-expanded="false">Follow</a>
        <?php endif ?>
        <?php if (!empty($filters)): ?>
            <div class="nav-filters">
                <a class="nav-label filters-toggle" href="#filters-list" aria-controls="filters-list"
                    aria-expanded="false">Filters<span class="filters-count" hidden>*</span></a>
                <ul class="filters-list" id="filters-list" hidden>
                    <li><button class="filter-option is-active" type="button" data-filter="">All</button></li>
                    <?php foreach ($filters as $filter): ?>
                        <li><button class="filter-option" type="button" data-filter="<?= esc($filter, 'attr') ?>">
                                <?= esc($filter) ?>
                            </button></li>
                    <?php endforeach ?>
                </ul>
            </div>
        <?php endif ?>
    </nav>
</header>