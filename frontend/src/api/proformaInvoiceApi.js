const API_BASE =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// AUTH HEADERS
// ============================================================

function getAuthHeaders() {
  const token =
    localStorage.getItem(
      'wincrea-auth-token'
    );

  return {
    'Content-Type':
      'application/json',

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}


// ============================================================
// PARSE RESPONSE
// ============================================================

async function parseResponse(
  response
) {
  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      'Request failed'
    );
  }

  return data;
}


// ============================================================
// GET ALL
// ============================================================

export async function getProformaInvoices() {

  const response =
    await fetch(
      `${API_BASE}/proforma-invoices`,
      {
        method:
          'GET',

        headers:
          getAuthHeaders(),
      }
    );

  return parseResponse(
    response
  );
}


// ============================================================
// GET ONE
// ============================================================

export async function getProformaInvoiceById(
  id
) {

  if (!id) {
    throw new Error(
      'Proforma invoice ID is required.'
    );
  }

  const response =
    await fetch(
      `${API_BASE}/proforma-invoices/${id}`,
      {
        method:
          'GET',

        headers:
          getAuthHeaders(),
      }
    );

  return parseResponse(
    response
  );
}


// ============================================================
// CREATE DRAFT
//
// Creates DRAFT PI only.
// NO stock deduction.
// ============================================================

export async function createProformaInvoice(
  payload
) {

  const response =
    await fetch(
      `${API_BASE}/proforma-invoices`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders(),

        body:
          JSON.stringify(
            payload || {}
          ),
      }
    );

  return parseResponse(
    response
  );
}


// ============================================================
// CONFIRM
//
// Confirmation is where stock is deducted.
// Backend creates the OUTWARD transaction.
// ============================================================

export async function confirmProformaInvoice(
  id,
  payload = {}
) {

  if (!id) {
    throw new Error(
      'Proforma invoice ID is required.'
    );
  }

  const response =
    await fetch(
      `${API_BASE}/proforma-invoices/${id}/confirm`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders(),

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  return parseResponse(
    response
  );
}


// ============================================================
// CANCEL
//
// Only DRAFT PI can be cancelled.
// ============================================================

export async function cancelProformaInvoice(
  id
) {

  if (!id) {
    throw new Error(
      'Proforma invoice ID is required.'
    );
  }

  const response =
    await fetch(
      `${API_BASE}/proforma-invoices/${id}/cancel`,
      {
        method:
          'PUT',

        headers:
          getAuthHeaders(),
      }
    );

  return parseResponse(
    response
  );
}