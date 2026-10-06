const API_URL = (import.meta.env.VITE_API_URL || '/api');

export async function getCustomers() {
    const response = await fetch(
        `${API_URL}/customers`
    );

    if (!response.ok) {
        throw new Error(
            'Failed to fetch customers'
        );
    }

    return response.json();
}

export async function createCustomer(customer) {
    const response = await fetch(
        `${API_URL}/customers`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(customer),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to create customer'
        );
    }

    return data;
}

export async function updateCustomer(
    id,
    customer
) {
    const response = await fetch(
        `${API_URL}/customers/${id}`,
        {
            method: 'PUT',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(customer),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to update customer'
        );
    }

    return data;
}

export async function deleteCustomer(id) {
    const response = await fetch(
        `${API_URL}/customers/${id}`,
        {
            method: 'DELETE',
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to delete customer'
        );
    }

    return data;
}