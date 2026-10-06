const API_URL =
    (import.meta.env.VITE_API_URL || '/api');

const getAuthHeaders = () => {

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
};


// ============================================================
// CREATE SHARE LINK
// ============================================================

export async function createShareLink(
    resourceType,
    expiresInDays = null
) {

    const response =
        await fetch(
            `${API_URL}/share`,
            {
                method: 'POST',

                headers:
                    getAuthHeaders(),

                body:
                    JSON.stringify({
                        resourceType,
                        expiresInDays,
                    }),
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            'Failed to create share link.'
        );

    }


    return data;
}


// ============================================================
// GET MY SHARE LINKS
// ============================================================

export async function getMyShareLinks() {

    const response =
        await fetch(
            `${API_URL}/share/mine`,
            {
                headers:
                    getAuthHeaders(),
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            'Failed to load share links.'
        );

    }


    return data;
}


// ============================================================
// DISABLE SHARE LINK
// ============================================================

export async function disableShareLink(
    id
) {

    const response =
        await fetch(
            `${API_URL}/share/${id}`,
            {
                method: 'DELETE',

                headers:
                    getAuthHeaders(),
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            'Failed to disable share link.'
        );

    }


    return data;
}