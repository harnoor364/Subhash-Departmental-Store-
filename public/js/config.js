/* =====================================================================
   config.js — STORE TEXT & FIXED FACTS IN ONE PLACE
   ---------------------------------------------------------------------
   Change the store's name, address, reviews and links here.
   Colours and fonts live in /css/theme.css (CSS variables).

   Things the OWNER changes often (phone, WhatsApp, UPI ID, delivery
   charge, opening time, store open/closed...) are NOT here — they come
   from the "settings" (sample data now, admin panel from Phase 4).

   To reuse this project for another store: edit this file + theme.css.
   ===================================================================== */

const CONFIG = {
  storeName: 'Subhash Departmental Store',
  shortName: 'Subhash',              // first line of the logo text
  tagline: 'Departmental Store',     // second line of the logo text
  logoLetter: 'S',                   // letter inside the rounded-square logo
  city: 'Ludhiana',

  address: {
    line1: 'Backside Hotel Keys, Pakhowal Road',
    line2: 'Sua Rd, Basant City',
    city: 'Ludhiana',
    state: 'Punjab',
    pincode: '142022',
    country: 'IN',
    plusCode: 'VQFX+93 Ludhiana',
  },

  // Photo of the shop front (shown in Visit Us, Contact and behind the store-tour box).
  // To change it, replace public/img/gallery/store-front.jpg or point this to another image.
  storePhoto: '/img/gallery/store-front.jpg',
  storePhotoAlt: 'Subhash Departmental Store shop front, Pakhowal Road, Ludhiana',
  // Photo of the aisles inside (background of the "Walk Inside Our Store" section,
  // and the cover picture of the tour video if no other poster is set).
  insidePhoto: '/img/gallery/store-inside.jpg',

  // "Photos from our store" gallery on the homepage.
  // To add a photo: put the file in public/img/gallery/ and add a line here.
  //   src     = the photo
  //   caption = text on the photo
  //   link    = (optional) where tapping it goes, e.g. a category page.
  //             Without a link, tapping opens the full photo.
  // Empty list = section hidden.
  gallery: [
    { src: '/img/gallery/store-front.jpg', caption: 'Our store on Pakhowal Road' },
    { src: '/img/gallery/store-entrance.jpg', caption: 'Step inside — the front area as you enter' },
    { src: '/img/gallery/store-inside.jpg', caption: 'Wide aisles with everything you need' },
    { src: '/img/gallery/aisle-atta-rice.jpg', caption: 'Atta, rice & dal', link: '/category?c=atta-dal-rice' },
    { src: '/img/gallery/aisle-pantry.jpg', caption: 'Pantry essentials', link: '/category?c=masale' },
    { src: '/img/gallery/aisle-namkeen.jpg', caption: 'Namkeen & snacks', link: '/category?c=snacks-biscuits' },
    { src: '/img/gallery/aisle-treats.jpg', caption: 'Biscuits & treats', link: '/category?c=snacks-biscuits' },
    { src: '/img/gallery/aisle-soaps.jpg', caption: 'Soaps & bath care', link: '/category?c=personal-care' },
    { src: '/img/gallery/aisle-personal-care.jpg', caption: 'Personal care', link: '/category?c=personal-care' },
    { src: '/img/gallery/aisle-cleaning.jpg', caption: 'Cleaning & detergents', link: '/category?c=cleaning' },
    { src: '/img/gallery/aisle-household.jpg', caption: 'Household needs', link: '/category' },
    { src: '/img/gallery/aisle-view.jpg', caption: 'Neatly stocked shelves' },
    { src: '/img/gallery/store-floor.jpg', caption: 'Plenty of room to shop' },
  ],

  // Google Maps links (no API key needed)
  mapsDirectionsUrl:
    'https://www.google.com/maps/search/?api=1&query=Subhash+Departmental+Store+Pakhowal+Road+Ludhiana',
  mapsEmbedUrl:
    'https://www.google.com/maps?q=Subhash+Departmental+Store+Pakhowal+Road+Ludhiana&output=embed',

  // Google rating shown on the site (update when it changes)
  rating: { value: 4.3, count: 39 },

  // Real Google reviews (only add real ones!)
  reviews: [
    { text: 'Very good and reasonable prices and good service of employees', author: 'Anshul Chaddha' },
    { text: 'really very nice store', author: 'BLION Music' },
    { text: 'Best store in the area with great variety prices are fair too', author: 'Google reviewer' },
    { text: 'Very good experience and get all my house need in one place.', author: 'Google reviewer' },
  ],

  // Top strip text (the call button is added automatically)
  topStrip: 'Home delivery & in-store pickup · Pakhowal Road, Ludhiana',

  searchPlaceholder: 'Search for atta, dal, oil...',

  // "Why shop with us" cards (icon names from Bootstrap Icons)
  whyUs: [
    { icon: 'bi-tags', title: 'Reasonable prices', text: 'Fair, everyday prices on all your household needs.' },
    { icon: 'bi-grid-3x3-gap', title: 'Wide variety', text: 'Groceries, dairy, snacks, cleaning, baby care, pooja items and more.' },
    { icon: 'bi-emoji-smile', title: 'Friendly staff', text: 'Helpful people who know the store and the neighbourhood.' },
    { icon: 'bi-basket', title: 'Everything in one place', text: 'Your full monthly list from a single store.' },
  ],

  credit: { text: 'Website by Upward Web', url: '#' }, // put Upward Web's site URL here

  currency: '₹',
  locale: 'en-IN',
  timeZone: 'Asia/Kolkata',
};
