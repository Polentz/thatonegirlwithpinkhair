<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're logged in as that one girl with pink hair</title>
    <meta name="description" content="<?= $site->description() ?>">
    <link rel="canonical" href="<?= $page->url() ?>">
    <meta name="keywords" content="<?= $site->keywords() ?>">
    <meta property="og:locale" content="en">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= $site->title() ?>">
    <meta property="og:description" content="<?= $site->description() ?>">
    <meta property="og:url" content="<?= $page->url() ?>">
    <meta property="og:site_name" content="<?= $site->title() ?>">
    <?php if ($ogImage = $site->ogImage()->toFile()): ?>
        <meta property="og:image" content="<?= $ogImage->url() ?>">
    <?php endif ?>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <?php if ($favicon = $site->favicon()->toFile()): ?>
        <link href="<?= $favicon->url() ?>" rel="shortcut icon" type="image/x-icon">
        <link href="<?= $favicon->url() ?>" rel="apple-touch-icon">
    <?php endif ?>
    <?= css([
        'assets/css/variables.css',
        'assets/css/base.css',
        'assets/css/style.css',
        '@auto',
    ]) ?>
    <noscript>Please turn on JS to navigate this website</noscript>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js" defer></script>
    <?= js([
        'assets/js/script.js',
        'assets/js/animation.js',
        '@auto',
    ]) ?>
</head>

<body>