const API_URL = (import.meta.env.VITE_API_URL || '/api');

export async function getRolls() {
    const response = await fetch(
        `${API_URL}/rolls`
    );

    if (!response.ok) {
        throw new Error(
            'Failed to fetch rolls'
        );
    }

    return response.json();
}

export async function getRollsByProduct(productId) {
    const response = await fetch(
        `${API_URL}/rolls/product/${productId}`
    );

    if (!response.ok) {
        throw new Error(
            'Failed to fetch product rolls'
        );
    }

    return response.json();
}

export async function getRollById(rollId) {
    const response = await fetch(
        `${API_URL}/rolls/${rollId}`
    );

    if (!response.ok) {
        throw new Error(
            'Failed to fetch roll'
        );
    }

    return response.json();
}

export async function createRoll(roll) {
    const response = await fetch(
        `${API_URL}/rolls`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(roll),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to create roll'
        );
    }

    return data;
}