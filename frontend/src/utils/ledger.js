import { transactionItems } from './transactions.js';

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function buildLedgerEntries(transactions = [], adjustments = []) {
  const movements = transactionItems(transactions).map((item, index) => {
    const type = String(item.transaction_type || '').toUpperCase();
    const quantity = number(item.quantity);
    return {
      id: `transaction-${item.id}-${item.item_id ?? index}`,
      transaction_number: item.transaction_number || '—',
      created_at: item.created_at,
      transaction_type: type,
      product_name: item.product_name || '',
      sku: item.sku || '',
      roll_number: item.roll_number || '',
      quantity,
      stock_change: type === 'OUTWARD' ? -quantity : quantity,
      party: type === 'INWARD' ? item.supplier_name || '—' : item.customer_name || '—',
      user_name: item.user_name || '—',
      notes: item.notes || '',
      adjustment_type: null,
      adjustment_reason: '',
      previous_length: null,
      new_length: null,
    };
  });
  const corrections = adjustments.map(item => {
    const type = String(item.adjustmentType ?? item.adjustment_type ?? '').toUpperCase();
    const previous = number(item.previousLength ?? item.previous_length);
    const next = number(item.newLength ?? item.new_length);
    const quantity = type === 'SET' ? next - previous
      : type === 'DECREASE' ? -number(item.quantity) : number(item.quantity);
    return {
      id: `adjustment-${item.id}`,
      transaction_number: `ADJ-${String(item.id).padStart(5, '0')}`,
      created_at: item.createdAt ?? item.created_at,
      transaction_type: 'ADJUSTMENT',
      product_name: item.productName ?? item.product_name ?? '',
      sku: item.sku || '',
      roll_number: item.rollNumber ?? item.roll_number ?? '',
      quantity,
      stock_change: quantity,
      party: '—',
      user_name: item.userName ?? item.user_name ?? '—',
      notes: item.notes || '',
      adjustment_type: type,
      adjustment_reason: item.reason || '',
      previous_length: previous,
      new_length: next,
    };
  });
  return [...movements, ...corrections];
}

// Match the local dates shown by the ledger, including both range endpoints.
export function ledgerDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
