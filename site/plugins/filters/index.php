<?php

use Kirby\Cms\App as Kirby;
use Kirby\Cms\Page;
use Kirby\Data\Yaml;
use Kirby\Toolkit\Str;

/**
 * Filters with fixed keys.
 *
 * A page's `filterList` is a structure of { name, key }. Clusters save the
 * key, so a filter can be renamed without reassigning it, and a deleted
 * filter simply stops matching. Keys are created here, never by editors.
 */
Kirby::plugin('thatonegirlwithpinkhair/filters', [
    'hooks' => [
        // Give every filter a key, and a fresh one to a duplicated row.
        'page.update:after' => function (Page $newPage) {
            if ($newPage->filterList()->exists() === false) {
                return;
            }

            $rows = $newPage->filterList()->yaml();
            $seen = [];
            $changed = false;

            foreach ($rows as $i => $row) {
                $key = $row['key'] ?? '';
                if ($key === '' || isset($seen[$key])) {
                    do {
                        $key = Str::lower(Str::random(8, 'alphaNum'));
                    } while (isset($seen[$key]));
                    $rows[$i]['key'] = $key;
                    $changed = true;
                }
                $seen[$key] = true;
            }

            if ($changed) {
                $newPage->update(['filterList' => Yaml::encode($rows)]);
            }
        },
    ],
    'pageMethods' => [
        // The filters defined on this page, as key => name, in Panel order.
        'filterOptions' => function (): array {
            $options = [];
            foreach ($this->filterList()->toStructure() as $filter) {
                if ($filter->key()->isNotEmpty() && $filter->name()->isNotEmpty()) {
                    $options[$filter->key()->value()] = $filter->name()->value();
                }
            }
            return $options;
        },
        // A cluster page's filter names, for the clusters table on Home.
        'filterNames' => function (): string {
            $options = $this->parent()?->filterOptions() ?? [];
            $names = array_map(fn($key) => $options[$key] ?? null, $this->filters()->split());
            return implode(', ', array_filter($names));
        },
    ],
]);
