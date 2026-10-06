const API_URL = (import.meta.env.VITE_API_URL || '/api');

export async function getTransactions() {
  const response = await fetch(
    `${API_URL}/transactions`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to fetch transactions'
    );
  }

  return data;
}

export async function getTransactionById(id) {
  const response = await fetch(
    `${API_URL}/transactions/${id}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to fetch transaction'
    );
  }

  return data;
}