/* GET /api/combos — combo kits shown on the homepage */
import { json } from '../_lib/http.js';
import { toCombo } from '../_lib/catalog.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT * FROM combos WHERE active = 1 ORDER BY sort, name').all();
  return json(results.map(toCombo), { cache: 60 });
}
