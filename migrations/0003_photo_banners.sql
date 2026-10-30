-- =====================================================================
-- 0003_photo_banners.sql — banners can show real photos
-- ---------------------------------------------------------------------
-- banners.image_url       = background photo of the slide (optional)
-- banners.side_image_url  = framed photo on the right side (optional)
-- If neither is set, the slide uses its colour + product illustrations.
-- Also adds a first "Welcome" slide with the real store photos.
-- =====================================================================

ALTER TABLE banners ADD COLUMN side_image_url TEXT NOT NULL DEFAULT '';

INSERT INTO banners (kind, title, subtitle, button, link, color, image_url, side_image_url, products, sort)
VALUES ('hero', 'Welcome to Subhash Departmental Store',
        'Your neighbourhood store on Pakhowal Road — now online. Home delivery & in-store pickup.',
        'Start shopping', '/category', '#1B2140',
        '/img/gallery/store-inside.jpg', '/img/gallery/store-front.jpg', '[]', 0);
