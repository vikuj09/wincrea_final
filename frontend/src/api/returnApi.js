const API_URL = (import.meta.env.VITE_API_URL || '/api');

export async function returnRoll({
  userId = 1,
  rollId,
  quantity,
  notes,
}) {
  const response = await fetch(
    `${API_URL}/return`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        userId: Number(userId),
        rollId: Number(rollId),
        quantity: Number(quantity),
        notes: notes || null,
      }),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Server returned an invalid response.'
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to process return'
    );
  }

  return data;
}