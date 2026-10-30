/* =====================================================================
   GET /api/products — product list with optional filters
     ?category=masale     one category
     ?q=dal               search (every word must match name/weight/category)
     ?featured=1          featured only
     ?deal=1              today's deals only
     ?ids=a,b,c           specific products
     ?limit=20            max results (default 500)
   ===================================================================== */

import { json } from '../../_lib/http.js';
import { text, itemId } from '../../_lib/validate.js';
import { toProduct } from '../../_lib/catalog.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;

  let sql = `SELECT p.* FROM products p JOIN categories c ON c.id = p.category
             WHERE p.active = 1 AND c.active = 1`;
  const binds = [];

  const category = itemId(p.get('category'));
  if (category) { sql += ' AND p.category = ?'; binds.push(category); }
  if (p.get('featured') === '1') sql += ' AND p.featured = 1';
  if (p.get('deal') === '1') sql += ' AND p.deal = 1';

  // Search: each word must appear somewhere (so "dal moong" finds "Moong Dal")
  const words = text(p.get('q'), 60).toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);
  for (const w of words) {
    sql += " AND lower(p.name || ' ' || p.weight || ' ' || c.name || ' ' || c.name_hi) LIKE ? ESCAPE '\\'";
    binds.push('%' + w.replace(/[\\%_]/g, '\\$&') + '%');
  }

  const ids = (p.get('ids') || '').split(',').map(itemId).filter(Boolean).slice(0, 100);
  if (ids.length) { sql += ` AND p.id IN (${ids.map(() => '?').join(',')})`; binds.push(...ids); }

  const limit = Math.min(Math.max(parseInt(p.get('limit'), 10) || 500, 1), 500);
  sql += ' ORDER BY p.sort, p.name LIMIT ?';
  binds.push(limit);

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json(results.map(toProduct), { cache: words.length ? 0 : 60 });
}
