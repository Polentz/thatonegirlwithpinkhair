<?php

use Kirby\Toolkit\Str;
return [
    'debug' => true,
    'jr' => [
        'static_site_generator' => [
            'endpoint' => 'static', // enables the trigger URL & Panel button
            'output_folder' => './static', // where the static files will be generated
            'base_url' => '/thatonegirlwithpinkhair/', // GitHub Pages project path (https://polentz.github.io/commerce/)
            'preserve' => ['README.md', '.git', '.nojekyll'], // files/folders to keep on regeneration
            'skip_media' => false, // set true if media is already on a CDN
        ]
    ]
];