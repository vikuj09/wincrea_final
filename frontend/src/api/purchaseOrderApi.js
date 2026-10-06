const API_URL = (import.meta.env.VITE_API_URL || '/api');


// Get all purchase orders
export async function getPurchaseOrders() {
  const response = await fetch(
    `${API_URL}/purchase-orders`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to fetch purchase orders'
    );
  }

  return data;
}


// Get one purchase order
export async function getPurchaseOrderById(id) {
  const response = await fetch(
    `${API_URL}/purchase-orders/${id}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to fetch purchase order'
    );
  }

  return data;
}


// Create purchase order
export async function createPurchaseOrder(po) {
  const response = await fetch(
    `${API_URL}/purchase-orders`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(po),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to create purchase order'
    );
  }

  return data;
}


// Update PO status
export async function updatePurchaseOrderStatus(
  id,
  status
) {
  const response = await fetch(
    `${API_URL}/purchase-orders/${id}/status`,
    {
      method: 'PUT',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        status,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to update purchase order status'
    );
  }

  return data;
}


// Receive purchase order
export async function receivePurchaseOrder(
  id,
  data
) {
  const response = await fetch(
    `${API_URL}/purchase-orders/${id}/receive`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
      'Failed to receive purchase order'
    );
  }

  return result;
}