import React, {
  useMemo,
  useState,
} from 'react';

import {
  Plus,
  Search,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Printer,
  Eye,
  Package,
  ChevronRight,
  Truck,
  MapPin,
  Phone,
  Building2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';

import {
  purchaseRecommendations,
  formatMeters,
  formatCurrency,
} from '../utils/calculations';


// ============================================================
// HELPERS
// ============================================================

function piStatusTone(status) {
  switch (
    String(status || '').toUpperCase()
  ) {
    case 'DRAFT':
      return 'warn';

    case 'CONFIRMED':
      return 'good';

    case 'CANCELLED':
      return 'neutral';

    default:
      return 'neutral';
  }
}


function formatPIStatus(status) {
  switch (
    String(status || '').toUpperCase()
  ) {
    case 'DRAFT':
      return 'Draft';

    case 'CONFIRMED':
      return 'Confirmed';

    case 'CANCELLED':
      return 'Cancelled';

    default:
      return status || '—';
  }
}


function getRollRemaining(roll) {
  return Number(
    roll?.remainingLength ??
    roll?.length ??
    0
  );
}


function getRollNumber(roll) {
  return (
    roll?.rollId ||
    roll?.roll_id ||
    roll?.id ||
    '—'
  );
}


function getProduct(
  roll,
  productMap
) {
  return (
    productMap[
      Number(
        roll?.productId
      )
    ] || null
  );
}


function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}


// ============================================================
// PDF / PRINT
//
// Fixed:
// - Company information
// - Bank details
// - Terms
// - Signature image
//
// Dynamic:
// - PI number
// - Date
// - Customer
// - Products
// - Width
// - Colour
// - Meter
// - INR
// - Total
// - GST
// ============================================================

function printPI(
  pi,
  customer
) {
  if (!pi) {
    return;
  }

  const items =
    Array.isArray(pi.items)
      ? pi.items
      : [];

  const formatMoney = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  const formatNumber = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    );


  // ----------------------------------------------------------
  // DYNAMIC CUSTOMER
  // ----------------------------------------------------------

  const invoiceDate =
    formatDate(
      pi.invoiceDate
    );

  const customerName =
    customer?.name ||
    pi.customerName ||
    '—';

  const customerAddress =
    customer?.address ||
    pi.customerAddress ||
    '';

  const customerPhone =
    customer?.phone ||
    pi.customerPhone ||
    '';

  const customerGST =
    customer?.gstNumber ||
    pi.customerGstNumber ||
    '';


  // ----------------------------------------------------------
  // TOTALS
  // ----------------------------------------------------------

  const totalMeters =
    items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.quantity || 0
        ),
      0
    );

  const subtotal =
    items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        (
          Number(
            item.quantity || 0
          ) *
          Number(
            item.ratePerMeter || 0
          )
        ),
      0
    );

  const gst =
    subtotal * 0.05;

  const grandTotal =
    subtotal + gst;


  // ----------------------------------------------------------
  // POPUP
  // ----------------------------------------------------------

  const popup =
    window.open(
      '',
      '_blank',
      'width=1200,height=1000'
    );

  if (!popup) {
    alert(
      'Please allow pop-ups to generate the PI.'
    );

    return;
  }


  // ----------------------------------------------------------
  // ITEMS
  // ----------------------------------------------------------

  const itemRows =
    items.length > 0
      ? items
          .map(
            (
              item,
              index
            ) => {

              const lineTotal =
                Number(
                  item.quantity || 0
                ) *
                Number(
                  item.ratePerMeter || 0
                );

              return `
                <tr>

                  <td class="item">
                    ${item.productName || item.sku || '—'}
                  </td>

                  <td class="center">
                    ${
                      item.width
                        ? `${item.width} CM`
                        : '—'
                    }
                  </td>

                  <td>
                    ${item.color || '—'}
                  </td>

                  <td class="number">
                    ${formatNumber(
                      item.quantity
                    )}
                  </td>

                  <td class="number">
                    ${formatMoney(
                      item.ratePerMeter
                    )}
                  </td>

                  <td class="number">
                    ${formatMoney(
                      lineTotal
                    )}
                  </td>

                </tr>
              `;
            }
          )
          .join('')
      : `
          <tr>

            <td
              colspan="6"
              class="empty"
            >
              No items
            </td>

          </tr>
        `;


  // ----------------------------------------------------------
  // DOCUMENT
  // ----------------------------------------------------------

  popup.document.open();

  popup.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <meta charset="UTF-8" />

        <title>
          ${pi.piNumber || 'PROFORMA INVOICE'}
        </title>

        <style>

          @page {
            size: A4;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #000000;

            font-size: 11px;
          }

          .page {
            width: 100%;
            max-width: 194mm;
            min-height: 280mm;

            margin: 0 auto;

            border:
              1px solid #000;

            padding:
              8px 10px 12px;
          }


          /* ==================================================
             TITLE
          ================================================== */

          .title {
            text-align: center;

            font-size: 18px;

            font-weight: 700;

            margin-bottom: 10px;

            letter-spacing: 0.5px;
          }


          /* ==================================================
             HEADER
          ================================================== */

          .top-table {
            width: 100%;

            border-collapse:
              collapse;
          }

          .top-table td {
            vertical-align: top;
          }

          .shipper {
            width: 52%;

            padding-right: 15px;
          }

          .invoice-info {
            width: 48%;
          }

          .section-label {
            font-weight: 700;

            margin-bottom: 3px;
          }

          .company-name {
            font-size: 15px;

            font-weight: 700;

            margin-bottom: 3px;
          }

          .company-line {
            line-height: 1.4;
          }

          .invoice-number {
            width: 100%;

            border-collapse:
              collapse;
          }

          .invoice-number td {
            padding:
              2px 4px;

            font-size: 10.5px;
          }

          .invoice-number .value {
            font-weight: 700;
          }


          /* ==================================================
             CUSTOMER
          ================================================== */

          .customer-box {
            margin-top: 7px;

            min-height: 65px;

            border:
              1px solid #000;

            padding: 6px;
          }

          .customer-title {
            font-weight: 700;

            margin-bottom: 4px;
          }

          .customer-name {
            font-size: 12px;

            font-weight: 700;
          }

          .customer-line {
            margin-top: 1px;
          }


          /* ==================================================
             SHIPPING DETAILS
          ================================================== */

          .shipping-table {
            width: 100%;

            margin-top: 8px;

            border-collapse:
              collapse;
          }

          .shipping-table td {
            width: 50%;

            padding:
              2px 0;

            vertical-align: top;
          }


          /* ==================================================
             PRODUCT TITLE
          ================================================== */

          .description-line {
            margin-top: 8px;

            text-align: center;

            font-weight: 700;

            font-size: 11px;
          }


          /* ==================================================
             ITEMS
          ================================================== */

          .items {
            width: 100%;

            border-collapse:
              collapse;

            margin-top: 4px;
          }

          .items th,
          .items td {
            border:
              1px solid #000;

            padding:
              5px 6px;

            font-size: 10px;

            vertical-align: middle;
          }

          .items th {
            text-align: center;

            font-weight: 700;
          }

          .items .item {
            width: 32%;

            text-align: left;
          }

          .items th:nth-child(2),
          .items td:nth-child(2) {
            width: 12%;
          }

          .items th:nth-child(3),
          .items td:nth-child(3) {
            width: 20%;
          }

          .items th:nth-child(4),
          .items td:nth-child(4) {
            width: 11%;
          }

          .items th:nth-child(5),
          .items td:nth-child(5) {
            width: 12%;
          }

          .items th:nth-child(6),
          .items td:nth-child(6) {
            width: 13%;
          }

          .number {
            text-align: right;
          }

          .center {
            text-align: center;
          }

          .empty {
            text-align: center;

            padding: 20px;
          }


          /* ==================================================
             TOTALS
          ================================================== */

          .total-row td {
            font-weight: 700;
          }

          .grand-total-row td {
            font-weight: 700;

            border-top:
              2px solid #000;
          }


          /* ==================================================
             BOTTOM
          ================================================== */

          .bottom-wrapper {
            display: table;

            width: 100%;

            margin-top: 13px;
          }

          .bottom-left,
          .bottom-right {
            display: table-cell;

            vertical-align: top;
          }

          .bottom-left {
            width: 62%;

            padding-right: 15px;
          }

          .bottom-right {
            width: 38%;
          }


          /* ==================================================
             BANK
          ================================================== */

          .bank-details {
            line-height: 1.55;

            font-size: 10px;
          }


          /* ==================================================
             TERMS
          ================================================== */

          .terms {
            margin-top: 10px;

            line-height: 1.6;

            font-size: 9.5px;
          }


          /* ==================================================
             SIGNATURE
          ================================================== */

          .signature-area {
            min-height: 150px;

            display: flex;

            flex-direction: column;

            justify-content: flex-end;

            align-items: flex-end;
          }

          .signature-image {
            width: 175px;

            height: auto;

            object-fit: contain;

            display: block;

            margin-left: auto;
          }


          /* ==================================================
             ACCEPTED
          ================================================== */

          .accepted {
            margin-top: 50px;

            font-size: 10px;
          }


          /* ==================================================
             REMARKS
          ================================================== */

          .remarks {
            border-top:
              1px solid #000;

            margin-top: 8px;

            padding-top: 5px;

            font-size: 10px;
          }


          /* ==================================================
             FOOTER
          ================================================== */

          .footer {
            margin-top: 8px;

            text-align: center;

            color: #555;

            font-size: 8px;
          }


          /* ==================================================
             PRINT
          ================================================== */

          @media print {

            html,
            body {
              width: 210mm;

              min-height: 297mm;
            }

            .page {
              max-width: none;
            }

          }

        </style>

      </head>


      <body>

        <div class="page">


          <!-- =================================================
               TITLE
          ================================================== -->

          <div class="title">
            PROFORMA INVOICE
          </div>


          <!-- =================================================
               COMPANY + INVOICE
          ================================================== -->

          <table class="top-table">

            <tr>

              <td class="shipper">

                <div class="section-label">
                  Shipper/Exporter
                </div>

                <div class="company-name">
                  WINCREA LTD.
                </div>

                <div class="company-line">
                  Plot No. 285, Udyog Kendra 2,
                  Ecotech III,
                </div>

                <div class="company-line">
                  Greater Noida, Tusyana,
                  Uttar Pradesh 201306
                </div>

                <div class="company-line">
                  TEL : +91-9643535019,
                  9810595336
                </div>

              </td>


              <td class="invoice-info">

                <table
                  class="invoice-number"
                >

                  <tr>

                    <td>
                      No. &amp; Date of Invoice
                    </td>

                    <td class="value">

                      ${
                        pi.piNumber ||
                        '—'
                      }

                      &nbsp;&nbsp;

                      ${
                        invoiceDate
                      }

                    </td>

                  </tr>


                  <tr>

                    <td>
                      No. &amp; Date of L/C
                    </td>

                    <td>
                      —
                    </td>

                  </tr>


                  <tr>

                    <td>
                      BUYER
                    </td>

                    <td>
                      ${customerName}
                    </td>

                  </tr>

                </table>

              </td>

            </tr>

          </table>


          <!-- =================================================
               CUSTOMER
          ================================================== -->

          <div class="customer-box">

            <div class="customer-title">
              Consignee
            </div>

            <div class="customer-name">
              ${customerName}
            </div>


            ${
              customerAddress
                ? `
                  <div class="customer-line">
                    ${customerAddress}
                  </div>
                `
                : ''
            }


            ${
              customerPhone
                ? `
                  <div class="customer-line">
                    TEL : ${customerPhone}
                  </div>
                `
                : ''
            }


            ${
              customerGST
                ? `
                  <div class="customer-line">
                    GSTIN : ${customerGST}
                  </div>
                `
                : ''
            }

          </div>


          <!-- =================================================
               SHIPPING
          ================================================== -->

          <table
            class="shipping-table"
          >

            <tr>

              <td>

                <strong>
                  Notify party
                </strong>

                <br />

                SAME AS ABOVE

              </td>


              <td>

                <strong>
                  Remarks
                </strong>

                <br />

                ${
                  pi.remarks ||
                  ''
                }

              </td>

            </tr>


            <tr>

              <td>

                <strong>
                  Port of loading
                </strong>

                <br />

                —

              </td>


              <td>

                <strong>
                  Final destination
                </strong>

                <br />

                —

              </td>

            </tr>


            <tr>

              <td>

                <strong>
                  Carrier
                </strong>

                <br />

                —

              </td>


              <td>

                <strong>
                  Sailing on or about
                </strong>

                <br />

                —

              </td>

            </tr>

          </table>


          <!-- =================================================
               PRODUCT
          ================================================== -->

          <div class="description-line">
            ZEBRA FABRIC
          </div>


          <!-- =================================================
               ITEMS
          ================================================== -->

          <table class="items">

            <thead>

              <tr>

                <th>
                  ITEM
                </th>

                <th>
                  WIDTH
                </th>

                <th>
                  COLOUR
                </th>

                <th>
                  METER
                </th>

                <th>
                  INR
                </th>

                <th>
                  TOTAL
                </th>

              </tr>

            </thead>


            <tbody>

              ${itemRows}


              <!-- TOTAL -->

              <tr class="total-row">

                <td>
                  TOTAL
                </td>

                <td></td>

                <td></td>

                <td class="number">
                  ${
                    formatNumber(
                      totalMeters
                    )
                  }
                </td>

                <td></td>

                <td class="number">
                  ${
                    formatMoney(
                      subtotal
                    )
                  }
                </td>

              </tr>


              <!-- GST -->

              <tr>

                <td></td>

                <td></td>

                <td>
                  GST 5 %
                </td>

                <td></td>

                <td></td>

                <td class="number">
                  ${
                    formatMoney(
                      gst
                    )
                  }
                </td>

              </tr>


              <!-- GRAND TOTAL -->

              <tr
                class="grand-total-row"
              >

                <td>
                  TOTAL
                </td>

                <td></td>

                <td></td>

                <td></td>

                <td></td>

                <td class="number">
                  ${
                    formatMoney(
                      grandTotal
                    )
                  }
                </td>

              </tr>

            </tbody>

          </table>


          <!-- =================================================
               BOTTOM SECTION
          ================================================== -->

          <div class="bottom-wrapper">


            <!-- ===============================================
                 LEFT
            ================================================ -->

            <div class="bottom-left">


              <!-- BANK -->

              <div class="bank-details">

                <strong>
                  BENEFICIARY :
                </strong>

                Wincrea Limited

                <br />

                <strong>
                  BANK :
                </strong>

                HDFC Bank Ltd.

                <br />

                Sector 93A, Noida

                <br />

                <strong>
                  ACCOUNT NO :
                </strong>

                50200071128520

                <br />

                <strong>
                  IFSC Code :
                </strong>

                HDFC0002830

              </div>


              <!-- TERMS -->

              <div class="terms">

                1. PAYMENT : 100% Deposit before Dispatching

                <br />

                2. Prices in INR EX-NOIDA.
                Freight Charges &amp; GST will be EXTRA

                <br />

                3. TOLERANCE : 5% MORE OR LESS
                IN Q'TY AND AMOUNT ARE ACCEPTABLE

              </div>


              ${
                pi.remarks
                  ? `
                    <div class="remarks">

                      <strong>
                        Remarks:
                      </strong>

                      ${pi.remarks}

                    </div>
                  `
                  : ''
              }


              <div class="accepted">
                ACCEPTED BY :
              </div>

            </div>


            <!-- ===============================================
                 RIGHT
            ================================================ -->

            <div class="bottom-right">

              <div class="signature-area">

                <img
                  class="signature-image"
                  src="${
                    window.location.origin
                  }/wincrea-signature.png"
                  alt="Authorised Signature"
                />

              </div>

            </div>

          </div>


          <div class="footer">
            This is a computer generated Proforma Invoice.
          </div>


        </div>


        <!-- ===================================================
             PRINT AFTER LOAD
        ==================================================== -->

        <script>

          function printDocument() {

            setTimeout(
              function () {

                window.focus();

                window.print();

              },
              700
            );

          }


          function waitForImagesAndPrint() {

            const images =
              Array.from(
                document.images
              );


            if (
              images.length === 0
            ) {

              printDocument();

              return;

            }


            let loaded = 0;


            function imageDone() {

              loaded += 1;

              if (
                loaded >=
                images.length
              ) {

                printDocument();

              }

            }


            images.forEach(
              function (image) {

                if (
                  image.complete
                ) {

                  imageDone();

                } else {

                  image.addEventListener(
                    'load',
                    imageDone,
                    {
                      once: true,
                    }
                  );

                  image.addEventListener(
                    'error',
                    imageDone,
                    {
                      once: true,
                    }
                  );

                }

              }
            );

          }


          if (
            document.readyState ===
            'complete'
          ) {

            waitForImagesAndPrint();

          } else {

            window.addEventListener(
              'load',
              waitForImagesAndPrint
            );

          }

        </script>

      </body>

    </html>
  `);

  popup.document.close();
}


// ============================================================
// COMPONENT
// ============================================================

export default function Suppliers() {

  const {
    suppliers,
    addSupplier,
    updateSupplier,
    removeSupplier,

    products,
    rolls,
    customers,

    proformaInvoices,

    createProformaInvoice,
    confirmProformaInvoice,
    cancelProformaInvoice,
    loadProformaInvoiceById,

    currentUser,
  } = useApp();


  // ==========================================================
  // STATE
  // ==========================================================

  const [
    supplierModal,
    setSupplierModal,
  ] = useState(false);

  const [
    piModal,
    setPiModal,
  ] = useState(false);

  const [
    viewPI,
    setViewPI,
  ] = useState(null);

  const [
    supplierForm,
    setSupplierForm,
  ] = useState({
    name: '',
    phone: '',
    city: '',
    gstin: '',
  });

  const [
    supplierQuery,
    setSupplierQuery,
  ] = useState('');

  const [
    selectedSupplier,
    setSelectedSupplier,
  ] = useState(null);

  const [
    editingSupplier,
    setEditingSupplier,
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
  ] = useState('');

  const [
    editSupplierForm,
    setEditSupplierForm,
  ] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
  });

  const [
    piForm,
    setPiForm,
  ] = useState({
    customerId: '',
    remarks: '',
    selectedRolls: [],
  });

  const [
    rollSearch,
    setRollSearch,
  ] = useState('');

  const [
    productFilter,
    setProductFilter,
  ] = useState('All');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');


  // ==========================================================
  // MAPS
  // ==========================================================

  const productMap =
    useMemo(
      () =>
        Object.fromEntries(
          products.map(
            (product) => [
              Number(
                product.id
              ),
              product,
            ]
          )
        ),
      [products]
    );


  const customerMap =
    useMemo(
      () =>
        Object.fromEntries(
          customers.map(
            (customer) => [
              Number(
                customer.id
              ),
              customer,
            ]
          )
        ),
      [customers]
    );


  // ==========================================================
  // FILTERED SUPPLIERS
  // ==========================================================

  const filteredSuppliers =
    useMemo(
      () => {

        const term =
          supplierQuery
            .trim()
            .toLowerCase();

        if (!term) {
          return suppliers;
        }

        return suppliers.filter(
          (supplier) =>
            String(
              supplier.name || ''
            )
              .toLowerCase()
              .includes(term) ||
            String(
              supplier.phone || ''
            )
              .toLowerCase()
              .includes(term) ||
            String(
              supplier.email || ''
            )
              .toLowerCase()
              .includes(term) ||
            String(
              supplier.address || ''
            )
              .toLowerCase()
              .includes(term) ||
            String(
              supplier.gstNumber || ''
            )
              .toLowerCase()
              .includes(term)
        );

      },
      [
        suppliers,
        supplierQuery,
      ]
    );


  // ==========================================================
  // PURCHASE RECOMMENDATIONS
  // ==========================================================

  const recommendations =
    useMemo(
      () =>
        purchaseRecommendations(
          products,
          rolls,
          []
        ),
      [
        products,
        rolls,
      ]
    );


  // ==========================================================
  // AVAILABLE ROLLS
  // ==========================================================

  const availableRolls =
    useMemo(
      () => {

        const term =
          rollSearch
            .trim()
            .toLowerCase();

        return rolls.filter(
          (roll) => {

            if (
              roll.status !==
                'AVAILABLE' &&
              roll.status !==
                'Available'
            ) {
              return false;
            }

            if (
              getRollRemaining(
                roll
              ) <= 0
            ) {
              return false;
            }

            if (
              productFilter !==
                'All' &&
              Number(
                roll.productId
              ) !==
                Number(
                  productFilter
                )
            ) {
              return false;
            }

            if (!term) {
              return true;
            }

            const product =
              getProduct(
                roll,
                productMap
              );

            const rollNumber =
              String(
                getRollNumber(
                  roll
                )
              ).toLowerCase();

            const sku =
              String(
                product?.sku ||
                roll.sku ||
                ''
              ).toLowerCase();

            const name =
              String(
                product?.name ||
                roll.productName ||
                ''
              ).toLowerCase();

            const batch =
              String(
                roll.batch ||
                ''
              ).toLowerCase();

            return (
              rollNumber.includes(
                term
              ) ||
              sku.includes(
                term
              ) ||
              name.includes(
                term
              ) ||
              batch.includes(
                term
              )
            );

          }
        );
      },
      [
        rolls,
        rollSearch,
        productFilter,
        productMap,
      ]
    );


  // ==========================================================
  // SELECTED ROLLS
  // ==========================================================

  const selectedRolls =
    useMemo(
      () =>
        rolls.filter(
          (roll) =>
            piForm.selectedRolls.includes(
              Number(
                roll.id
              )
            )
        ),
      [
        rolls,
        piForm.selectedRolls,
      ]
    );


  const selectedMeters =
    selectedRolls.reduce(
      (
        total,
        roll
      ) =>
        total +
        getRollRemaining(
          roll
        ),
      0
    );


  // ==========================================================
  // SUPPLIER
  // ==========================================================

  function openSupplierModal() {

    setSupplierForm({
      name: '',
      phone: '',
      city: '',
      gstin: '',
    });

    setError('');
    setSuccess('');

    setSupplierModal(
      true
    );
  }


  async function saveSupplier() {

    if (
      !supplierForm.name.trim()
    ) {

      setError(
        'Supplier name is required.'
      );

      return;
    }

    try {

      setSaving(
        true
      );

      setError('');

      await addSupplier({

        name:
          supplierForm.name.trim(),

        phone:
          supplierForm.phone ||
          null,

        email:
          null,

        address:
          supplierForm.city ||
          null,

        gstNumber:
          supplierForm.gstin ||
          null,

      });

      setSupplierModal(
        false
      );

      setSuccess(
        'Supplier added successfully.'
      );

    } catch (err) {

      console.error(
        err
      );

      setError(
        err.message ||
        'Failed to add supplier.'
      );

    } finally {

      setSaving(
        false
      );

    }
  }


  function openEditSupplier(
    supplier,
    event
  ) {

    event?.stopPropagation();

    setSelectedSupplier(null);
    setEditingSupplier(supplier);

    setEditSupplierForm({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
    });

    setError('');
    setSuccess('');
  }


  async function saveEditedSupplier() {

    if (!editingSupplier) {
      return;
    }

    if (!editSupplierForm.name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateSupplier(
        editingSupplier.id,
        {
          name: editSupplierForm.name.trim(),
          phone: editSupplierForm.phone.trim() || null,
          email: editSupplierForm.email.trim() || null,
          address: editSupplierForm.address.trim() || null,
          gstNumber: editSupplierForm.gstNumber.trim() || null,
        }
      );

      setEditingSupplier(null);
      setSuccess('Supplier updated successfully.');

    } catch (err) {
      console.error('Update supplier failed:', err);
      setError(
        err?.message ||
        'Failed to update supplier.'
      );
    } finally {
      setSaving(false);
    }
  }


  // ==========================================================
  // DELETE SUPPLIER
  // ==========================================================

  function openDeleteSupplier(supplier, event) {
    event?.stopPropagation();
    setSelectedSupplier(null);
    setDeleteError('');
    setDeleteTarget(supplier);
  }

  function closeDeleteSupplier() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  }

  async function confirmDeleteSupplier() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setDeleteError('');
      setError('');

      await removeSupplier(deleteTarget.id);

      setDeleteTarget(null);
      setSuccess('Supplier deleted successfully.');
    } catch (err) {
      console.error('Delete supplier failed:', err);
      setDeleteError(
        err?.message || 'Failed to delete supplier.'
      );
    } finally {
      setDeleting(false);
    }
  }


  // ==========================================================
  // NEW PI
  // ==========================================================

  function openPIModal() {

    setPiForm({

      customerId:
        customers[0]?.id ||
        '',

      remarks:
        '',

      selectedRolls:
        [],
    });

    setRollSearch('');
    setProductFilter('All');

    setError('');
    setSuccess('');

    setPiModal(
      true
    );
  }


  function toggleRoll(
    rollId
  ) {

    const id =
      Number(
        rollId
      );

    setPiForm(
      (prev) => {

        const exists =
          prev.selectedRolls.includes(
            id
          );

        return {

          ...prev,

          selectedRolls:
            exists
              ? prev.selectedRolls.filter(
                  (
                    selectedId
                  ) =>
                    selectedId !==
                    id
                )
              : [
                  ...prev.selectedRolls,
                  id,
                ],

        };
      }
    );
  }


  function removeSelectedRoll(
    rollId
  ) {

    const id =
      Number(
        rollId
      );

    setPiForm(
      (prev) => ({
        ...prev,

        selectedRolls:
          prev.selectedRolls.filter(
            (
              selectedId
            ) =>
              selectedId !==
              id
          ),
      })
    );
  }


  // ==========================================================
  // CREATE DRAFT PI
  // ==========================================================

  async function savePI() {

    setError('');
    setSuccess('');

    if (
      !piForm.customerId
    ) {

      setError(
        'Please select a customer.'
      );

      return;
    }

    if (
      piForm.selectedRolls.length ===
      0
    ) {

      setError(
        'Select at least one roll.'
      );

      return;
    }


    const freshRolls =
      rolls.filter(
        (roll) =>
          piForm.selectedRolls.includes(
            Number(
              roll.id
            )
          )
      );


    if (
      freshRolls.length !==
      piForm.selectedRolls.length
    ) {

      setError(
        'One or more selected rolls could not be found.'
      );

      return;
    }


    for (
      const roll of freshRolls
    ) {

      if (
        roll.status !==
          'AVAILABLE' &&
        roll.status !==
          'Available'
      ) {

        setError(
          `Roll ${getRollNumber(
            roll
          )} is no longer available.`
        );

        return;
      }


      if (
        getRollRemaining(
          roll
        ) <= 0
      ) {

        setError(
          `Roll ${getRollNumber(
            roll
          )} has no remaining stock.`
        );

        return;
      }

    }


    try {

      setSaving(
        true
      );

      const result =
        await createProformaInvoice({

          customerId:
            Number(
              piForm.customerId
            ),

          remarks:
            piForm.remarks ||
            null,

          items:
            freshRolls.map(
              (roll) => ({

                rollId:
                  Number(
                    roll.id
                  ),

                productId:
                  Number(
                    roll.productId
                  ),

                // WHOLE ROLL
                quantity:
                  getRollRemaining(
                    roll
                  ),

                ratePerMeter:
                  Number(
                    productMap[
                      Number(
                        roll.productId
                      )
                    ]?.ratePerMeter ||
                    0
                  ),

              })
            ),

        });


      setPiModal(
        false
      );


      setPiForm({

        customerId:
          '',

        remarks:
          '',

        selectedRolls:
          [],

      });


      setSuccess(
        `${
          result?.piNumber ||
          'PI'
        } created as Draft. Stock was not deducted.`
      );

    } catch (err) {

      console.error(
        err
      );

      setError(
        err.message ||
        'Failed to create draft PI.'
      );

    } finally {

      setSaving(
        false
      );

    }
  }


  // ==========================================================
  // CONFIRM
  // ==========================================================

  async function handleConfirmPI(
    pi
  ) {

    const confirmed =
      window.confirm(
        `Confirm ${pi.piNumber}? This will deduct the complete selected rolls from stock and create the outward transaction.`
      );

    if (!confirmed) {
      return;
    }


    try {

      setSaving(
        true
      );

      setError('');
      setSuccess('');


      const result =
        await confirmProformaInvoice(
          pi.id
        );


      setSuccess(
        `${
          result?.piNumber ||
          pi.piNumber
        } confirmed successfully. ${
          formatMeters(
            result?.totalQuantity ||
            0
          )
        } m dispatched.`
      );


      if (
        viewPI &&
        Number(
          viewPI.id
        ) ===
        Number(
          pi.id
        )
      ) {

        const updated =
          await loadProformaInvoiceById(
            pi.id
          );

        setViewPI(
          updated
        );

      }

    } catch (err) {

      console.error(
        err
      );

      setError(
        err.message ||
        'Failed to confirm PI.'
      );

    } finally {

      setSaving(
        false
      );

    }
  }


  // ==========================================================
  // CANCEL
  // ==========================================================

  async function handleCancelPI(
    pi
  ) {

    const confirmed =
      window.confirm(
        `Cancel ${pi.piNumber}?`
      );

    if (!confirmed) {
      return;
    }


    try {

      setSaving(
        true
      );

      setError('');
      setSuccess('');


      await cancelProformaInvoice(
        pi.id
      );


      setSuccess(
        `${pi.piNumber} cancelled.`
      );


      if (
        viewPI &&
        Number(
          viewPI.id
        ) ===
        Number(
          pi.id
        )
      ) {

        const updated =
          await loadProformaInvoiceById(
            pi.id
          );

        setViewPI(
          updated
        );

      }

    } catch (err) {

      console.error(
        err
      );

      setError(
        err.message ||
        'Failed to cancel PI.'
      );

    } finally {

      setSaving(
        false
      );

    }
  }


  // ==========================================================
  // VIEW
  // ==========================================================

  async function handleViewPI(
    pi
  ) {

    try {

      setError('');

      const fullPI =
        await loadProformaInvoiceById(
          pi.id
        );

      setViewPI(
        fullPI
      );

    } catch (err) {

      console.error(
        err
      );

      setError(
        err.message ||
        'Failed to load PI.'
      );
    }
  }


  // ==========================================================
  // PI COLUMNS
  // ==========================================================

  const piColumns = [

    {
      key: 'piNumber',

      header: 'PI #',

      render: (pi) => (

        <div>

          <div className="font-medium">
            {pi.piNumber}
          </div>

          {pi.transactionNumber && (

            <div className="text-[11px] text-ink-700/40">
              {pi.transactionNumber}
            </div>

          )}

        </div>

      ),
    },


    {
      key: 'customer',

      header: 'Customer',

      render: (pi) =>
        pi.customerName ||
        customerMap[
          Number(
            pi.customerId
          )
        ]?.name ||
        '—',
    },


    {
      key: 'date',

      header: 'Date',

      render: (pi) =>
        formatDate(
          pi.invoiceDate
        ),
    },


    {
      key: 'rolls',

      header: 'Rolls',

      render: (pi) => {

        const items =
          Array.isArray(
            pi.items
          )
            ? pi.items
            : [];

        const total =
          items.reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.quantity || 0
              ),
            0
          );

        return (

          <div>

            <div className="font-medium">
              {items.length}
            </div>

            <div className="text-xs text-ink-700/45">
              {formatMeters(
                total
              )}{' '}
              m
            </div>

          </div>

        );
      },
    },


    {
      key: 'amount',

      header: 'Amount',

      render: (pi) => {

        const subtotal =
          (
            pi.items || []
          ).reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.quantity || 0
              ) *
              Number(
                item.ratePerMeter || 0
              ),
            0
          );

        return formatCurrency(
          subtotal * 1.05
        );
      },
    },


    {
      key: 'status',

      header: 'Status',

      render: (pi) => (

        <Badge
          tone={
            piStatusTone(
              pi.status
            )
          }
        >
          {formatPIStatus(
            pi.status
          )}
        </Badge>

      ),
    },


    // --------------------------------------------------------
    // ONLY VIEW + CONFIRM/CANCEL
    // NO PRINT BUTTON HERE
    // --------------------------------------------------------

    {
      key: 'actions',

      header: '',

      render: (pi) => (

        <div className="flex items-center justify-end gap-1">

          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              handleViewPI(
                pi
              )
            }
            title="View PI"
          >
            <Eye
              size={15}
            />
          </button>


          {String(
            pi.status || ''
          ).toUpperCase() ===
            'DRAFT' && (

            <>

              <button
                type="button"
                className="btn-ghost text-signal-good"
                onClick={() =>
                  handleConfirmPI(
                    pi
                  )
                }
                disabled={
                  saving
                }
                title="Confirm PI"
              >
                <CheckCircle2
                  size={15}
                />
              </button>


              <button
                type="button"
                className="btn-ghost text-signal-bad"
                onClick={() =>
                  handleCancelPI(
                    pi
                  )
                }
                disabled={
                  saving
                }
                title="Cancel PI"
              >
                <XCircle
                  size={15}
                />
              </button>

            </>

          )}

        </div>

      ),
    },

  ];


  // ==========================================================
  // SUPPLIER COLUMNS
  // ==========================================================

  const supplierColumns = [

    {
      key: 'name',
      header: 'Supplier',
    },


    {
      key: 'phone',

      header: 'Phone',

      render: (supplier) =>
        supplier.phone ||
        '—',
    },


    {
      key: 'gst',

      header: 'GSTIN',

      render: (supplier) =>
        supplier.gstNumber ||
        '—',
    },


    {
      key: 'address',

      header: 'Address',

      render: (supplier) =>
        supplier.address ||
        '—',
    },

  ];


  // ==========================================================
  // COUNTS
  // ==========================================================

  const draftCount =
    proformaInvoices.filter(
      (pi) =>
        String(
          pi.status || ''
        ).toUpperCase() ===
        'DRAFT'
    ).length;


  const confirmedCount =
    proformaInvoices.filter(
      (pi) =>
        String(
          pi.status || ''
        ).toUpperCase() ===
        'CONFIRMED'
    ).length;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="space-y-8">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <h1 className="font-display text-2xl">
          Suppliers &amp; PI
        </h1>

        <p className="text-sm text-ink-700/60 mt-1">
          Manage suppliers and outward proforma invoices.
          Confirming a PI is what deducts stock.
        </p>

      </div>


      {/* ======================================================
          GLOBAL MESSAGE
      ====================================================== */}

      {(error || success) && (

        <div
          className={`
            rounded-xl
            px-4
            py-3
            text-sm
            ${
              error
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-green-50 text-green-700 border border-green-100'
            }
          `}
        >

          {error || success}

        </div>

      )}


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="card p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/45">
            Total PIs
          </p>

          <p className="font-display text-2xl mt-1">
            {proformaInvoices.length}
          </p>

          <p className="text-xs text-ink-700/45 mt-1">
            Historical outward documents
          </p>

        </div>


        <div className="card p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/45">
            Draft
          </p>

          <p className="font-display text-2xl mt-1 text-signal-warn">
            {draftCount}
          </p>

          <p className="text-xs text-ink-700/45 mt-1">
            Awaiting confirmation
          </p>

        </div>


        <div className="card p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/45">
            Confirmed
          </p>

          <p className="font-display text-2xl mt-1 text-signal-good">
            {confirmedCount}
          </p>

          <p className="text-xs text-ink-700/45 mt-1">
            Completed outward orders
          </p>

        </div>

      </section>


      {/* ======================================================
          PI SECTION
      ====================================================== */}

      <section className="space-y-3">

        <div className="flex items-center justify-between gap-3">

          <div>

            <h2 className="font-display text-lg">
              Proforma Invoices
            </h2>

            <p className="text-xs text-ink-700/50 mt-1">
              Outward orders created from the Outward page appear here.
            </p>

          </div>


          {/* Optional manual draft */}

          <button
            type="button"
            className="btn-secondary"
            onClick={
              openPIModal
            }
            disabled={
              customers.length === 0 ||
              rolls.length === 0
            }
          >

            <Plus
              size={15}
            />

            New Draft PI

          </button>

        </div>


        <div className="card">

          {proformaInvoices.length === 0 ? (

            <div className="p-10 text-center">

              <FileText
                size={32}
                className="mx-auto text-ink-700/20"
              />

              <p className="text-sm text-ink-700/50 mt-3">
                No outward PIs yet.
              </p>

              <p className="text-xs text-ink-700/40 mt-1">
                Use the Outward page to dispatch rolls.
              </p>

            </div>

          ) : (

            <DataTable
              columns={
                piColumns
              }
              rows={
                proformaInvoices
              }
            />

          )}

        </div>

      </section>


      {/* ======================================================
          SUPPLIERS
      ====================================================== */}

      <section className="space-y-4">

        <div
          className="
            relative overflow-hidden rounded-2xl
            border border-ink-900/5 bg-white
            shadow-[0_10px_35px_rgba(15,23,42,0.05)]
            px-6 py-5
          "
        >

          <div
            className="
              absolute -right-10 -top-16 h-48 w-48
              rounded-full bg-loom-100/40 blur-3xl
              pointer-events-none
            "
          />

          <div className="relative flex items-center justify-between gap-4">

            <div className="flex items-start gap-3">

              <div
                className="
                  h-11 w-11 rounded-xl
                  bg-gradient-to-br from-loom-500 to-loom-700
                  text-white flex items-center justify-center
                  shadow-lg shadow-loom-500/20 shrink-0
                "
              >
                <Truck size={19} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl tracking-tight text-ink-900">
                    Suppliers
                  </h2>
                  <span
                    className="
                      inline-flex items-center rounded-full
                      bg-slate-100 border border-slate-200
                      px-2 py-0.5 text-[9px] font-semibold
                      tracking-[0.12em] text-slate-600
                    "
                  >
                    VENDORS
                  </span>
                </div>
                <p className="text-sm text-ink-700/55 mt-1">
                  Manage supplier master data and contact information.
                </p>
              </div>

            </div>

            <button
              type="button"
              className="btn-primary shadow-md shadow-loom-500/10"
              onClick={openSupplierModal}
            >
              <Plus size={15} />
              Add Supplier
            </button>

          </div>

        </div>

        <div className="flex items-center gap-3">
          <SearchInput
            value={supplierQuery}
            onChange={setSupplierQuery}
            placeholder="Search supplier, phone, email, GSTIN or address…"
            className="max-w-md"
          />
          <span className="text-xs text-ink-700/45 ml-auto">
            {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {filteredSuppliers.map((supplier) => (

            <div
              key={supplier.id}
              className="
                group relative overflow-hidden rounded-2xl
                border border-ink-900/5 bg-white
                shadow-[0_7px_24px_rgba(15,23,42,0.045)]
                transition-all duration-200
                hover:-translate-y-0.5 hover:border-loom-200
                hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]
              "
            >

              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-loom-500 via-loom-400 to-transparent" />

              <button
                type="button"
                onClick={() => setSelectedSupplier(supplier)}
                className="w-full text-left p-5 pb-4"
              >

                <div className="flex items-start gap-3">

                  <div
                    className="
                      h-10 w-10 rounded-xl bg-slate-100
                      border border-slate-200 flex items-center
                      justify-center text-slate-500 shrink-0
                    "
                  >
                    <Truck size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold text-ink-900 truncate">
                      {supplier.name}
                    </p>
                    <span
                      className="
                        inline-flex mt-1.5 rounded-full
                        bg-loom-50 border border-loom-100
                        px-2 py-0.5 text-[10px] font-medium text-loom-700
                      "
                    >
                      Supplier
                    </span>
                  </div>

                  <ChevronRight
                    size={17}
                    className="text-ink-700/20 group-hover:text-loom-500 transition-colors mt-1 shrink-0"
                  />

                </div>

                <div className="mt-4 space-y-2">

                  {supplier.address && (
                    <div className="flex items-center gap-2 text-xs text-ink-700/55">
                      <MapPin size={13} className="text-ink-700/35" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-xs text-ink-700/55">
                      <Phone size={13} className="text-ink-700/35" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-ink-700/55">
                      <Building2 size={13} className="text-ink-700/35" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}

                  {!supplier.address && !supplier.phone && !supplier.email && (
                    <div className="text-xs text-ink-700/35">No contact details added</div>
                  )}

                </div>

              </button>

              <div
                className="
                  flex items-center justify-between border-t
                  border-ink-900/5 px-5 py-3 bg-slate-50/50
                "
              >
                <span className="text-[10px] uppercase tracking-[0.1em] text-ink-700/35">
                  Supplier
                </span>

                <div className="flex items-center gap-1">

                  <button
                    type="button"
                    onClick={(event) => openEditSupplier(supplier, event)}
                    className="
                      inline-flex items-center gap-1.5 rounded-lg
                      px-2.5 py-1.5 text-xs font-medium text-loom-600
                      hover:bg-loom-50 hover:text-loom-700 transition-colors
                    "
                  >
                    <Pencil size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={(event) => openDeleteSupplier(supplier, event)}
                    className="
                      inline-flex items-center gap-1.5 rounded-lg
                      px-2.5 py-1.5 text-xs font-medium text-red-500
                      hover:bg-red-50 hover:text-red-600 transition-colors
                    "
                    title="Delete supplier"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>

                </div>
              </div>

            </div>
          ))}

        </div>

        {filteredSuppliers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-900/10 bg-slate-50/50 p-10 text-center">
            <Truck size={28} className="mx-auto text-ink-700/20 mb-3" />
            <p className="font-display text-base text-ink-700/60">
              No suppliers match.
            </p>
            <p className="text-xs text-ink-700/40 mt-1">
              Try a different search term.
            </p>
          </div>
        )}

      </section>


      {/* ======================================================
          SUPPLIER DETAIL MODAL
      ====================================================== */}

      <Modal
        open={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || ''}
        width="max-w-2xl"
      >

        {selectedSupplier && (
          <div className="space-y-5">

            <div className="rounded-2xl border border-ink-900/5 bg-gradient-to-br from-slate-50 via-white to-loom-50/30 p-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-loom-50 border border-loom-100 flex items-center justify-center text-loom-600">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {selectedSupplier.name}
                  </h3>
                  <p className="text-xs text-ink-700/50 mt-1">
                    Supplier master record
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoCard label="Phone" value={selectedSupplier.phone} icon={<Phone size={14} />} />
              <InfoCard label="Email" value={selectedSupplier.email} icon={<Building2 size={14} />} />
              <InfoCard label="GSTIN" value={selectedSupplier.gstNumber} icon={<Building2 size={14} />} />
              <InfoCard label="Address" value={selectedSupplier.address} icon={<MapPin size={14} />} />
            </div>

            <div className="flex justify-between gap-2">

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                onClick={(event) => openDeleteSupplier(selectedSupplier, event)}
              >
                <Trash2 size={15} />
                Delete Supplier
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={(event) => {
                  openEditSupplier(selectedSupplier, event);
                  setSelectedSupplier(null);
                }}
              >
                <Pencil size={15} />
                Edit Supplier
              </button>

            </div>

          </div>
        )}

      </Modal>


      {/* ======================================================
          EDIT SUPPLIER MODAL
      ====================================================== */}

      <Modal
        open={!!editingSupplier}
        onClose={() => !saving && setEditingSupplier(null)}
        title="Edit Supplier"
      >

        <div className="space-y-4">

          <Field label="Supplier Name">
            <input
              className="input"
              value={editSupplierForm.name}
              onChange={(e) =>
                setEditSupplierForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Phone">
            <input
              className="input"
              value={editSupplierForm.phone}
              onChange={(e) =>
                setEditSupplierForm((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              className="input"
              value={editSupplierForm.email}
              onChange={(e) =>
                setEditSupplierForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Address">
            <input
              className="input"
              value={editSupplierForm.address}
              onChange={(e) =>
                setEditSupplierForm((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="GSTIN">
            <input
              className="input"
              value={editSupplierForm.gstNumber}
              onChange={(e) =>
                setEditSupplierForm((prev) => ({
                  ...prev,
                  gstNumber: e.target.value,
                }))
              }
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditingSupplier(null)}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary min-w-[130px] justify-center"
              onClick={saveEditedSupplier}
              disabled={saving || !editSupplierForm.name.trim()}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>

      </Modal>


      {/* ======================================================
          DELETE SUPPLIER MODAL
      ====================================================== */}

      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteSupplier}
        title="Delete Supplier"
      >

        {deleteTarget && (
          <div className="space-y-5">

            <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>

                <div>
                  <h3 className="font-display text-base font-semibold text-ink-900">
                    Delete {deleteTarget.name}?
                  </h3>
                  <p className="text-sm text-ink-700/55 mt-1">
                    This permanently removes the supplier from the supplier master.
                    Historical records are protected by the backend.
                  </p>
                </div>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 flex items-start gap-2">
                <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeDeleteSupplier}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteSupplier}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Delete Supplier'}
              </button>
            </div>

          </div>
        )}

      </Modal>


      {/* ======================================================
          NEW DRAFT PI MODAL
      ====================================================== */}

      {piModal && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">

          <div
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm"
            onClick={() =>
              !saving &&
              setPiModal(false)
            }
          />


          <div className="relative bg-canvas w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-xl shadow-2xl border border-ink-900/10 flex flex-col">


            <div className="px-5 py-4 border-b border-ink-900/10 flex items-center justify-between">

              <div>

                <h2 className="font-display text-lg">
                  New Draft PI
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  Creating the draft does not deduct stock.
                </p>

              </div>


              <button
                className="btn-ghost"
                onClick={() =>
                  setPiModal(false)
                }
                disabled={
                  saving
                }
              >
                Close
              </button>

            </div>


            <div className="p-5 overflow-y-auto">

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">


                {/* ROLLS */}

                <div className="space-y-4">


                  <div className="card p-4">

                    <label className="label">
                      Customer
                    </label>

                    <select
                      className="input mt-1"
                      value={
                        piForm.customerId
                      }
                      onChange={(e) =>
                        setPiForm(
                          (prev) => ({
                            ...prev,
                            customerId:
                              e.target.value,
                          })
                        )
                      }
                    >

                      <option value="">
                        Select customer
                      </option>

                      {customers.map(
                        (customer) => (

                          <option
                            key={
                              customer.id
                            }
                            value={
                              customer.id
                            }
                          >
                            {customer.name}
                          </option>

                        )
                      )}

                    </select>

                  </div>


                  <div className="card p-4">

                    <div className="flex flex-col sm:flex-row gap-3">

                      <select
                        className="input sm:w-44"
                        value={
                          productFilter
                        }
                        onChange={(e) =>
                          setProductFilter(
                            e.target.value
                          )
                        }
                      >

                        <option value="All">
                          All products
                        </option>

                        {products.map(
                          (product) => (

                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {product.sku}
                            </option>

                          )
                        )}

                      </select>


                      <div className="relative flex-1">

                        <Search
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/40 pointer-events-none"
                        />

                        <input
                          className="input w-full"
                          style={{
                            paddingLeft:
                              '48px',
                          }}
                          value={
                            rollSearch
                          }
                          onChange={(e) =>
                            setRollSearch(
                              e.target.value
                            )
                          }
                          placeholder="Search roll, SKU, product, batch..."
                        />

                      </div>

                    </div>

                  </div>


                  <div className="card overflow-hidden">

                    <div className="px-4 py-3 border-b border-ink-900/10 flex items-center justify-between">

                      <div>

                        <h3 className="font-display text-base">
                          Available Rolls
                        </h3>

                        <p className="text-xs text-ink-700/45 mt-0.5">
                          Complete rolls only
                        </p>

                      </div>


                      <div className="text-xs text-ink-700/45">
                        Selected:{' '}

                        <strong>
                          {
                            piForm
                              .selectedRolls
                              .length
                          }
                        </strong>

                      </div>

                    </div>


                    <div className="max-h-[430px] overflow-y-auto divide-y divide-ink-900/5">

                      {availableRolls.length === 0 && (

                        <div className="p-8 text-center">

                          <Package
                            size={28}
                            className="mx-auto text-ink-700/20"
                          />

                          <p className="text-sm text-ink-700/45 mt-2">
                            No available rolls.
                          </p>

                        </div>

                      )}


                      {availableRolls.map(
                        (roll) => {

                          const id =
                            Number(
                              roll.id
                            );

                          const selected =
                            piForm.selectedRolls.includes(
                              id
                            );

                          const product =
                            getProduct(
                              roll,
                              productMap
                            );

                          return (

                            <button
                              key={
                                roll.id
                              }
                              type="button"
                              onClick={() =>
                                toggleRoll(
                                  roll.id
                                )
                              }
                              className={`
                                w-full
                                text-left
                                px-4
                                py-3
                                transition-colors
                                ${
                                  selected
                                    ? 'bg-loom-50'
                                    : 'hover:bg-loom-50/40'
                                }
                              `}
                            >

                              <div className="flex items-center gap-3">

                                <div
                                  className={`
                                    w-5
                                    h-5
                                    rounded
                                    border-2
                                    flex
                                    items-center
                                    justify-center
                                    shrink-0
                                    ${
                                      selected
                                        ? 'border-loom-600 bg-loom-600'
                                        : 'border-ink-900/20'
                                    }
                                  `}
                                >

                                  {selected && (

                                    <CheckCircle2
                                      size={14}
                                      className="text-white"
                                    />

                                  )}

                                </div>


                                <div className="min-w-0 flex-1">

                                  <div className="min-w-0 flex-1">

                                    {/* PRODUCT NAME — MAIN TITLE */}

                                    <div className="flex items-center gap-2">

                                      <span
                                        className="
                                          font-display
                                          text-sm
                                          font-semibold
                                          text-ink-900
                                          truncate
                                        "
                                      >
                                        {product?.name ||
                                          roll.productName ||
                                          '—'}
                                      </span>

                                      {product?.category && (

                                        <span
                                          className="
                                            shrink-0
                                            rounded-full
                                            border
                                            border-loom-100
                                            bg-loom-50
                                            px-2
                                            py-0.5
                                            text-[9px]
                                            font-semibold
                                            uppercase
                                            tracking-wide
                                            text-loom-700
                                          "
                                        >
                                          {product.category}
                                        </span>

                                      )}

                                    </div>


                                    {/* SKU + COLOUR */}

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">

                                      <span className="text-xs font-medium text-ink-700/65">
                                        {product?.sku ||
                                          roll.sku ||
                                          '—'}
                                      </span>

                                      <span className="text-ink-700/20">
                                        ·
                                      </span>

                                      <span className="text-xs text-ink-700/50">
                                        {product?.color ||
                                          roll.color ||
                                          '—'}
                                      </span>

                                      <span className="text-ink-700/20">
                                        ·
                                      </span>

                                      <span className="text-xs text-ink-700/50">
                                        {product?.width ||
                                          roll.width ||
                                          '—'}{' '}
                                        CM
                                      </span>

                                    </div>


                                    {/* ROLL ID — SECONDARY */}

                                    <div className="text-[11px] text-ink-700/40 mt-1">

                                      Roll:{' '}

                                      <span className="font-medium text-ink-700/55">
                                        {getRollNumber(
                                          roll
                                        )}
                                      </span>

                                      {' · '}

                                      Batch:{' '}

                                      <span>
                                        {roll.batch ||
                                          '—'}
                                      </span>

                                    </div>

                                  </div>

                                </div>


                                <div className="text-right shrink-0">

                                  <div className="font-display text-lg">

                                    {formatMeters(
                                      getRollRemaining(
                                        roll
                                      )
                                    )}

                                    {' '}
                                    m

                                  </div>

                                  <div className="text-[11px] text-ink-700/40">
                                    Full roll
                                  </div>

                                </div>

                              </div>

                            </button>

                          );

                        }
                      )}

                    </div>

                  </div>

                </div>


                {/* SUMMARY */}

                <aside className="card p-5 h-fit space-y-5">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/45">
                      Draft Summary
                    </p>

                    <p className="font-display text-2xl mt-1">
                      {
                        piForm
                          .selectedRolls
                          .length
                      }
                      {' '}
                      roll(s)
                    </p>

                    <p className="text-sm text-loom-600 font-medium mt-1">

                      {formatMeters(
                        selectedMeters
                      )}

                      {' '}
                      m total

                    </p>

                  </div>


                  {selectedRolls.length > 0 && (

                    <div className="rounded-lg border border-ink-900/10 overflow-hidden">

                      <div className="px-3 py-2 bg-ink-900/[0.025] text-xs font-semibold uppercase tracking-wide text-ink-700/45">
                        Selected rolls
                      </div>


                      <div className="max-h-56 overflow-y-auto divide-y divide-ink-900/5">

                        {selectedRolls.map(
                          (roll) => (

                            <div
                              key={
                                roll.id
                              }
                              className="px-3 py-3 flex items-center justify-between gap-3"
                            >

                              <div className="min-w-0">

                                <div className="flex items-center gap-2">

                                  <span className="font-medium text-sm truncate">
                                    {getProduct(
                                      roll,
                                      productMap
                                    )?.name ||
                                      roll.productName ||
                                      '—'}
                                  </span>

                                  {getProduct(
                                    roll,
                                    productMap
                                  )?.category && (

                                    <span
                                      className="
                                        shrink-0
                                        rounded-full
                                        bg-loom-50
                                        border
                                        border-loom-100
                                        px-1.5
                                        py-0.5
                                        text-[9px]
                                        font-semibold
                                        text-loom-700
                                      "
                                    >
                                      {
                                        getProduct(
                                          roll,
                                          productMap
                                        )?.category
                                      }
                                    </span>

                                  )}

                                </div>


                                <div className="text-xs text-ink-700/45 mt-0.5">

                                  {getProduct(
                                    roll,
                                    productMap
                                  )?.sku ||
                                    roll.sku ||
                                    '—'}

                                  {' · '}

                                  Roll: {getRollNumber(
                                    roll
                                  )}

                                </div>


                                <div className="text-xs text-ink-700/45 mt-0.5">

                                  {formatMeters(
                                    getRollRemaining(
                                      roll
                                    )
                                  )}

                                  {' '}
                                  m

                                </div>

                              </div>


                              <button
                                type="button"
                                className="text-signal-bad"
                                onClick={() =>
                                  removeSelectedRoll(
                                    roll.id
                                  )
                                }
                              >

                                <Trash2
                                  size={15}
                                />

                              </button>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}


                  <div>

                    <label className="label">
                      Remarks
                    </label>

                    <textarea
                      className="input mt-1 min-h-[90px]"
                      value={
                        piForm.remarks
                      }
                      onChange={(e) =>
                        setPiForm(
                          (prev) => ({
                            ...prev,
                            remarks:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Optional remarks..."
                    />

                  </div>


                  <div className="rounded-lg bg-signal-warn/5 border border-signal-warn/15 p-3 text-xs text-ink-700/65">

                    Stock is
                    <strong>
                      {' '}not deducted
                    </strong>
                    {' '}
                    while this PI is a draft.

                    <br />

                    Confirm the PI to dispatch
                    the complete rolls.

                  </div>


                  <div className="flex gap-2">

                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      onClick={() =>
                        setPiModal(
                          false
                        )
                      }
                      disabled={
                        saving
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="button"
                      className="btn-primary flex-1"
                      onClick={
                        savePI
                      }
                      disabled={
                        saving ||
                        !piForm.customerId ||
                        piForm.selectedRolls.length === 0
                      }
                    >

                      <FileText
                        size={15}
                      />

                      {saving
                        ? 'Creating...'
                        : 'Create Draft'}

                    </button>

                  </div>

                </aside>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          VIEW PI MODAL
      ====================================================== */}

      {viewPI && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">

          <div
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm"
            onClick={() =>
              setViewPI(null)
            }
          />


          <div className="relative bg-canvas w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-xl shadow-2xl border border-ink-900/10 flex flex-col">


            {/* HEADER */}

            <div className="px-5 py-4 border-b border-ink-900/10 flex items-center justify-between">

              <div>

                <h2 className="font-display text-lg">
                  {viewPI.piNumber}
                </h2>

                <div className="flex items-center gap-2 mt-1">

                  <Badge
                    tone={
                      piStatusTone(
                        viewPI.status
                      )
                    }
                  >
                    {formatPIStatus(
                      viewPI.status
                    )}
                  </Badge>


                  {viewPI.transactionNumber && (

                    <span className="text-xs text-ink-700/45">
                      {viewPI.transactionNumber}
                    </span>

                  )}

                </div>

              </div>


              <div className="flex items-center gap-2">

                {/* PDF / PRINT ONLY HERE */}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    printPI(
                      viewPI,
                      customerMap[
                        Number(
                          viewPI.customerId
                        )
                      ]
                    )
                  }
                >

                  <Printer
                    size={15}
                  />

                  PDF / Print

                </button>


                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setViewPI(null)
                  }
                >
                  Close
                </button>

              </div>

            </div>


            {/* BODY */}

            <div className="p-5 overflow-y-auto space-y-5">


              {/* CUSTOMER */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                <div className="rounded-lg bg-ink-900/[0.025] p-3">

                  <p className="text-[10px] uppercase tracking-wide text-ink-700/40">
                    Customer
                  </p>

                  <p className="font-medium text-sm mt-1">
                    {viewPI.customerName ||
                      customerMap[
                        Number(
                          viewPI.customerId
                        )
                      ]?.name ||
                      '—'}
                  </p>

                </div>


                <div className="rounded-lg bg-ink-900/[0.025] p-3">

                  <p className="text-[10px] uppercase tracking-wide text-ink-700/40">
                    PI Date
                  </p>

                  <p className="font-medium text-sm mt-1">
                    {formatDate(
                      viewPI.invoiceDate
                    )}
                  </p>

                </div>


                <div className="rounded-lg bg-ink-900/[0.025] p-3">

                  <p className="text-[10px] uppercase tracking-wide text-ink-700/40">
                    Created By
                  </p>

                  <p className="font-medium text-sm mt-1">
                    {viewPI.createdByName ||
                      '—'}
                  </p>

                </div>

              </div>


              {/* ITEMS */}

              <div className="card overflow-hidden">

                <div className="px-4 py-3 border-b border-ink-900/10">

                  <h3 className="font-display text-base">
                    Items
                  </h3>

                </div>


                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead>

                      <tr>

                        <th className="table-head">
                          Roll
                        </th>

                        <th className="table-head">
                          SKU
                        </th>

                        <th className="table-head">
                          Width
                        </th>

                        <th className="table-head">
                          Colour
                        </th>

                        <th className="table-head">
                          Meter
                        </th>

                        <th className="table-head">
                          Rate
                        </th>

                        <th className="table-head">
                          Total
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {(viewPI.items || []).map(
                        (item) => (

                          <tr
                            key={
                              item.id
                            }
                          >

                            <td className="table-cell font-medium">
                              {item.rollNumber ||
                                '—'}
                            </td>

                            <td className="table-cell">
                              {item.sku ||
                                '—'}
                            </td>

                            <td className="table-cell">
                              {item.width ||
                                '—'}
                            </td>

                            <td className="table-cell">
                              {item.color ||
                                '—'}
                            </td>

                            <td className="table-cell font-medium">
                              {formatMeters(
                                item.quantity
                              )}
                              {' '}
                              m
                            </td>

                            <td className="table-cell">
                              ₹
                              {Number(
                                item.ratePerMeter ||
                                0
                              ).toLocaleString(
                                'en-IN',
                                {
                                  minimumFractionDigits:
                                    2,
                                  maximumFractionDigits:
                                    2,
                                }
                              )}
                            </td>

                            <td className="table-cell font-medium">
                              {formatCurrency(
                                Number(
                                  item.quantity ||
                                  0
                                ) *
                                Number(
                                  item.ratePerMeter ||
                                  0
                                )
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>


              {/* REMARKS */}

              {viewPI.remarks && (

                <div className="rounded-lg border border-ink-900/10 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                    Remarks
                  </p>

                  <p className="text-sm mt-1">
                    {viewPI.remarks}
                  </p>

                </div>

              )}


              {/* DRAFT ACTIONS */}

              {String(
                viewPI.status || ''
              ).toUpperCase() ===
                'DRAFT' && (

                <div className="flex justify-end gap-2">

                  <button
                    type="button"
                    className="btn-secondary text-signal-bad"
                    onClick={() =>
                      handleCancelPI(
                        viewPI
                      )
                    }
                    disabled={
                      saving
                    }
                  >

                    <XCircle
                      size={15}
                    />

                    Cancel PI

                  </button>


                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() =>
                      handleConfirmPI(
                        viewPI
                      )
                    }
                    disabled={
                      saving
                    }
                  >

                    <CheckCircle2
                      size={15}
                    />

                    {saving
                      ? 'Confirming...'
                      : 'Confirm PI'}

                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          SUPPLIER MODAL
      ====================================================== */}

      {supplierModal && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">

          <div
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm"
            onClick={() =>
              !saving &&
              setSupplierModal(false)
            }
          />


          <div className="relative bg-canvas w-full max-w-lg rounded-xl shadow-2xl border border-ink-900/10 overflow-hidden">


            <div className="px-5 py-4 border-b border-ink-900/10 flex items-center justify-between">

              <h2 className="font-display text-lg">
                Add Supplier
              </h2>


              <button
                className="btn-ghost"
                onClick={() =>
                  setSupplierModal(false)
                }
                disabled={
                  saving
                }
              >
                Close
              </button>

            </div>


            <div className="p-5 space-y-4">

              <div>

                <label className="label">
                  Supplier Name
                </label>

                <input
                  className="input mt-1"
                  value={
                    supplierForm.name
                  }
                  onChange={(e) =>
                    setSupplierForm(
                      (prev) => ({
                        ...prev,
                        name:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>


              <div>

                <label className="label">
                  Phone
                </label>

                <input
                  className="input mt-1"
                  value={
                    supplierForm.phone
                  }
                  onChange={(e) =>
                    setSupplierForm(
                      (prev) => ({
                        ...prev,
                        phone:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>


              <div>

                <label className="label">
                  City / Address
                </label>

                <input
                  className="input mt-1"
                  value={
                    supplierForm.city
                  }
                  onChange={(e) =>
                    setSupplierForm(
                      (prev) => ({
                        ...prev,
                        city:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>


              <div>

                <label className="label">
                  GSTIN
                </label>

                <input
                  className="input mt-1"
                  value={
                    supplierForm.gstin
                  }
                  onChange={(e) =>
                    setSupplierForm(
                      (prev) => ({
                        ...prev,
                        gstin:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>


              <div className="flex justify-end gap-2 pt-2">

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setSupplierModal(
                      false
                    )
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>


                <button
                  className="btn-primary"
                  onClick={
                    saveSupplier
                  }
                  disabled={
                    saving ||
                    !supplierForm.name.trim()
                  }
                >

                  {saving
                    ? 'Saving...'
                    : 'Save Supplier'}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          PURCHASE RECOMMENDATIONS
      ====================================================== */}

      {recommendations.length > 0 && (

        <section className="space-y-3">

          <h2 className="font-display text-lg">
            Purchase recommendations
          </h2>


          <div className="card overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr>

                  <th className="table-head">
                    SKU
                  </th>

                  <th className="table-head">
                    On hand (m)
                  </th>

                  <th className="table-head">
                    Daily velocity
                  </th>

                  <th className="table-head">
                    Cover left
                  </th>

                  <th className="table-head">
                    Suggested order (m)
                  </th>

                </tr>

              </thead>


              <tbody>

                {recommendations.map(
                  (recommendation) => (

                    <tr
                      key={
                        recommendation.product.id
                      }
                    >

                      <td className="table-cell font-medium">
                        {recommendation.product.sku}
                      </td>

                      <td className="table-cell">
                        {formatMeters(
                          recommendation.meters
                        )}
                      </td>

                      <td className="table-cell">
                        {recommendation.dailyVelocity.toFixed(
                          1
                        )}
                        {' '}
                        m/day
                      </td>

                      <td className="table-cell">

                        {Number.isFinite(
                          recommendation.coverDays
                        )
                          ? `${Math.round(
                              recommendation.coverDays
                            )} days`
                          : '—'}

                      </td>

                      <td className="table-cell font-medium text-loom-600">
                        {formatMeters(
                          recommendation.suggestedOrderMeters
                        )}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      )}

    </div>

  );
}
// ============================================================
// INFO CARD
// ============================================================

function InfoCard({
  label,
  value,
  icon,
}) {
  return (
    <div
      className="
        rounded-xl border border-ink-900/5
        bg-slate-50/40 p-3
      "
    >
      <div className="flex items-center gap-2">
        <div
          className="
            h-7 w-7 rounded-lg bg-slate-100
            text-slate-500 flex items-center justify-center
          "
        >
          {icon}
        </div>
        <span
          className="
            text-[10px] uppercase tracking-[0.1em]
            text-ink-700/40
          "
        >
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-ink-900 mt-2 break-words">
        {value || '—'}
      </p>
    </div>
  );
}


// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  children,
}) {
  return (
    <div>
      <label className="label">
        {label}
      </label>
      {children}
    </div>
  );
}
