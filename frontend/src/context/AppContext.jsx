import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { buildSeed } from '../data/seedData';


import {
  getProducts,
  createProduct,
  updateProduct as updateProductApi,
} from '../api/productApi';

import {
  getRolls,
  createRoll as createRollApi,
} from '../api/rollApi';

import {
  getSuppliers,
  createSupplier as createSupplierApi,
  updateSupplier as updateSupplierApi,
  deleteSupplier as deleteSupplierApi,
} from '../api/supplierApi';

import {
  getCustomers,
  createCustomer as createCustomerApi,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
} from '../api/customerApi';

import {
  getTransactions,
  getTransactionById,
} from '../api/transactionApi';

import {
  returnRoll as returnRollApi,
} from '../api/returnApi';

import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
} from '../api/purchaseOrderApi';

import {
  getUsers,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
} from '../api/userApi';

import {
  loginUser,
  getCurrentUser,
} from '../api/authApi';


import {
  createShareLink as createShareLinkApi,
  getMyShareLinks as getMyShareLinksApi,
  disableShareLink as disableShareLinkApi,
} from '../api/shareApi';

import {
  getProformaInvoices,
  getProformaInvoiceById,
  createProformaInvoice as createProformaInvoiceApi,
  confirmProformaInvoice as confirmProformaInvoiceApi,
  cancelProformaInvoice as cancelProformaInvoiceApi,
} from '../api/proformaInvoiceApi';


// ============================================================
// CONSTANTS
// ============================================================

const AppContext = createContext(null);

const STORAGE_KEY =
  'wincrea-loom-erp-v1';

const AUTH_TOKEN_KEY =
  'wincrea-auth-token';

const API_BASE =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// APP PROVIDER
// ============================================================

export function AppProvider({ children }) {

  // ==========================================================
  // MYSQL DATA
  // ==========================================================

  const [products, setProducts] =
    useState([]);

  const [rolls, setRolls] =
    useState([]);

  const [suppliers, setSuppliers] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [transactions, setTransactions] =
    useState([]);

  const [purchaseOrders, setPurchaseOrders] =
    useState([]);

  const [adjustments, setAdjustments] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [proformaInvoices, setProformaInvoices] =
    useState([]);


  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  const [authToken, setAuthToken] =
    useState(
      () =>
        localStorage.getItem(
          AUTH_TOKEN_KEY
        ) || null
    );

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const isAuthenticated =
    Boolean(
      authToken &&
      currentUser
    );


  // ==========================================================
  // LOCAL DATA
  // ==========================================================

  const [ledger, setLedger] =
    useLocalStorage(
      `${STORAGE_KEY}:ledger`,
      null
    );

  const [settings, setSettings] =
    useLocalStorage(
      `${STORAGE_KEY}:settings`,
      {
        companyName:
          'Window Creators',

        brandName:
          'WINCREA',

        lowStockAlerts:
          true,

        deadStockThresholdDays:
          60,
      }
    );


  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const loadProducts =
    useCallback(
      async () => {

        const data =
          await getProducts();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (p) => ({
                  id:
                    p.id,

                  sku:
                    p.sku || '',

                  name:
                    p.name || '',

                  // Preserve category from MySQL
                  category:
                    String(
                      p.category ||
                      'ESSENTIAL'
                    ).toUpperCase(),

                  color:
                    p.color || '',

                  width:
                    Number(
                      p.width_cm || 0
                    ),

                  ratePerMeter:
                    Number(
                      p.rate_per_meter || 0
                    ),

                  reorderLevel:
                    Number(
                      p.reorder_level || 0
                    ),

                  stock:
                    Number(
                      p.stock || 0
                    ),

                  rollCount:
                    Number(
                      p.rolls || 0
                    ),
                })
              )
            : [];

        setProducts(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // ROLLS
  // ==========================================================

  const loadRolls =
    useCallback(
      async () => {

        const data =
          await getRolls();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (r) => ({

                  id:
                    r.id,

                  rollId:
                    r.roll_id,

                  productId:
                    r.product_id,

                  sku:
                    r.sku || '',

                  productName:
                    r.product_name || '',

                  color:
                    r.color || '',

                  originalLength:
                    Number(
                      r.original_length || 0
                    ),

                  remainingLength:
                    Number(
                      r.remaining_length || 0
                    ),

                  length:
                    Number(
                      r.remaining_length || 0
                    ),

                  status:
                    r.status,

                  batch:
                    r.batch || '',

                  rack:
                    r.rack || '',

                  bin:
                    r.bin || '',

                  supplierId:
                    r.supplier_id ||
                    null,

                  inwardDate:
                    r.inward_date ||
                    r.created_at ||
                    null,

                  createdAt:
                    r.created_at ||
                    null,

                  updatedAt:
                    r.updated_at ||
                    null,

                  customerId:
                    r.customer_id ||
                    null,

                  customerName:
                    r.customer_name ||
                    null,

                  outwardQuantity:
                    Number(
                      r.outward_quantity ||
                      0
                    ),

                  dispatchedAt:
                    r.dispatched_at ||
                    null,

                  holdReason:
                    r.hold_reason ||
                    null,
                })
              )
            : [];

        setRolls(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // SUPPLIERS
  // ==========================================================

  const loadSuppliers =
    useCallback(
      async () => {

        const data =
          await getSuppliers();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (s) => ({

                  id:
                    s.id,

                  name:
                    s.name || '',

                  phone:
                    s.phone || '',

                  email:
                    s.email || '',

                  address:
                    s.address || '',

                  gstNumber:
                    s.gst_number || '',

                  createdAt:
                    s.created_at ||
                    null,

                  updatedAt:
                    s.updated_at ||
                    null,
                })
              )
            : [];

        setSuppliers(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // CUSTOMERS
  // ==========================================================

  const loadCustomers =
    useCallback(
      async () => {

        const data =
          await getCustomers();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (c) => ({

                  id:
                    c.id,

                  name:
                    c.name || '',

                  phone:
                    c.phone || '',

                  email:
                    c.email || '',

                  address:
                    c.address || '',

                  gstNumber:
                    c.gst_number ??
                    c.gstNumber ??
                    '',

                  createdAt:
                    c.created_at ??
                    c.createdAt ??
                    null,

                  updatedAt:
                    c.updated_at ??
                    c.updatedAt ??
                    null,
                })
              )
            : [];

        setCustomers(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // TRANSACTIONS
  // ==========================================================

  const loadTransactions =
    useCallback(
      async () => {

        const data =
          await getTransactions();

        const formatted =
          Array.isArray(data)
            ? data
            : [];

        setTransactions(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // PURCHASE ORDERS
  // ==========================================================

  const loadPurchaseOrders =
    useCallback(
      async () => {

        const data =
          await getPurchaseOrders();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (po) => ({

                  id:
                    po.id,

                  poNumber:
                    po.po_number ??
                    po.poNumber ??
                    '',

                  supplierId:
                    po.supplier_id ??
                    po.supplierId ??
                    null,

                  supplierName:
                    po.supplier_name ??
                    po.supplierName ??
                    '',

                  status:
                    po.status || '',

                  expectedDate:
                    po.expected_date ??
                    po.expectedDate ??
                    null,

                  notes:
                    po.notes || '',

                  createdBy:
                    po.created_by ??
                    po.createdBy ??
                    null,

                  createdAt:
                    po.created_at ??
                    po.createdAt ??
                    null,

                  updatedAt:
                    po.updated_at ??
                    po.updatedAt ??
                    null,

                  items:
                    Array.isArray(
                      po.items
                    )
                      ? po.items.map(
                          (item) => ({

                            id:
                              item.id,

                            itemId:
                              item.item_id ??
                              item.itemId ??
                              item.id,

                            productId:
                              item.product_id ??
                              item.productId,

                            productName:
                              item.product_name ??
                              item.productName ??
                              '',

                            sku:
                              item.sku ||
                              '',

                            quantityMeters:
                              Number(
                                item.quantity_meters ??
                                item.quantityMeters ??
                                0
                              ),

                            receivedMeters:
                              Number(
                                item.received_meters ??
                                item.receivedMeters ??
                                0
                              ),

                            ratePerMeter:
                              item.rate_per_meter != null
                                ? Number(
                                    item.rate_per_meter
                                  )
                                : item.ratePerMeter != null
                                ? Number(
                                    item.ratePerMeter
                                  )
                                : null,
                          })
                        )
                      : [],
                })
              )
            : [];

        setPurchaseOrders(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // ADJUSTMENTS
  // ==========================================================

  const loadAdjustments =
    useCallback(
      async () => {

        const response =
          await fetch(
            `${API_BASE}/adjustments`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            'Failed to load adjustments'
          );
        }

        const formatted =
          Array.isArray(data)
            ? data.map(
                (a) => ({

                  id:
                    Number(
                      a.id
                    ),

                  rollId:
                    Number(
                      a.roll_id ??
                      a.rollId ??
                      0
                    ),

                  rollNumber:
                    a.roll_number ??
                    a.rollNumber ??
                    '',

                  productId:
                    Number(
                      a.product_id ??
                      a.productId ??
                      0
                    ),

                  sku:
                    a.sku || '',

                  productName:
                    a.product_name ??
                    a.productName ??
                    '',

                  adjustmentType:
                    a.adjustment_type ??
                    a.adjustmentType ??
                    '',

                  quantity:
                    Number(
                      a.quantity || 0
                    ),

                  previousLength:
                    Number(
                      a.previous_length ??
                      a.previousLength ??
                      0
                    ),

                  newLength:
                    Number(
                      a.new_length ??
                      a.newLength ??
                      0
                    ),

                  reason:
                    a.reason || '',

                  notes:
                    a.notes || '',

                  userId:
                    a.user_id ??
                    a.userId ??
                    null,

                  userName:
                    a.user_name ??
                    a.userName ??
                    '',

                  createdAt:
                    a.created_at ??
                    a.createdAt ??
                    null,
                })
              )
            : [];

        setAdjustments(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // USERS
  // ==========================================================

  const loadUsers =
    useCallback(
      async () => {

        const data =
          await getUsers();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (u) => ({

                  id:
                    Number(
                      u.id
                    ),

                  name:
                    u.name || '',

                  email:
                    u.email || '',

                  role:
                    String(
                      u.role ||
                      'STAFF'
                    ).toUpperCase(),

                  approvalStatus:
                    String(
                      u.approval_status ??
                      u.approvalStatus ??
                      'APPROVED'
                    ).toUpperCase(),

                  emailVerified:
                    u.email_verified === undefined ||
                    u.email_verified === null
                      ? true
                      : Boolean(
                          Number(
                            u.email_verified
                          )
                        ),

                  approvedAt:
                    u.approved_at ??
                    u.approvedAt ??
                    null,

                  approvedBy:
                    u.approved_by ??
                    u.approvedBy ??
                    null,

                  rejectionReason:
                    u.rejection_reason ??
                    u.rejectionReason ??
                    '',

                  isActive:
                    Boolean(
                      Number(
                        u.is_active ??
                        u.isActive ??
                        0
                      )
                    ),

                  createdAt:
                    u.created_at ??
                    u.createdAt ??
                    null,

                  updatedAt:
                    u.updated_at ??
                    u.updatedAt ??
                    null,
                })
              )
            : [];

        setUsers(
          formatted
        );

        return formatted;
      },
      []
    );


  // ==========================================================
  // PROFORMA INVOICES
  // ==========================================================

  const loadProformaInvoices =
    useCallback(
      async () => {

        const data =
          await getProformaInvoices();

        const formatted =
          Array.isArray(data)
            ? data.map(
                (pi) => ({

                  id:
                    Number(
                      pi.id
                    ),

                  piNumber:
                    pi.pi_number ??
                    pi.piNumber ??
                    `PI-${pi.id}`,

                  customerId:
                    Number(
                      pi.customer_id ??
                      pi.customerId ??
                      0
                    ),

                  customerName:
                    pi.customer_name ??
                    pi.customerName ??
                    '',

                  status:
                    pi.status || 'DRAFT',

                  invoiceDate:
                    pi.invoice_date ??
                    pi.invoiceDate ??
                    null,

                  remarks:
                    pi.remarks || '',

                  confirmedAt:
                    pi.confirmed_at ??
                    pi.confirmedAt ??
                    null,

                  confirmedBy:
                    pi.confirmed_by ??
                    pi.confirmedBy ??
                    null,

                  confirmedByName:
                    pi.confirmed_by_name ??
                    pi.confirmedByName ??
                    '',

                  transactionId:
                    pi.transaction_id ??
                    pi.transactionId ??
                    null,

                  createdBy:
                    pi.created_by ??
                    pi.createdBy ??
                    null,

                  createdByName:
                    pi.created_by_name ??
                    pi.createdByName ??
                    '',

                  createdAt:
                    pi.created_at ??
                    pi.createdAt ??
                    null,

                  updatedAt:
                    pi.updated_at ??
                    pi.updatedAt ??
                    null,

                  totalMeters:
                    Number(
                      pi.total_meters ??
                      pi.totalMeters ??
                      0
                    ),

                  subtotal:
                    Number(
                      pi.subtotal ??
                      0
                    ),

                  itemsCount:
                    Number(
                      pi.items_count ??
                      pi.itemsCount ??
                      0
                    ),
                })
              )
            : [];

        setProformaInvoices(
          formatted
        );

        return formatted;
      },
      []
    );


  const loadProformaInvoiceById =
    useCallback(
      async (id) => {

        return await getProformaInvoiceById(
          id
        );
      },
      []
    );


  // ==========================================================
  // SINGLE RECORD LOADERS
  // ==========================================================

  const loadTransactionById =
    useCallback(
      async (id) => {

        return await getTransactionById(
          id
        );
      },
      []
    );


  const loadPurchaseOrderById =
    useCallback(
      async (id) => {

        return await getPurchaseOrderById(
          id
        );
      },
      []
    );


  const loadAdjustmentById =
    useCallback(
      async (id) => {

        const response =
          await fetch(
            `${API_BASE}/adjustments/${id}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            'Failed to load adjustment'
          );
        }

        return data;
      },
      []
    );


  // ==========================================================
  // AUTH SESSION RESTORE
  // ==========================================================

  useEffect(() => {

    async function restoreSession() {

      const token =
        localStorage.getItem(
          AUTH_TOKEN_KEY
        );

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {

        const result =
          await getCurrentUser(
            token
          );

        setAuthToken(
          token
        );

        setCurrentUser(
          result.user
        );

      } catch (error) {

        console.error(
          'Session restore failed:',
          error
        );

        localStorage.removeItem(
          AUTH_TOKEN_KEY
        );

        setAuthToken(
          null
        );

        setCurrentUser(
          null
        );

      } finally {

        setAuthLoading(
          false
        );
      }
    }

    restoreSession();

  }, []);


  // ==========================================================
  // INITIAL MYSQL LOAD
  // ==========================================================

  useEffect(() => {

    async function loadInitialData() {

      try {

        await Promise.all([

          loadProducts(),

          loadRolls(),

          loadSuppliers(),

          loadCustomers(),

          loadTransactions(),

          loadPurchaseOrders(),

          loadAdjustments(),

          loadUsers(),

          loadProformaInvoices(),

        ]);

      } catch (error) {

        console.error(
          'Initial data loading failed:',
          error
        );
      }
    }

    loadInitialData();

  }, [
    loadProducts,
    loadRolls,
    loadSuppliers,
    loadCustomers,
    loadTransactions,
    loadPurchaseOrders,
    loadAdjustments,
    loadUsers,
    loadProformaInvoices,
  ]);


  // ==========================================================
  // LOCAL SEED
  // ==========================================================

  useEffect(() => {

    if (ledger === null) {

      const seed =
        buildSeed();

      setLedger(
        seed.ledger
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ==========================================================
  // AUTH LOGIN
  // ==========================================================

  const login =
    useCallback(
      async (
        email,
        password
      ) => {

        const result =
          await loginUser(
            email,
            password
          );

        localStorage.setItem(
          AUTH_TOKEN_KEY,
          result.token
        );

        setAuthToken(
          result.token
        );

        setCurrentUser(
          result.user
        );

        return result;
      },
      []
    );


  // ==========================================================
  // AUTH LOGOUT
  // ==========================================================

  const logout =
    useCallback(
      () => {

        localStorage.removeItem(
          AUTH_TOKEN_KEY
        );

        setAuthToken(
          null
        );

        setCurrentUser(
          null
        );
      },
      []
    );


  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const addProduct =
    useCallback(
      async (product) => {

        const result =
          await createProduct(
            product
          );

        await loadProducts();

        return result.id;
      },
      [
        loadProducts,
      ]
    );


  const updateProduct =
    useCallback(
      async (
        id,
        product
      ) => {

        await updateProductApi(
          id,
          product
        );

        await loadProducts();
      },
      [
        loadProducts,
      ]
    );


  // ==========================================================
  // INWARD
  // ==========================================================

  const inwardRoll =
    useCallback(
      async ({
        productId,
        length,
        batch,
        rack,
        bin,
        supplierId,
      }) => {

        const rollId =
          `RL-${Date.now()}-${Math.floor(
            Math.random() * 10000
          )}`;

        const result =
          await createRollApi({

            rollId,

            productId:
              Number(
                productId
              ),

            originalLength:
              Number(
                length
              ),

            remainingLength:
              Number(
                length
              ),

            batch:
              batch || null,

            rack:
              rack || null,

            bin:
              bin || null,

            supplierId:
              supplierId
                ? Number(
                    supplierId
                  )
                : null,
          });

        await Promise.all([

          loadRolls(),

          loadProducts(),

          loadTransactions(),

        ]);

        return result.id;
      },
      [
        loadRolls,
        loadProducts,
        loadTransactions,
      ]
    );


  // ==========================================================
  // RETURN
  // ==========================================================

  const returnRoll =
    useCallback(
      async ({
        rollId,
        quantity,
        notes,
        userId,
      }) => {

        const finalUserId =
          userId ||
          currentUser?.id ||
          1;

        const result =
          await returnRollApi({

            userId:
              Number(
                finalUserId
              ),

            rollId:
              Number(
                rollId
              ),

            quantity:
              Number(
                quantity
              ),

            notes:
              notes || null,
          });

        await Promise.all([

          loadRolls(),

          loadProducts(),

          loadTransactions(),

        ]);

        return result;
      },
      [
        currentUser,
        loadRolls,
        loadProducts,
        loadTransactions,
      ]
    );


  // ==========================================================
  // OUTWARD
  // ==========================================================

  const outwardRolls =
    useCallback(
      async ({
        customerId,
        userId,
        note,
        rolls:
          outwardRollList,
      }) => {

        if (!customerId) {

          throw new Error(
            'Customer is required.'
          );
        }

        if (
          !Array.isArray(
            outwardRollList
          ) ||
          outwardRollList.length === 0
        ) {

          throw new Error(
            'Please select at least one roll.'
          );
        }

        const finalUserId =
          userId ||
          currentUser?.id ||
          null;

        const items =
          outwardRollList.map(
            (roll) => {

              const currentRoll =
                (rolls || []).find(
                  (r) =>
                    Number(
                      r.id
                    ) ===
                    Number(
                      roll.id ??
                      roll.rollId ??
                      roll.roll_id
                    )
                );

              if (!currentRoll) {

                throw new Error(
                  `Roll ${
                    roll.rollId ||
                    roll.roll_id ||
                    roll.id
                  } could not be found.`
                );
              }

              if (
                currentRoll.status !==
                  'AVAILABLE' &&
                currentRoll.status !==
                  'Available'
              ) {

                throw new Error(
                  `Roll ${
                    currentRoll.rollId ||
                    currentRoll.id
                  } is not available.`
                );
              }

              const quantity =
                Number(
                  currentRoll.remainingLength ??
                  currentRoll.length ??
                  0
                );

              if (
                !Number.isFinite(
                  quantity
                ) ||
                quantity <= 0
              ) {

                throw new Error(
                  `Roll ${
                    currentRoll.rollId ||
                    currentRoll.id
                  } has no remaining stock.`
                );
              }

              const product =
                (products || []).find(
                  (p) =>
                    Number(
                      p.id
                    ) ===
                    Number(
                      currentRoll.productId
                    )
                );

              return {

                rollId:
                  Number(
                    currentRoll.id
                  ),

                productId:
                  Number(
                    currentRoll.productId
                  ),

                quantity,

                ratePerMeter:
                  Number(
                    product?.ratePerMeter ||
                    0
                  ),
              };
            }
          );

        const response =
          await fetch(
            `${API_BASE}/outward`,
            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json',

                ...(authToken
                  ? {
                      Authorization:
                        `Bearer ${authToken}`,
                    }
                  : {}),
              },

              body:
                JSON.stringify({

                  customerId:
                    Number(
                      customerId
                    ),

                  userId:
                    finalUserId
                      ? Number(
                          finalUserId
                        )
                      : null,

                  createdBy:
                    finalUserId
                      ? Number(
                          finalUserId
                        )
                      : null,

                  invoiceDate:
                    new Date()
                      .toISOString()
                      .slice(
                        0,
                        10
                      ),

                  remarks:
                    note ||
                    null,

                  items,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.message ||
            'Failed to create outward draft.'
          );
        }

        await Promise.all([
          loadProformaInvoices(),
          loadRolls(),
          loadProducts(),
        ]);

        return data;
      },
      [
        rolls,
        products,
        currentUser,
        authToken,
        loadProformaInvoices,
        loadRolls,
        loadProducts,
      ]
    );


  // ==========================================================
  // SUPPLIERS
  // ==========================================================

  const addSupplier =
    useCallback(
      async (
        supplier
      ) => {

        const result =
          await createSupplierApi(
            supplier
          );

        await loadSuppliers();

        return result.id;
      },
      [
        loadSuppliers,
      ]
    );


  const updateSupplier =
    useCallback(
      async (
        id,
        supplier
      ) => {

        await updateSupplierApi(
          id,
          supplier
        );

        await loadSuppliers();
      },
      [
        loadSuppliers,
      ]
    );


  // ==========================================================
  // DELETE SUPPLIER
  // ==========================================================

  const removeSupplier =
    useCallback(
      async (id) => {

        const result =
          await deleteSupplierApi(
            id
          );

        await loadSuppliers();

        return result;
      },
      [
        loadSuppliers,
      ]
    );


  // ==========================================================
  // CUSTOMERS
  // ==========================================================

  const addCustomer =
    useCallback(
      async (
        customer
      ) => {

        const result =
          await createCustomerApi(
            customer
          );

        await loadCustomers();

        return result.id;
      },
      [
        loadCustomers,
      ]
    );


  const updateCustomer =
    useCallback(
      async (
        id,
        customer
      ) => {

        await updateCustomerApi(
          id,
          customer
        );

        await loadCustomers();
      },
      [
        loadCustomers,
      ]
    );


  // ==========================================================
  // DELETE CUSTOMER
  // ==========================================================

  const removeCustomer =
    useCallback(
      async (id) => {

        const result =
          await deleteCustomerApi(
            id
          );

        await loadCustomers();

        return result;
      },
      [
        loadCustomers,
      ]
    );


  // ==========================================================
  // PURCHASE ORDERS
  // ==========================================================

  const addPurchaseOrder =
    useCallback(
      async (
        po
      ) => {

        let items = [];

        if (
          Array.isArray(
            po.items
          ) &&
          po.items.length > 0
        ) {

          items =
            po.items
              .filter(
                (item) =>
                  item.productId &&
                  Number(
                    item.quantityMeters
                  ) > 0
              )
              .map(
                (item) => ({

                  productId:
                    Number(
                      item.productId
                    ),

                  quantityMeters:
                    Number(
                      item.quantityMeters
                    ),

                  ratePerMeter:
                    item.ratePerMeter != null
                      ? Number(
                          item.ratePerMeter
                        )
                      : item.rate != null
                      ? Number(
                          item.rate
                        )
                      : null,
                })
              );
        }

        else if (
          po.productId &&
          Number(
            po.quantityMeters
          ) > 0
        ) {

          items = [

            {

              productId:
                Number(
                  po.productId
                ),

              quantityMeters:
                Number(
                  po.quantityMeters
                ),

              ratePerMeter:
                po.rate != null
                  ? Number(
                      po.rate
                    )
                  : null,
            },
          ];
        }

        if (
          items.length === 0
        ) {

          throw new Error(
            'At least one valid product is required.'
          );
        }

        const result =
          await createPurchaseOrder({

            supplierId:
              Number(
                po.supplierId
              ),

            expectedDate:
              po.expectedDate
                ? String(
                    po.expectedDate
                  ).slice(
                    0,
                    10
                  )
                : null,

            notes:
              po.notes ||
              null,

            createdBy:
              currentUser?.id
                ? Number(
                    currentUser.id
                  )
                : 1,

            items,
          });

        await loadPurchaseOrders();

        return result.id;
      },
      [
        currentUser,
        loadPurchaseOrders,
      ]
    );


  // ==========================================================
  // UPDATE PO STATUS
  // ==========================================================

  const updatePOStatus =
    useCallback(
      async (
        id,
        status
      ) => {

        const statusMap = {

          Draft:
            'DRAFT',

          Approved:
            'APPROVED',

          Ordered:
            'ORDERED',

          'Partially Received':
            'PARTIALLY_RECEIVED',

          Received:
            'RECEIVED',
        };

        const backendStatus =
          statusMap[status] ||
          status;

        const result =
          await updatePurchaseOrderStatus(
            id,
            backendStatus
          );

        await loadPurchaseOrders();

        return result;
      },
      [
        loadPurchaseOrders,
      ]
    );


  // ==========================================================
  // RECEIVE PURCHASE ORDER
  // ==========================================================

  const receivePO =
    useCallback(
      async ({
        poId,
        meters,
        rollBreakdown,
        items,
        notes,
      }) => {

        let receiveItems = [];

        if (
          Array.isArray(items) &&
          items.length > 0
        ) {

          receiveItems =
            items
              .map(
                (item) => ({

                  itemId:
                    Number(
                      item.itemId
                    ),

                  rolls:
                    Array.isArray(
                      item.rolls
                    )
                      ? item.rolls
                          .filter(
                            (roll) =>
                              Number(
                                roll.length
                              ) > 0
                          )
                          .map(
                            (roll) => ({

                              length:
                                Number(
                                  roll.length
                                ),

                              batch:
                                roll.batch ||
                                null,

                              rack:
                                roll.rack ||
                                null,

                              bin:
                                roll.bin ||
                                null,
                            })
                          )
                      : [],
                })
              )
              .filter(
                (item) =>
                  item.itemId &&
                  item.rolls.length > 0
              );
        }

        else if (
          Array.isArray(
            rollBreakdown
          ) &&
          rollBreakdown.length > 0
        ) {

          const po =
            await getPurchaseOrderById(
              poId
            );

          if (
            !po ||
            !Array.isArray(
              po.items
            ) ||
            po.items.length === 0
          ) {

            throw new Error(
              'Purchase order has no items.'
            );
          }

          receiveItems = [

            {

              itemId:
                Number(
                  po.items[0].id
                ),

              rolls:
                rollBreakdown
                  .filter(
                    (roll) =>
                      Number(
                        roll.length
                      ) > 0
                  )
                  .map(
                    (roll) => ({

                      length:
                        Number(
                          roll.length
                        ),

                      batch:
                        roll.batch ||
                        null,

                      rack:
                        roll.rack ||
                        null,

                      bin:
                        roll.bin ||
                        null,
                    })
                  ),
            },
          ];
        }

        if (
          receiveItems.length === 0
        ) {

          throw new Error(
            'At least one valid receiving item is required.'
          );
        }

        const result =
          await receivePurchaseOrder(

            poId,

            {

              userId:
                currentUser?.id
                  ? Number(
                      currentUser.id
                    )
                  : 1,

              notes:
                notes ||
                `Received against PO ${poId}`,

              items:
                receiveItems,
            }
          );

        await Promise.all([

          loadPurchaseOrders(),

          loadRolls(),

          loadProducts(),

          loadTransactions(),

        ]);

        return result;
      },
      [
        currentUser,
        loadPurchaseOrders,
        loadRolls,
        loadProducts,
        loadTransactions,
      ]
    );


  // ==========================================================
  // ADJUSTMENTS
  // ==========================================================

  const createAdjustment =
    useCallback(
      async ({
        rollId,
        adjustmentType,
        quantity,
        reason,
        notes = '',
        userId,
      }) => {

        const finalUserId =
          userId ||
          currentUser?.id ||
          1;

        const response =
          await fetch(
            `${API_BASE}/adjustments`,
            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json',

                ...(authToken
                  ? {
                      Authorization:
                        `Bearer ${authToken}`,
                    }
                  : {}),
              },

              body:
                JSON.stringify({

                  rollId:
                    Number(
                      rollId
                    ),

                  adjustmentType,

                  quantity:
                    Number(
                      quantity
                    ),

                  reason,

                  notes:
                    notes ||
                    null,

                  userId:
                    Number(
                      finalUserId
                    ),
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.message ||
            'Failed to create adjustment.'
          );
        }

        await Promise.all([

          loadAdjustments(),

          loadRolls(),

          loadProducts(),

          loadTransactions(),

        ]);

        return data;
      },
      [
        currentUser,
        authToken,
        loadAdjustments,
        loadRolls,
        loadProducts,
        loadTransactions,
      ]
    );


  // ==========================================================
  // BACKWARD COMPATIBILITY
  // ==========================================================

  const adjustRoll =
    useCallback(
      async (params) => {

        return await createAdjustment(
          params
        );
      },
      [
        createAdjustment,
      ]
    );


  // ==========================================================
  // PROFORMA INVOICE ACTIONS
  // ==========================================================

  const createProformaInvoice =
    useCallback(
      async ({
        customerId,
        invoiceDate,
        remarks,
        createdBy,
        items,
      }) => {

        if (!customerId) {

          throw new Error(
            'Customer is required.'
          );
        }

        if (
          !Array.isArray(items) ||
          items.length === 0
        ) {

          throw new Error(
            'At least one roll is required.'
          );
        }

        const finalCreatedBy =
          createdBy ||
          currentUser?.id ||
          null;

        const result =
          await createProformaInvoiceApi({

            customerId:
              Number(
                customerId
              ),

            invoiceDate:
              invoiceDate ||
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                ),

            remarks:
              remarks ||
              null,

            createdBy:
              finalCreatedBy
                ? Number(
                    finalCreatedBy
                  )
                : null,

            items:
              items.map(
                (item) => ({

                  rollId:
                    Number(
                      item.rollId
                    ),

                  productId:
                    Number(
                      item.productId
                    ),

                  quantity:
                    Number(
                      item.quantity
                    ),

                  ratePerMeter:
                    item.ratePerMeter != null
                      ? Number(
                          item.ratePerMeter
                        )
                      : 0,
                })
              ),
          });

        await loadProformaInvoices();

        return result;
      },
      [
        currentUser,
        loadProformaInvoices,
      ]
    );


  const confirmProformaInvoice =
    useCallback(
      async (id) => {

        const finalUserId =
          currentUser?.id ||
          null;

        const result =
          await confirmProformaInvoiceApi(
            id,
            {
              userId:
                finalUserId
                  ? Number(
                      finalUserId
                    )
                  : null,
            }
          );

        await Promise.all([

          loadProformaInvoices(),

          loadRolls(),

          loadProducts(),

          loadTransactions(),

        ]);

        return result;
      },
      [
        currentUser,
        loadProformaInvoices,
        loadRolls,
        loadProducts,
        loadTransactions,
      ]
    );


  const cancelProformaInvoice =
    useCallback(
      async (id) => {

        const result =
          await cancelProformaInvoiceApi(
            id
          );

        await loadProformaInvoices();

        return result;
      },
      [
        loadProformaInvoices,
      ]
    );


  // ==========================================================
  // USERS
  // ==========================================================

  const addUser =
    useCallback(
      async (
        user
      ) => {

        const result =
          await createUserApi(
            user
          );

        await loadUsers();

        return result;
      },
      [
        loadUsers,
      ]
    );


  const updateUser =
    useCallback(
      async (
        id,
        user
      ) => {

        const result =
          await updateUserApi(
            id,
            user
          );

        await loadUsers();

        return result;
      },
      [
        loadUsers,
      ]
    );


  const removeUser =
    useCallback(
      async (
        id
      ) => {

        const result =
          await deleteUserApi(
            id
          );

        await loadUsers();

        return result;
      },
      [
        loadUsers,
      ]
    );



  // ==========================================================
  // SHARE LINKS
  // ==========================================================

  const createShareLink =
    useCallback(
      async (
        resourceType,
        expiresInDays = null
      ) => {

        const result =
          await createShareLinkApi(
            resourceType,
            expiresInDays
          );

        return result;
      },
      []
    );


  const getMyShareLinks =
    useCallback(
      async () => {

        return await getMyShareLinksApi();

      },
      []
    );


  const disableShareLink =
    useCallback(
      async (
        id
      ) => {

        return await disableShareLinkApi(
          id
        );

      },
      []
    );


  // ==========================================================
  // RESEED
  // ==========================================================

  const reseed =
    useCallback(
      () => {

        const seed =
          buildSeed();

        if (
          seed?.ledger
        ) {
          setLedger(
            seed.ledger
          );
        }
      },
      [
        setLedger,
      ]
    );


  // ==========================================================
  // CLEAR LOCAL DATA
  // ==========================================================

  const clearAll =
    useCallback(
      () => {

        setLedger(
          []
        );
      },
      [
        setLedger,
      ]
    );


  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value =
    useMemo(
      () => ({

        // ------------------------------------------------------
        // DATA
        // ------------------------------------------------------

        products,

        rolls,

        suppliers,

        customers,

        transactions,

        purchaseOrders,

        adjustments,

        users,

        proformaInvoices,

        ledger:
          ledger || [],

        settings,

        setSettings,


        // ------------------------------------------------------
        // AUTH
        // ------------------------------------------------------

        currentUser,

        authToken,

        isAuthenticated,

        authLoading,

        login,

        logout,


        // ------------------------------------------------------
        // LOADERS
        // ------------------------------------------------------

        loadProducts,

        loadRolls,

        loadSuppliers,

        loadCustomers,

        loadTransactions,

        loadPurchaseOrders,

        loadAdjustments,

        loadUsers,

        loadProformaInvoices,

        loadTransactionById,

        loadPurchaseOrderById,

        loadAdjustmentById,

        loadProformaInvoiceById,


        // ------------------------------------------------------
        // PRODUCTS
        // ------------------------------------------------------

        addProduct,

        updateProduct,


        // ------------------------------------------------------
        // STOCK
        // ------------------------------------------------------

        inwardRoll,

        outwardRolls,

        returnRoll,

        adjustRoll,

        createAdjustment,


        // ------------------------------------------------------
        // SUPPLIERS
        // ------------------------------------------------------

        addSupplier,

        updateSupplier,

        removeSupplier,


        // ------------------------------------------------------
        // CUSTOMERS
        // ------------------------------------------------------

        addCustomer,

        updateCustomer,

        removeCustomer,


        // ------------------------------------------------------
        // USERS
        // ------------------------------------------------------

        addUser,

        updateUser,

        removeUser,


        // ------------------------------------------------------
        // PURCHASE ORDERS
        // ------------------------------------------------------

        addPurchaseOrder,

        updatePOStatus,

        receivePO,


        // ------------------------------------------------------
        // PROFORMA INVOICES
        // ------------------------------------------------------

        createProformaInvoice,

        confirmProformaInvoice,

        cancelProformaInvoice,


        // ------------------------------------------------------
        // SHARE LINKS
        // ------------------------------------------------------

        createShareLink,

        getMyShareLinks,

        disableShareLink,


        // ------------------------------------------------------
        // LOCAL
        // ------------------------------------------------------

        reseed,

        clearAll,

      }),
      [
        products,

        rolls,

        suppliers,

        customers,

        transactions,

        purchaseOrders,

        adjustments,

        users,

        proformaInvoices,

        ledger,

        settings,

        setSettings,

        currentUser,

        authToken,

        isAuthenticated,

        authLoading,

        login,

        logout,

        loadProducts,

        loadRolls,

        loadSuppliers,

        loadCustomers,

        loadTransactions,

        loadPurchaseOrders,

        loadAdjustments,

        loadUsers,

        loadProformaInvoices,

        loadTransactionById,

        loadPurchaseOrderById,

        loadAdjustmentById,

        loadProformaInvoiceById,

        addProduct,

        updateProduct,

        inwardRoll,

        outwardRolls,

        returnRoll,

        adjustRoll,

        createAdjustment,

        addSupplier,

        updateSupplier,

        removeSupplier,

        addCustomer,

        updateCustomer,

        removeCustomer,

        addUser,

        updateUser,

        removeUser,

        addPurchaseOrder,

        updatePOStatus,

        receivePO,

        createProformaInvoice,

        confirmProformaInvoice,

        cancelProformaInvoice,

        createShareLink,

        getMyShareLinks,

        disableShareLink,

        reseed,

        clearAll,
      ]
    );


  // ==========================================================
  // PROVIDER
  // ==========================================================

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}


// ============================================================
// USE APP
// ============================================================

export function useApp() {

  const context =
    useContext(
      AppContext
    );

  if (!context) {

    throw new Error(
      'useApp must be used within an AppProvider'
    );
  }

  return context;
}