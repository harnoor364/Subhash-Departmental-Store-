/* =====================================================================
   GET /api/products/<id> — one product + "frequently bought together"
   + similar products from the same category
   ===================================================================== */

import { json, HttpError } from '../../_lib/http.js';
import { itemId } from '../../_lib/validate.js';
import { toProduct } from '../../_lib/catalog.js';

export async function onRequestGet({ params, env }) {
  const id = itemId(params.id);
  const row = id && await env.DB.prepare('SELECT * FROM products WHERE id = ? AND active = 1').bind(id).first();
  if (!row) throw new HttpError(404, 'Product not found.');
  const product = toProduct(row);

  let fbt = [];
  const fbtIds = product.fbt.map(itemId).filter(Boolean).slice(0, 10);
  if (fbtIds.length) {
    const { results } = await env.DB
      .prepare(`SELECT * FROM products WHERE active = 1 AND id IN (${fbtIds.map(() => '?').join(',')})`)
      .bind(...fbtIds).all();
    fbt = results.map(toProduct);
  }

  const { results: sim } = await env.DB
    .prepare('SELECT * FROM products WHERE active = 1 AND category = ? AND id != ? ORDER BY sort LIMIT 12')
    .bind(product.category, product.id).all();
  const similar = sim.map(toProduct).filter((x) => !fbtIds.includes(x.id));

  return json({ product, fbt, similar }, { cache: 60 });
}
