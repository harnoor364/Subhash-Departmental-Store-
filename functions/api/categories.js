/* GET /api/categories — all active categories in display order */
import { json } from '../_lib/http.js';
import { toCategory } from '../_lib/catalog.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort, name').all();
  return json(results.map(toCategory), { cache: 60 });
}
