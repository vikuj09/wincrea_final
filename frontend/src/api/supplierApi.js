const API_URL = (import.meta.env.VITE_API_URL || '/api');

export async function getSuppliers() {
    const response = await fetch(
        `${API_URL}/suppliers`
    );

    if (!response.ok) {
        throw new Error(
            'Failed to fetch suppliers'
        );
    }

    return response.json();
}

export async function createSupplier(supplier) {
    const response = await fetch(
        `${API_URL}/suppliers`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(supplier),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to create supplier'
        );
    }

    return data;
}

export async function updateSupplier(
    id,
    supplier
) {
    const response = await fetch(
        `${API_URL}/suppliers/${id}`,
        {
            method: 'PUT',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(supplier),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to update supplier'
        );
    }

    return data;
}

// ============================================================
// DELETE SUPPLIER
// ============================================================

export async function deleteSupplier(
    supplierId
) {
    const response = await fetch(
        `${API_URL}/suppliers/${supplierId}`,
        {
            method: 'DELETE',

            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            'Failed to delete supplier'
        );
    }

    return data;
}