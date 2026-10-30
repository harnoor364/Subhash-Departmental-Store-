/* GET /api/combos — combo kits shown on the homepage */
import { route } from '../lib/handler.js';
import { json } from '../lib/http.js';
import { toCombo } from '../lib/catalog.js';

export const GET = route(async ({ db }) => {
  const { results } = await db.prepare('SELECT * FROM combos WHERE active = 1 ORDER BY sort, name').all();
  return json(results.map(toCombo), { cache: 60 });
});
