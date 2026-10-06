const API_BASE =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// GET USERS
// ============================================================

export async function getUsers() {

  const response =
    await fetch(
      `${API_BASE}/users`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to fetch users'
    );
  }

  return data;
}


// ============================================================
// GET USER
// ============================================================

export async function getUser(id) {

  const response =
    await fetch(
      `${API_BASE}/users/${id}`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to fetch user'
    );
  }

  return data;
}


// ============================================================
// CREATE USER
// ============================================================

export async function createUser(user) {

  const response =
    await fetch(
      `${API_BASE}/users`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(user),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to create user'
    );
  }

  return data;
}


// ============================================================
// UPDATE USER
// ============================================================

export async function updateUser(
  id,
  user
) {

  const response =
    await fetch(
      `${API_BASE}/users/${id}`,
      {
        method:
          'PUT',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(user),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to update user'
    );
  }

  return data;
}


// ============================================================
// DELETE USER
// ============================================================

export async function deleteUser(
  id
) {

  const response =
    await fetch(
      `${API_BASE}/users/${id}`,
      {
        method:
          'DELETE',
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Failed to delete user'
    );
  }

  return data;
}