/* GET /api/categories — all active categories in display order */
import { route } from '../lib/handler.js';
import { json } from '../lib/http.js';
import { toCategory } from '../lib/catalog.js';

export const GET = route(async ({ db }) => {
  const { results } = await db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort, name').all();
  return json(results.map(toCategory), { cache: 60 });
});
