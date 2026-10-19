<header class="header">
    <div class="logo">
        <img src="<?= $site->logo()->toFile()->url() ?>" alt="Logo">
    </div>
    <nav class="nav">
        <?php if ($site->infoText()->isNotEmpty()): ?>
            <a class="nav-label info-toggle" href="#info-slider" aria-controls="info-slider" aria-expanded="false">Info</a>
        <?php endif ?>
        <a class="nav-label" href="/">Contact</a>
    </nav>
</header>