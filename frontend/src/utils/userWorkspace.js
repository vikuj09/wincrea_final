export function workspaceKey(userId, section) {
  return `wincrea:user:${userId}:${section}:v1`;
}

export function readWorkspace(storage, key) {
  const value = JSON.parse(storage.getItem(key) || '[]');
  if (!Array.isArray(value)) throw new Error('Invalid saved data');
  return value;
}

export function repeatRequirements(order) {
  const products = new Map();
  for (const item of order.items || []) {
    const id = Number(item.product_id);
    if (!id || !Number.isFinite(Number(item.quantity))) continue;
    const row = products.get(id) || { productId: id, sku: item.sku || `Product ${id}`, meters: 0, rolls: 0 };
    row.meters += Number(item.quantity);
    row.rolls += 1;
    products.set(id, row);
  }
  return [...products.values()];
}

export function myDrafts(invoices, userId) {
  return invoices.filter(pi => pi.status === 'DRAFT' && userId != null && String(pi.createdBy) === String(userId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
