/* =====================================================================
   lib/catalog.js — turn database rows into the shape the website uses
   (so the frontend gets { art: { shape, color, label }, in_stock: true } etc.)
   ===================================================================== */

const parseList = (s) => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

export function toProduct(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    weight: r.weight,
    description: r.description,
    mrp: r.mrp,
    price: r.price,
    in_stock: !!r.in_stock,
    featured: !!r.featured,
    deal: !!r.deal,
    fbt: parseList(r.fbt),
    image_url: r.image_url,
    art: { shape: r.art_shape, color: r.art_color, label: r.art_label },
    sort: r.sort,
  };
}

export function toCombo(r) {
  return {
    id: r.id,
    name: r.name,
    items: parseList(r.items),
    mrp: r.mrp,
    price: r.price,
    in_stock: !!r.in_stock,
    image_url: r.image_url,
    art: { shape: r.art_shape, color: r.art_color, label: r.art_label },
  };
}

export function toBanner(r) {
  return {
    id: r.id, kind: r.kind, title: r.title, subtitle: r.subtitle, button: r.button,
    link: r.link, color: r.color, image_url: r.image_url, products: parseList(r.products),
  };
}

export function toCategory(r) {
  return { id: r.id, name: r.name, name_hi: r.name_hi, image_url: r.image_url, icon_product: r.icon_product, sort: r.sort };
}
