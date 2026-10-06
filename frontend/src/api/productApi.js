const API_URL = (import.meta.env.VITE_API_URL || '/api');

export async function getProducts() {
    const response = await fetch(`${API_URL}/products`);

    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    return response.json();
}

export async function createProduct(product) {
    const response = await fetch(`${API_URL}/products`, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(product),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to create product');
    }

    return data;
}

export async function updateProduct(productId, product) {
    const response = await fetch(
        `${API_URL}/products/${productId}`,
        {
            method: 'PUT',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(product),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || 'Failed to update product'
        );
    }

    return data;
}