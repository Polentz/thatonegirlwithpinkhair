<?php

use Kirby\Cms\Files;
use Kirby\Cms\Page;

class ClusterPage extends Page
{
    public function gallery(): Files
    {
        return $this->content()->get('gallery')->toFiles();
    }
    public function panelThumbs(): string
    {
        $html = '';
        foreach ($this->gallery() as $file) {
            $thumb = $file->thumb(['width' => 96, 'height' => 72, 'crop' => true]);
            $html .= '<img src="' . esc($thumb->url()) . '" alt="">';
        }
        return '<span class="cluster-thumbs">' . $html . '</span>';
    }
}
