<header class="header">
    <div class="logo">
        <img src="<?= $site->logo()->toFile()->url() ?>" alt="Logo">
    </div>
    <nav class="nav">
        <?php if ($site->infoText()->isNotEmpty()): ?>
            <a class="nav-label slider-toggle" href="#info-slider" aria-controls="info-slider"
                aria-expanded="false">Info</a>
        <?php endif ?>
        <?php if ($site->contactText()->isNotEmpty()): ?>
            <a class="nav-label slider-toggle" href="#contact-slider" aria-controls="contact-slider"
                aria-expanded="false">Follow</a>
        <?php endif ?>
    </nav>
</header>