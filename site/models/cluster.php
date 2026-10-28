<?php

use Kirby\Cms\Page;

class ClusterPage extends Page
{
    /**
     * Small thumbnails of the cluster's images, in order, for the
     * Images column of the clusters table on Home in the panel.
     */
    public function panelThumbs(): string
    {
        $html = '';
        foreach ($this->images()->sorted() as $file) {
            $thumb = $file->thumb(['width' => 96, 'height' => 72, 'crop' => true]);
            $html .= '<img src="' . esc($thumb->url()) . '" alt="">';
        }
        return '<span class="cluster-thumbs">' . $html . '</span>';
    }
}
