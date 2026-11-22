// Preserve the transaction ID/date/party while exposing each roll movement.
export function transactionItems(transactions = []) {
  return transactions.flatMap(transaction =>
    (transaction.items || []).map(item => ({ ...transaction, ...item }))
  );
}
