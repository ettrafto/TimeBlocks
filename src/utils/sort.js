export function sortByOrder(items, order) {
  if (!Array.isArray(items)) return [];
  if (!order || order.length === 0) return items;
  const ids = order.map(String);
  const map = new Map(items.map(i => [String(i.id), i]));
  const out = ids.map(id => map.get(id)).filter(Boolean);
  for (const it of items) if (!ids.includes(String(it.id))) out.push(it);
  return out;
}


