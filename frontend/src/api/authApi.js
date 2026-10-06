const API_BASE =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// LOGIN
// ============================================================

export async function loginUser(
  email,
  password
) {

  const response =
    await fetch(
      `${API_BASE}/auth/login`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            email,
            password,
          }),
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.message ||
      'Login failed'
    );

  }


  return data;
}


// ============================================================
// CURRENT USER
// ============================================================

export async function getCurrentUser(
  token
) {

  const response =
    await fetch(
      `${API_BASE}/auth/me`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.message ||
      'Failed to fetch current user'
    );

  }


  return data;
}