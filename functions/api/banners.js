/* GET /api/banners — homepage banners: { hero: [...], promo: [...] } */
import { json } from '../_lib/http.js';
import { toBanner } from '../_lib/catalog.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT * FROM banners WHERE active = 1 ORDER BY kind, sort, id').all();
  const banners = results.map(toBanner);
  return json({
    hero: banners.filter((b) => b.kind === 'hero'),
    promo: banners.filter((b) => b.kind === 'promo'),
  }, { cache: 60 });
}
