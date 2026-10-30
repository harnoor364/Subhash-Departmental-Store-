/* =====================================================================
   pages/home.js — fills in every section of the homepage
   Each section has its own small function, in the same order as the page.
   ===================================================================== */

(async function homePage() {
  const $ = (sel) => document.querySelector(sel);

  // ---- 1. Sections that DON'T need the database: always shown,
  //         even if the server or database is down
  renderGallery();
  renderWhyUs();

  // ---- 2. Ask the server for everything AT THE SAME TIME (faster than one after another)
  // Used only if the settings can't be loaded from the server
  const FALLBACK_SETTINGS = { store_open: true, open_time: '', close_time: '22:00', phone: '',
    walkthrough_type: 'video', google_review_link: '' };
  const safe = (promise) => promise.catch((err) => { console.error('Homepage data failed:', err); return null; });
  const settingsReq = UI.getSettings().catch((err) => { console.error(err); return FALLBACK_SETTINGS; });
  const dataReq = Promise.all([safe(API.categories()), safe(API.products()), safe(API.combos()), safe(API.banners())]);

  const settings = await settingsReq;
  renderReviews(settings);
  renderVisitUs(settings);

  // ---- 3. Sections that come from the database
  const [categories, products, combos, banners] = await dataReq;
  const byId = Object.fromEntries((products || []).map((p) => [p.id, p]));

  // Hero: banners from the database. (If they can't load, the welcome slide
  // already written in index.html simply stays.)
  if (banners && banners.hero.length) renderHero(banners.hero, byId);
  renderWalkthrough(settings, categories || []);

  if (!products || !categories) {
    ['#deals', '#categories', '#featured', '#combos', '#fresh'].forEach((id) => { $(id).hidden = true; });
    $('[data-promos]').closest('section').hidden = true;
    UI.toast('Products could not load right now. Please try again in a moment.', 'danger');
    return;
  }
  renderDeals(products.filter((p) => p.deal));
  renderCategoryTiles(categories, byId);
  $('[data-featured]').innerHTML = products.filter((p) => p.featured).slice(0, 10).map(UI.productCard).join('');
  if (banners) renderPromos(banners.promo, byId);
  if (combos) $('[data-combos]').innerHTML = combos.map(UI.comboCard).join('');
  else $('#combos').hidden = true;
  $('[data-fresh]').innerHTML = products.filter((p) => p.category === 'fruits-vegetables').map(UI.productCard).join('');


  // ---------------------------------------------------------- 4. Hero
  function renderHero(slides, byId) {
    $('[data-hero-dots]').innerHTML = slides.map((_, i) =>
      `<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${i}" ${i === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Offer ${i + 1}"></button>`).join('');
    $('[data-hero-slides]').innerHTML = slides.map((b, i) => {
      // Background: a real photo (darkened so text stays readable) or the banner colour
      const bg = b.image_url
        ? `linear-gradient(100deg, rgba(27,33,64,.92) 25%, rgba(27,33,64,.45)), url('${esc(b.image_url)}') center / cover`
        : `linear-gradient(120deg, ${esc(b.color)}, ${Art.shade(b.color, -0.25)})`;
      // Right side: a framed photo, or up to 3 product illustrations
      const side = b.side_image_url
        ? `<img class="hero-photo" src="${esc(b.side_image_url)}" alt="${esc(b.title)}" ${i === 0 ? '' : 'loading="lazy"'}>`
        : (b.products || []).map((id) => byId[id] ? `<div>${Art.productImage(byId[id])}</div>` : '').join('');
      return `
      <div class="carousel-item${i === 0 ? ' active' : ''}">
        <div class="hero-slide${b.image_url ? ' has-photo' : ''}" style="background:${bg}">
          <div>
            <h2>${esc(b.title)}</h2>
            <p>${esc(b.subtitle)}</p>
            <a href="${esc(b.link)}" class="btn">${esc(b.button)} <i class="bi bi-arrow-right"></i></a>
          </div>
          <div class="hero-art">${side}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ---------------------------------------------------- 5. Walkthrough
  // settings.walkthrough_type: 'video' | 'youtube' | '360' | 'none'
  // If the chosen type has no media yet, a "coming soon" placeholder shows.
  function renderWalkthrough(s, categories) {
    const section = $('#walkthrough');
    const box = $('[data-walk-media]');
    const type = s.walkthrough_type;
    if (type === 'none') { section.hidden = true; return; }

    // "Shop this aisle" buttons jump to the matching category
    $('[data-aisles]').innerHTML = !categories.length ? '' : '<span class="small text-muted align-self-center me-1">Shop this aisle:</span>' +
      categories.map((c) => `<a href="/category?c=${c.id}">${esc(c.name)}</a>`).join('');

    const ytId = /^[\w-]{11}$/.test(s.walkthrough_youtube_id || '') ? s.walkthrough_youtube_id : '';
    const hasMedia = (type === 'video' && s.walkthrough_video_url) || (type === 'youtube' && ytId) || (type === '360' && s.walkthrough_360_url);

    if (!hasMedia) {
      box.innerHTML = `<div class="walk-soon" style="background-image:linear-gradient(rgba(27,33,64,.45),rgba(27,33,64,.8)),url('${esc(CONFIG.insidePhoto)}')"><div><i class="bi bi-camera-video"></i>
        <h3>Virtual store tour coming soon</h3><p>Meanwhile, shop every aisle online below.</p></div></div>`;
      return;
    }

    // Only load the heavy media when the section scrolls near the screen
    const load = () => {
      if (type === 'video') {
        box.innerHTML = `<video controls preload="none" playsinline
            poster="${esc(s.walkthrough_poster_url || CONFIG.insidePhoto)}"
            src="${esc(s.walkthrough_video_url)}"></video>
          <button class="walk-play" type="button" aria-label="Play store tour"><i class="bi bi-play-fill"></i></button>`;
        const video = box.querySelector('video');
        const play = box.querySelector('.walk-play');
        play.onclick = () => { video.play(); play.remove(); };
        video.addEventListener('play', () => play.remove());
      } else if (type === 'youtube') {
        box.innerHTML = `<img src="https://i.ytimg.com/vi/${ytId}/hqdefault.jpg" alt="Store tour video" style="width:100%;height:100%;object-fit:cover">
          <button class="walk-play" type="button" aria-label="Play store tour"><i class="bi bi-play-fill"></i></button>`;
        box.querySelector('.walk-play').onclick = () => {
          box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0"
            title="Store tour" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
        };
      } else if (type === '360') {
        load360(box, s);
      }
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { io.disconnect(); load(); }
      }, { rootMargin: '200px' });
      io.observe(box);
    } else {
      load();
    }
  }

  /** 360° panorama using Pannellum (loaded from CDN only when needed). */
  function load360(box, s) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    js.onload = () => {
      box.innerHTML = '<div class="pano" id="pano"></div>';
      window.pannellum.viewer('pano', {
        type: 'equirectangular',
        panorama: s.walkthrough_360_url,
        autoLoad: true,
        // Each hotspot: { pitch, yaw, text, category } -> clicking opens that category
        hotSpots: (s.walkthrough_hotspots || []).map((h) => ({
          pitch: Number(h.pitch), yaw: Number(h.yaw), type: 'info',
          text: h.text, URL: '/category?c=' + encodeURIComponent(h.category),
        })),
      });
    };
    document.body.appendChild(js);
  }

  // ------------------------------------------------- Photos from our store
  function renderGallery() {
    const photos = CONFIG.gallery || [];
    if (!photos.length) return;
    // With a "link" the photo opens that page (e.g. a category); otherwise the full photo
    $('[data-gallery]').innerHTML = photos.map((p) => `
      <a class="gallery-item" href="${esc(p.link || p.src)}" ${p.link ? '' : 'target="_blank" rel="noopener"'}>
        <img class="fade-in" src="${esc(p.src)}" alt="${esc(p.caption || CONFIG.storeName)}" loading="lazy" decoding="async">
        ${p.caption ? `<span>${esc(p.caption)}${p.link ? ' <i class="bi bi-arrow-right-short"></i>' : ''}</span>` : ''}
      </a>`).join('');
    $('#gallery').hidden = false;
  }

  // ------------------------------------------------------ 6. Deals
  function renderDeals(deals) {
    if (!deals.length) { $('#deals').hidden = true; return; }
    $('[data-deals]').innerHTML = deals.map(UI.productCard).join('');

    // Countdown to midnight (Ludhiana time) — deals refresh daily
    const timer = $('[data-deal-timer]');
    const tick = () => {
      const [h, m] = istTimeHHMM().split(':').map(Number);
      const left = 24 * 3600 - (h * 3600 + m * 60 + new Date().getSeconds());
      const pad = (n) => String(n).padStart(2, '0');
      timer.textContent = `${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------------------------------------------------- 7. Categories
  function renderCategoryTiles(categories, byId) {
    $('[data-cat-tiles]').innerHTML = categories.map((c) => `
      <a class="cat-tile" href="/category?c=${c.id}">
        <div class="cat-tile-img">${c.image_url ? `<img src="${esc(c.image_url)}" alt="" loading="lazy">` : (byId[c.icon_product] ? Art.productImage(byId[c.icon_product]) : '')}</div>
        <b>${esc(c.name)}</b><small lang="hi">${esc(c.name_hi)}</small>
      </a>`).join('');
  }

  // ------------------------------------------------------- 9. Promos
  function renderPromos(promos, byId) {
    $('[data-promos]').innerHTML = promos.map((b) => `
      <a class="promo" href="${esc(b.link)}" style="background:linear-gradient(120deg, ${esc(b.color)}, ${Art.shade(b.color, -0.3)})">
        <div class="flex-grow-1">
          <h3>${esc(b.title)}</h3><p>${esc(b.subtitle)}</p>
          <span class="btn">${esc(b.button)}</span>
        </div>
        <div class="promo-art">${(b.products || []).slice(0, 1).map((id) => byId[id] ? Art.productImage(byId[id]) : '').join('')}</div>
      </a>`).join('');
  }

  // ------------------------------- Scroll arrows (fresh row + photo gallery)
  document.querySelectorAll('[data-scroll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = $(btn.dataset.target || '[data-fresh]');
      row.scrollBy({ left: Number(btn.dataset.scroll) * row.clientWidth * 0.8, behavior: 'smooth' });
    });
  });

  // ------------------------------------------------------ 12. Why us
  function renderWhyUs() {
    $('[data-why]').innerHTML = CONFIG.whyUs.map((w) => `
      <div class="why-card"><i class="bi ${esc(w.icon)}"></i><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('');
  }

  // ----------------------------------------------------- 13. Reviews
  function renderReviews(s) {
    const r = CONFIG.rating;
    $('[data-rating-value]').textContent = r.value;
    $('[data-rating-count]').textContent = r.count;
    const full = Math.round(r.value);
    $('[data-stars]').textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
    $('[data-google-reviews]').href = s.google_review_link || CONFIG.mapsDirectionsUrl;
    $('[data-reviews]').innerHTML = CONFIG.reviews.map((rv) => `
      <figure class="review-card m-0">
        <div class="stars">★★★★★</div>
        <blockquote>“${esc(rv.text)}”</blockquote>
        <figcaption class="who"><span class="avatar">${esc(rv.author.charAt(0))}</span>
          <span>${esc(rv.author)}<br><small class="text-muted fw-normal">via Google</small></span></figcaption>
      </figure>`).join('');
  }

  // ----------------------------------------------------- 14. Visit us
  function renderVisitUs(s) {
    const a = CONFIG.address;
    $('[data-visit]').innerHTML = `
      <dt><i class="bi bi-geo-alt-fill"></i></dt>
      <dd><b>${esc(CONFIG.storeName)}</b><br>${esc(a.line1)}, ${esc(a.line2)},<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</dd>
      <dt><i class="bi bi-pin-map-fill"></i></dt><dd>Plus code: ${esc(a.plusCode)}</dd>
      <dt><i class="bi bi-clock-fill"></i></dt><dd>${esc(hoursText(s))}</dd>
      <dt><i class="bi bi-bag-check-fill"></i></dt><dd>Home delivery &amp; in-store pickup</dd>
      <dt><i class="bi bi-telephone-fill"></i></dt><dd>${s.phone ? `<a href="tel:+91${esc(s.phone)}">${esc(s.phone)}</a>` : '<span class="text-muted">Phone number coming soon</span>'}</dd>`;
    $('[data-directions]').href = CONFIG.mapsDirectionsUrl;

    // Social media icons under the store details
    const social = UI.socialLinks('social-link-lg');
    if (social) {
      $('[data-visit-social-links]').innerHTML = social;
      $('[data-visit-social]').hidden = false;
    }

    // Load the Google Map only when it scrolls into view
    const map = $('[data-map]');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      io.disconnect();
      map.innerHTML = `<iframe src="${esc(CONFIG.mapsEmbedUrl)}" title="Map to ${esc(CONFIG.storeName)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    }, { rootMargin: '300px' });
    io.observe(map);
  }
})();
