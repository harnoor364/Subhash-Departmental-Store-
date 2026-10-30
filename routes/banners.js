/* GET /api/banners — homepage banners: { hero: [...], promo: [...] } */
import { route } from '../lib/handler.js';
import { json } from '../lib/http.js';
import { toBanner } from '../lib/catalog.js';

export const GET = route(async ({ db }) => {
  const { results } = await db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY kind, sort, id').all();
  const banners = results.map(toBanner);
  return json({
    hero: banners.filter((b) => b.kind === 'hero'),
    promo: banners.filter((b) => b.kind === 'promo'),
  }, { cache: 60 });
});
