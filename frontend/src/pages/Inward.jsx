import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  PackagePlus,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Sparkles,
  FileSpreadsheet,
  Upload,
  Eye,
  Database,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/dateUtils';


// ============================================================
// CONFIG
// ============================================================

const API_URL =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// HELPERS
// ============================================================

const BLANK_LINE = () => ({
  length: '',
  batch: '',
  rack: '',
  bin: '',
});

const BLANK_PRODUCT = () => ({
  category: 'ESSENTIAL',
  sku: '',
  name: '',
  color: '',
  width: '320',
  ratePerMeter: '',
  reorderLevel: '',
});


function formatNumber(value) {
  return Number(
    value || 0
  ).toLocaleString('en-IN');
}


// ============================================================
// COMPONENT
// ============================================================

export default function Inward() {

  const {
    products = [],
    suppliers = [],
    rolls = [],

    currentUser,

    loadRolls,
    loadProducts,
    loadTransactions,
  } = useApp();


  // ==========================================================
  // MODE
  // ==========================================================

  const [
    productMode,
    setProductMode,
  ] = useState('existing');


  // ==========================================================
  // MANUAL FORM
  // ==========================================================

  const [
    productId,
    setProductId,
  ] = useState('');

  const [
    supplierId,
    setSupplierId,
  ] = useState('');

  const [
    note,
    setNote,
  ] = useState('');

  const [
    lines,
    setLines,
  ] = useState([
    BLANK_LINE(),
  ]);

  const [
    newProduct,
    setNewProduct,
  ] = useState(
    BLANK_PRODUCT()
  );


  // ==========================================================
  // EXCEL STATE
  // ==========================================================

  const [
    excelFile,
    setExcelFile,
  ] = useState(null);

  const [
    excelPreview,
    setExcelPreview,
  ] = useState(null);

  const [
    excelPreviewing,
    setExcelPreviewing,
  ] = useState(false);

  const [
    excelImporting,
    setExcelImporting,
  ] = useState(false);

  const [
    excelError,
    setExcelError,
  ] = useState(null);

  const [
    excelSuccess,
    setExcelSuccess,
  ] = useState(null);

  const [
    excelNotes,
    setExcelNotes,
  ] = useState('');


  // ==========================================================
  // MANUAL UI STATE
  // ==========================================================

  const [
    confirmation,
    setConfirmation,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    saving,
    setSaving,
  ] = useState(false);


  // ==========================================================
  // DEFAULTS
  // ==========================================================

  useEffect(() => {

    if (
      !productId &&
      products.length > 0 &&
      productMode === 'existing'
    ) {
      setProductId(
        String(
          products[0].id
        )
      );
    }

  }, [
    products,
    productId,
    productMode,
  ]);


  useEffect(() => {

    if (
      !supplierId &&
      suppliers.length > 0
    ) {
      setSupplierId(
        String(
          suppliers[0].id
        )
      );
    }

  }, [
    suppliers,
    supplierId,
  ]);


  // ==========================================================
  // RESET EXCEL PREVIEW WHEN SUPPLIER CHANGES
  // ==========================================================

  useEffect(() => {

    setExcelPreview(null);
    setExcelError(null);
    setExcelSuccess(null);

  }, [supplierId]);


  // ==========================================================
  // SELECTED PRODUCT
  // ==========================================================

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            Number(
              product.id
            ) ===
            Number(
              productId
            )
        ) || null,
      [
        products,
        productId,
      ]
    );


  // ==========================================================
  // TOTAL METERS
  // ==========================================================

  const totalMeters =
    useMemo(
      () =>
        lines.reduce(
          (
            total,
            line
          ) =>
            total +
            (
              Number(
                line.length
              ) || 0
            ),
          0
        ),
      [lines]
    );


  // ==========================================================
  // VALID ROLLS
  // ==========================================================

  const validLineCount =
    useMemo(
      () =>
        lines.filter(
          (line) =>
            Number(
              line.length
            ) > 0
        ).length,
      [lines]
    );


  // ==========================================================
  // RECENT INWARD
  // ==========================================================

  const recentInward =
    useMemo(
      () =>
        [...rolls]
          .filter(
            (roll) =>
              roll.supplierId &&
              roll.inwardDate
          )
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.inwardDate
              ) -
              new Date(
                a.inwardDate
              )
          )
          .slice(
            0,
            8
          ),
      [rolls]
    );


  // ==========================================================
  // LINE HANDLERS
  // ==========================================================

  function updateLine(
    index,
    patch
  ) {

    setLines(
      (prev) =>
        prev.map(
          (
            line,
            i
          ) =>
            i === index
              ? {
                  ...line,
                  ...patch,
                }
              : line
        )
    );

  }


  function addLine() {

    setLines(
      (prev) => [
        ...prev,
        BLANK_LINE(),
      ]
    );

  }


  function removeLine(
    index
  ) {

    setLines(
      (prev) => {

        const next =
          prev.filter(
            (
              _,
              i
            ) =>
              i !== index
          );

        return next.length > 0
          ? next
          : [
              BLANK_LINE(),
            ];
      }
    );

  }


  // ==========================================================
  // NEW PRODUCT HANDLER
  // ==========================================================

  function updateNewProduct(
    patch
  ) {

    setNewProduct(
      (prev) => ({
        ...prev,
        ...patch,
      })
    );

  }


  function switchProductMode(
    mode
  ) {

    setProductMode(
      mode
    );

    setError(null);
    setConfirmation(null);

    if (
      mode ===
      'new'
    ) {

      setProductId('');

      setNewProduct(
        BLANK_PRODUCT()
      );

    } else {

      setNewProduct(
        BLANK_PRODUCT()
      );

      if (
        products.length > 0
      ) {
        setProductId(
          String(
            products[0].id
          )
        );
      }

    }

  }


  // ==========================================================
  // MANUAL VALIDATION
  // ==========================================================

  function validateForm() {

    if (!supplierId) {

      return 'Please select a supplier.';

    }


    if (
      productMode ===
      'existing'
    ) {

      if (!productId) {
        return 'Please select a product.';
      }

    } else {

      const category =
        String(
          newProduct.category || ''
        ).toUpperCase();

      const sku =
        newProduct.sku.trim();

      const name =
        newProduct.name.trim();

      const color =
        newProduct.color.trim();

      const width =
        Number(
          newProduct.width
        );

      const rate =
        Number(
          newProduct.ratePerMeter
        );

      const reorderLevel =
        Number(
          newProduct.reorderLevel ||
          0
        );


      if (
        category !== 'ESSENTIAL' &&
        category !== 'PREMIUM'
      ) {
        return 'Category must be ESSENTIAL or PREMIUM.';
      }

      if (!sku) {
        return 'SKU is required.';
      }

      if (!name) {
        return 'Product name is required.';
      }

      if (!color) {
        return 'Colour is required.';
      }

      if (
        !Number.isFinite(
          width
        ) ||
        width <= 0
      ) {
        return 'Width must be greater than 0.';
      }

      if (
        !Number.isFinite(
          rate
        ) ||
        rate < 0
      ) {
        return 'Rate per meter must be valid.';
      }

      if (
        !Number.isFinite(
          reorderLevel
        ) ||
        reorderLevel < 0
      ) {
        return 'Reorder level must be valid.';
      }


      const duplicate =
        products.some(
          (product) =>
            String(
              product.sku ||
              ''
            )
              .trim()
              .toLowerCase() ===
            sku.toLowerCase()
        );


      if (duplicate) {

        return `SKU ${sku} already exists. Select the existing product instead.`;

      }

    }


    if (
      validLineCount ===
      0
    ) {

      return 'Please enter at least one roll length.';

    }


    return null;
  }


  // ==========================================================
  // MANUAL SUBMIT
  // ==========================================================

  async function submit() {

    setError(null);
    setConfirmation(null);


    const validationError =
      validateForm();


    if (
      validationError
    ) {

      setError(
        validationError
      );

      return;

    }


    const validLines =
      lines.filter(
        (line) =>
          Number(
            line.length
          ) > 0
      );


    try {

      setSaving(
        true
      );


      const requestRolls =
        validLines.map(
          (line) => {

            const base = {

              length:
                Number(
                  line.length
                ),

              batch:
                line.batch.trim() ||
                null,

              rack:
                line.rack.trim() ||
                null,

              bin:
                line.bin.trim() ||
                null,

            };


            if (
              productMode ===
              'existing'
            ) {

              return {

                ...base,

                productId:
                  Number(
                    productId
                  ),

              };

            }


            return {

              ...base,

              newProduct: {

                category:
                  String(
                    newProduct.category
                  ).toUpperCase(),

                sku:
                  newProduct.sku.trim(),

                name:
                  newProduct.name.trim(),

                color:
                  newProduct.color.trim(),

                width:
                  Number(
                    newProduct.width
                  ),

                ratePerMeter:
                  Number(
                    newProduct.ratePerMeter
                  ),

                reorderLevel:
                  Number(
                    newProduct.reorderLevel ||
                    0
                  ),

              },

            };

          }
        );


      const userId =
        currentUser?.id
          ? Number(
              currentUser.id
            )
          : 1;


      const payload = {

        supplierId:
          Number(
            supplierId
          ),

        userId,

        notes:
          note.trim() ||
          null,

        rolls:
          requestRolls,

      };


      console.log(
        'INWARD REQUEST:',
        payload
      );


      const token =
        localStorage.getItem(
          'wincrea-auth-token'
        );


      const response =
        await fetch(
          `${API_URL}/inward`,
          {

            method:
              'POST',

            headers: {

              'Content-Type':
                'application/json',

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },

            body:
              JSON.stringify(
                payload
              ),

          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.message ||
          'Inward failed.'
        );

      }


      console.log(
        'INWARD RESPONSE:',
        data
      );


      await Promise.all([
        loadRolls?.(),
        loadProducts?.(),
        loadTransactions?.(),
      ]);


      const createdProductCount =
        Array.isArray(
          data.createdProducts
        )
          ? data.createdProducts.length
          : 0;


      const productText =
        productMode ===
          'new' &&
        createdProductCount >
          0
          ? ` New SKU ${newProduct.sku.trim()} was created.`
          : '';


      setConfirmation(
        `${validLines.length} roll(s) received successfully. ` +
        `Total: ${totalMeters.toLocaleString(
          'en-IN'
        )} m.` +
        productText
      );


      setLines([
        BLANK_LINE(),
      ]);

      setNote('');


      if (
        productMode ===
        'new'
      ) {

        setProductMode(
          'existing'
        );

        setNewProduct(
          BLANK_PRODUCT()
        );

      }

    } catch (err) {

      console.error(
        'INWARD ERROR:',
        err
      );

      setError(
        err.message ||
        'Failed to save inward.'
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  // ==========================================================
  // EXCEL FILE SELECT
  // ==========================================================

  function handleExcelFile(
    event
  ) {

    const file =
      event.target.files?.[0] ||
      null;

    setExcelFile(
      file
    );

    setExcelPreview(
      null
    );

    setExcelError(
      null
    );

    setExcelSuccess(
      null
    );

    if (!file) {
      return;
    }

    const lowerName =
      String(
        file.name
      ).toLowerCase();

    if (
      !lowerName.endsWith(
        '.xlsx'
      ) &&
      !lowerName.endsWith(
        '.xls'
      )
    ) {

      setExcelFile(
        null
      );

      setExcelError(
        'Please select an Excel file (.xlsx or .xls).'
      );

      event.target.value =
        '';

      return;

    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {

      setExcelFile(
        null
      );

      setExcelError(
        'Excel file must be smaller than 10 MB.'
      );

      event.target.value =
        '';

    }

  }


  // ==========================================================
  // EXCEL PREVIEW
  // ==========================================================

  async function previewExcel() {

    setExcelError(null);
    setExcelSuccess(null);
    setExcelPreview(null);


    if (!supplierId) {

      setExcelError(
        'Please select a supplier before previewing the Excel file.'
      );

      return;

    }


    if (!excelFile) {

      setExcelError(
        'Please select an Excel file.'
      );

      return;

    }


    const userId =
      currentUser?.id
        ? Number(
            currentUser.id
          )
        : 1;


    try {

      setExcelPreviewing(
        true
      );


      const formData =
        new FormData();


      formData.append(
        'file',
        excelFile
      );

      formData.append(
        'supplierId',
        String(
          supplierId
        )
      );

      formData.append(
        'userId',
        String(
          userId
        )
      );


      if (
        excelNotes.trim()
      ) {

        formData.append(
          'notes',
          excelNotes.trim()
        );

      }


      const token =
        localStorage.getItem(
          'wincrea-auth-token'
        );


      const response =
        await fetch(
          `${API_URL}/inward/excel/preview`,
          {

            method:
              'POST',

            headers: {

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),

            },

            body:
              formData,

          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.message ||
          'Excel preview failed.'
        );

      }


      console.log(
        'EXCEL PREVIEW:',
        data
      );


      setExcelPreview(
        data
      );

    } catch (err) {

      console.error(
        'EXCEL PREVIEW ERROR:',
        err
      );

      setExcelError(
        err.message ||
        'Excel preview failed.'
      );

    } finally {

      setExcelPreviewing(
        false
      );

    }

  }


  // ==========================================================
  // EXCEL IMPORT
  // ==========================================================

  async function importExcel() {

    setExcelError(null);
    setExcelSuccess(null);


    if (!supplierId) {

      setExcelError(
        'Please select a supplier.'
      );

      return;

    }


    if (!excelFile) {

      setExcelError(
        'Please select an Excel file.'
      );

      return;

    }


    if (!excelPreview) {

      setExcelError(
        'Please preview the Excel file before importing.'
      );

      return;

    }


    if (
      excelPreview.validation &&
      excelPreview.validation.valid === false
    ) {

      setExcelError(
        'Excel validation failed. Please fix the file before importing.'
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Import ${formatNumber(
          excelPreview.summary?.totalRolls
        )} rolls (${formatNumber(
          excelPreview.summary?.totalMeters
        )} m) into inventory?`
      );


    if (!confirmed) {
      return;
    }


    const userId =
      currentUser?.id
        ? Number(
            currentUser.id
          )
        : 1;


    try {

      setExcelImporting(
        true
      );


      const formData =
        new FormData();


      formData.append(
        'file',
        excelFile
      );

      formData.append(
        'supplierId',
        String(
          supplierId
        )
      );

      formData.append(
        'userId',
        String(
          userId
        )
      );


      if (
        excelNotes.trim()
      ) {

        formData.append(
          'notes',
          excelNotes.trim()
        );

      }


      const token =
        localStorage.getItem(
          'wincrea-auth-token'
        );


      const response =
        await fetch(
          `${API_URL}/inward/excel`,
          {

            method:
              'POST',

            headers: {

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),

            },

            body:
              formData,

          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.message ||
          'Excel import failed.'
        );

      }


      console.log(
        'EXCEL IMPORT RESPONSE:',
        data
      );


      await Promise.all([
        loadRolls?.(),
        loadProducts?.(),
        loadTransactions?.(),
      ]);


      setExcelSuccess(
        `Excel inward completed successfully. ` +
        `${formatNumber(
          data.totalRolls
        )} rolls and ` +
        `${formatNumber(
          data.totalMeters
        )} m received.` +
        (
          data.totalNewProducts > 0
            ? ` ${formatNumber(
                data.totalNewProducts
              )} new SKU(s) created.`
            : ''
        )
      );


      setExcelFile(
        null
      );

      setExcelPreview(
        null
      );

      setExcelNotes(
        ''
      );


      const fileInput =
        document.getElementById(
          'excel-inward-file'
        );

      if (fileInput) {
        fileInput.value =
          '';
      }

    } catch (err) {

      console.error(
        'EXCEL IMPORT ERROR:',
        err
      );

      setExcelError(
        err.message ||
        'Excel import failed.'
      );

    } finally {

      setExcelImporting(
        false
      );

    }

  }


  // ==========================================================
  // RESET
  // ==========================================================

  function resetForm() {

    setLines([
      BLANK_LINE(),
    ]);

    setNote('');

    setError(null);
    setConfirmation(null);

    if (
      products.length > 0
    ) {
      setProductId(
        String(
          products[0].id
        )
      );
    }

    if (
      suppliers.length > 0
    ) {
      setSupplierId(
        String(
          suppliers[0].id
        )
      );
    }

    setProductMode(
      'existing'
    );

    setNewProduct(
      BLANK_PRODUCT()
    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="space-y-6">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 rounded-lg bg-loom-600/10 text-loom-700 flex items-center justify-center">

              <PackagePlus
                size={19}
              />

            </div>

            <h1 className="font-display text-2xl">
              Inward
            </h1>

          </div>


          <p className="text-sm text-ink-700/60 mt-2">
            Receive fabric into inventory. Existing and new SKUs can be inwarded manually or from Excel.
          </p>

        </div>


        <div className="text-xs text-ink-700/45">

          {currentUser?.name
            ? `Logged in as ${currentUser.name}`
            : ''}

        </div>

      </div>


      {/* ======================================================
          MANUAL / GLOBAL MESSAGES
      ====================================================== */}

      {confirmation && (

        <div className="rounded-xl border border-signal-good/20 bg-signal-good/5 px-4 py-3 flex items-start gap-3">

          <CheckCircle2
            size={18}
            className="text-signal-good shrink-0 mt-0.5"
          />

          <div>

            <p className="text-sm font-medium text-signal-good">
              Inward completed
            </p>

            <p className="text-sm text-ink-700/65 mt-0.5">
              {confirmation}
            </p>

          </div>

        </div>

      )}


      {error && (

        <div className="rounded-xl border border-signal-bad/20 bg-signal-bad/5 px-4 py-3 flex items-start gap-3">

          <AlertCircle
            size={18}
            className="text-signal-bad shrink-0 mt-0.5"
          />

          <div>

            <p className="text-sm font-medium text-signal-bad">
              Couldn't complete inward
            </p>

            <p className="text-sm text-ink-700/65 mt-0.5">
              {error}
            </p>

          </div>

        </div>

      )}


      {/* ======================================================
          EXCEL BULK INWARD
      ====================================================== */}

      <div className="card overflow-hidden">

        <div className="px-5 py-4 border-b border-ink-900/10">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-xl bg-loom-600/10 text-loom-700 flex items-center justify-center shrink-0">

                <FileSpreadsheet
                  size={20}
                />

              </div>

              <div>

                <h2 className="font-display text-lg">
                  Excel Bulk Inward
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  Upload the WINCREA Import template. One row represents one physical roll.
                </p>

              </div>

            </div>


            <div className="text-xs text-ink-700/45">
              Maximum file size: 10 MB
            </div>

          </div>

        </div>


        <div className="p-5 space-y-5">


          {/* ==================================================
              SUPPLIER
          ================================================== */}

          <div>

            <label className="label">
              Supplier *
            </label>

            <select
              className="input mt-1"
              value={
                supplierId
              }
              onChange={(e) => {

                setSupplierId(
                  e.target.value
                );

              }}
            >

              <option value="">
                Select supplier
              </option>

              {suppliers.map(
                (supplier) => (

                  <option
                    key={
                      supplier.id
                    }
                    value={
                      supplier.id
                    }
                  >
                    {supplier.name}
                  </option>

                )
              )}

            </select>

            <p className="text-xs text-ink-700/40 mt-1.5">
              Every roll in this Excel import will be received against this supplier.
            </p>

          </div>


          {/* ==================================================
              FILE
          ================================================== */}

          <div>

            <label className="label">
              Excel File *
            </label>


            <label
              htmlFor="excel-inward-file"
              className="mt-1 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-dashed border-ink-900/20 bg-ink-900/[0.015] px-4 py-4 cursor-pointer hover:bg-ink-900/[0.025] transition"
            >

              <div className="w-9 h-9 rounded-lg bg-loom-600/10 text-loom-700 flex items-center justify-center shrink-0">

                <Upload
                  size={17}
                />

              </div>


              <div className="min-w-0 flex-1">

                <p className="text-sm font-medium">
                  {excelFile
                    ? excelFile.name
                    : 'Choose Excel workbook'}
                </p>

                <p className="text-xs text-ink-700/45 mt-0.5">
                  .xlsx or .xls
                </p>

              </div>


              <span className="btn-secondary pointer-events-none">

                Choose file

              </span>

            </label>


            <input
              id="excel-inward-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={
                handleExcelFile
              }
            />

          </div>


          <div
            className="
              rounded-xl
              border
              border-ink-900/10
              bg-ink-900/[0.02]
              px-4
              py-4
            "
          >

            <div className="flex items-start gap-3">

              <div
                className="
                  w-8
                  h-8
                  rounded-lg
                  bg-loom-600/10
                  text-loom-700
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <FileSpreadsheet size={15} />
              </div>

              <div>

                <p className="text-sm font-medium">
                  Required Excel format
                </p>

                <p className="text-xs text-ink-700/50 mt-1">
                  Sheet: <strong>Import</strong>
                </p>

                <p className="text-xs text-ink-700/50 mt-1">
                  Category · SKU · Product Name · Color · Width (CM) · Roll Length (m) · Batch · Supplier
                </p>

                <p className="text-[11px] text-ink-700/40 mt-2">
                  One row = one physical roll. Category must be ESSENTIAL or PREMIUM. The supplier is selected above and is applied to the entire import.
                </p>

              </div>

            </div>

          </div>


          {/* ==================================================
              NOTES
          ================================================== */}

          <div>

            <label className="label">
              Excel import note
              <span className="text-ink-700/35">
                {' '}
                (optional)
              </span>
            </label>

            <input
              className="input mt-1"
              value={
                excelNotes
              }
              onChange={(e) =>
                setExcelNotes(
                  e.target.value
                )
              }
              placeholder="e.g. July opening stock"
            />

          </div>


          {/* ==================================================
              ERRORS
          ================================================== */}

          {excelError && (

            <div className="rounded-xl border border-signal-bad/20 bg-signal-bad/5 px-4 py-3 flex items-start gap-3">

              <AlertCircle
                size={18}
                className="text-signal-bad shrink-0 mt-0.5"
              />

              <div>

                <p className="text-sm font-medium text-signal-bad">
                  Excel error
                </p>

                <p className="text-sm text-ink-700/65 mt-0.5">
                  {excelError}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              SUCCESS
          ================================================== */}

          {excelSuccess && (

            <div className="rounded-xl border border-signal-good/20 bg-signal-good/5 px-4 py-3 flex items-start gap-3">

              <CheckCircle2
                size={18}
                className="text-signal-good shrink-0 mt-0.5"
              />

              <div>

                <p className="text-sm font-medium text-signal-good">
                  Excel import completed
                </p>

                <p className="text-sm text-ink-700/65 mt-0.5">
                  {excelSuccess}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              PREVIEW SUMMARY
          ================================================== */}

          {excelPreview && (

            <div className="rounded-xl border border-ink-900/10 overflow-hidden">

              <div className="px-4 py-3 bg-ink-900/[0.025] border-b border-ink-900/10 flex items-center justify-between gap-3">

                <div>

                  <p className="text-sm font-medium">
                    Excel Preview
                  </p>

                  <p className="text-xs text-ink-700/45 mt-0.5">
                    No database changes were made during preview.
                  </p>

                </div>


                <span className="text-xs px-2 py-1 rounded-full bg-signal-good/10 text-signal-good">
                  Valid
                </span>

              </div>


              <div className="p-4 space-y-4">


                {/* TOTALS */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <div className="rounded-xl bg-ink-900/[0.025] p-4">

                    <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                      Essential
                    </div>

                    <div className="font-display text-xl mt-1">
                      {formatNumber(
                        excelPreview.summary?.essentialMeters
                      )}{' '}
                      m
                    </div>

                    <div className="text-xs text-ink-700/45 mt-1">
                      {formatNumber(
                        excelPreview.summary?.essentialRolls
                      )}{' '}
                      rolls
                    </div>

                  </div>


                  <div className="rounded-xl bg-ink-900/[0.025] p-4">

                    <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                      Premium
                    </div>

                    <div className="font-display text-xl mt-1">
                      {formatNumber(
                        excelPreview.summary?.premiumMeters
                      )}{' '}
                      m
                    </div>

                    <div className="text-xs text-ink-700/45 mt-1">
                      {formatNumber(
                        excelPreview.summary?.premiumRolls
                      )}{' '}
                      rolls
                    </div>

                  </div>


                  <div className="rounded-xl bg-loom-600/10 p-4">

                    <div className="text-[10px] uppercase tracking-wide text-loom-700/60">
                      Total
                    </div>

                    <div className="font-display text-xl mt-1 text-loom-800">
                      {formatNumber(
                        excelPreview.summary?.totalMeters
                      )}{' '}
                      m
                    </div>

                    <div className="text-xs text-ink-700/50 mt-1">
                      {formatNumber(
                        excelPreview.summary?.totalRolls
                      )}{' '}
                      rolls
                    </div>

                  </div>

                </div>


                {/* PRODUCT COUNTS */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div className="rounded-xl border border-ink-900/10 px-4 py-3 flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <Database
                        size={16}
                        className="text-ink-700/45"
                      />

                      <span className="text-sm">
                        New SKUs
                      </span>

                    </div>

                    <span className="font-display">
                      {formatNumber(
                        excelPreview.newProducts?.length
                      )}
                    </span>

                  </div>


                  <div className="rounded-xl border border-ink-900/10 px-4 py-3 flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <Boxes
                        size={16}
                        className="text-ink-700/45"
                      />

                      <span className="text-sm">
                        Existing SKUs
                      </span>

                    </div>

                    <span className="font-display">
                      {formatNumber(
                        excelPreview.existingProducts?.length
                      )}
                    </span>

                  </div>

                </div>


                {/* VALIDATION */}

                {excelPreview.validation?.valid !== false && (

                  <div
                    className="
                      rounded-xl
                      border
                      border-signal-good/20
                      bg-signal-good/5
                      px-4
                      py-3
                    "
                  >

                    <div className="flex items-start gap-3">

                      <CheckCircle2
                        size={17}
                        className="text-signal-good shrink-0 mt-0.5"
                      />

                      <div>

                        <p className="text-sm font-medium text-signal-good">
                          Excel validation passed
                        </p>

                        <p className="text-xs text-ink-700/60 mt-1">
                          All rows passed the required format, category, SKU, product, width and roll-length checks.
                        </p>

                      </div>

                    </div>

                  </div>

                )}


                {/* NEW SKU PREVIEW */}

                {excelPreview.newProducts?.length > 0 && (

                  <details className="rounded-xl border border-ink-900/10">

                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                      New SKUs to be created
                      {' '}
                      ({excelPreview.newProducts.length})
                    </summary>

                    <div className="border-t border-ink-900/10 max-h-72 overflow-auto">

                      {excelPreview.newProducts.map(
                        (
                          product,
                          index
                        ) => (

                          <div
                            key={
                              index
                            }
                            className="px-4 py-3 border-b border-ink-900/5 last:border-b-0"
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">

                                <p className="text-sm font-medium truncate">
                                  {product.sku}
                                </p>

                                <div className="flex items-center gap-2 mt-1">

                                  <span
                                    className="
                                      text-[10px]
                                      font-semibold
                                      uppercase
                                      tracking-wide
                                      text-loom-700
                                      bg-loom-50
                                      border
                                      border-loom-100
                                      rounded-full
                                      px-2
                                      py-0.5
                                    "
                                  >
                                    {product.category}
                                  </span>

                                  <span className="text-xs text-ink-700/50 truncate">
                                    {product.name}
                                  </span>

                                </div>

                                <p className="text-xs text-ink-700/50 mt-1">
                                  {product.color || 'Color not provided'}
                                </p>

                              </div>

                              <div className="text-right shrink-0">

                                <p className="text-sm font-medium">
                                  {formatNumber(
                                    product.incomingMeters
                                  )}{' '}
                                  m
                                </p>

                                <p className="text-xs text-ink-700/45">
                                  {product.incomingRolls}
                                  {' '}
                                  rolls
                                </p>

                              </div>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </details>

                )}


                {/* ACTIONS */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-ink-900/10 pt-4">

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      previewExcel
                    }
                    disabled={
                      excelPreviewing ||
                      excelImporting
                    }
                  >

                    <Eye
                      size={15}
                    />

                    {excelPreviewing
                      ? 'Previewing...'
                      : 'Refresh Preview'}

                  </button>


                  <button
                    type="button"
                    className="btn-primary"
                    onClick={
                      importExcel
                    }
                    disabled={
                      excelImporting ||
                      excelPreviewing
                    }
                  >

                    <Database
                      size={15}
                    />

                    {excelImporting
                      ? 'Importing...'
                      : 'Import to Inventory'}

                  </button>

                </div>

              </div>

            </div>

          )}


          {/* ==================================================
              BEFORE PREVIEW ACTION
          ================================================== */}

          {!excelPreview && (

            <div className="flex justify-end">

              <button
                type="button"
                className="btn-primary"
                onClick={
                  previewExcel
                }
                disabled={
                  excelPreviewing ||
                  excelImporting
                }
              >

                <Eye
                  size={15}
                />

                {excelPreviewing
                  ? 'Previewing...'
                  : 'Preview Excel'}

              </button>

            </div>

          )}

        </div>

      </div>


      {/* ======================================================
          MANUAL MAIN GRID
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">


        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="card overflow-hidden">


          {/* ==================================================
              FORM HEADER
          ================================================== */}

          <div className="px-5 py-4 border-b border-ink-900/10">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h2 className="font-display text-lg">
                  Manual Receive Stock
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  Complete the form and receive all entered rolls in one transaction.
                </p>

              </div>


              <div className="rounded-lg bg-ink-900/[0.025] px-3 py-2 text-right">

                <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                  Total incoming
                </div>

                <div className="font-display text-lg">
                  {totalMeters.toLocaleString(
                    'en-IN'
                  )}{' '}
                  m
                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              FORM BODY
          ================================================== */}

          <div className="p-5 space-y-6">


            {/* =================================================
                SUPPLIER
            ================================================= */}

            <div>

              <label className="label">
                Supplier
              </label>

              <select
                className="input mt-1"
                value={
                  supplierId
                }
                onChange={(e) =>
                  setSupplierId(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Select supplier
                </option>

                {suppliers.map(
                  (supplier) => (

                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {supplier.name}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* =================================================
                PRODUCT MODE
            ================================================= */}

            <div>

              <div className="flex items-center justify-between mb-2">

                <label className="label mb-0">
                  Product
                </label>

                <div className="text-xs text-ink-700/40">
                  Choose how you want to receive this stock.
                </div>

              </div>


              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-ink-900/[0.035] border border-ink-900/5">

                <button
                  type="button"
                  onClick={() =>
                    switchProductMode(
                      'existing'
                    )
                  }
                  className={`
                    rounded-lg
                    px-4
                    py-2.5
                    text-sm
                    font-medium
                    transition
                    ${
                      productMode ===
                      'existing'
                        ? 'bg-canvas shadow-sm text-ink-900'
                        : 'text-ink-700/50 hover:text-ink-900'
                    }
                  `}
                >

                  <div className="flex items-center justify-center gap-2">

                    <Boxes
                      size={15}
                    />

                    Existing SKU

                  </div>

                </button>


                <button
                  type="button"
                  onClick={() =>
                    switchProductMode(
                      'new'
                    )
                  }
                  className={`
                    rounded-lg
                    px-4
                    py-2.5
                    text-sm
                    font-medium
                    transition
                    ${
                      productMode ===
                      'new'
                        ? 'bg-canvas shadow-sm text-ink-900'
                        : 'text-ink-700/50 hover:text-ink-900'
                    }
                  `}
                >

                  <div className="flex items-center justify-center gap-2">

                    <Sparkles
                      size={15}
                    />

                    New SKU

                  </div>

                </button>

              </div>


              {/* EXISTING PRODUCT */}

              {productMode ===
                'existing' && (

                <div className="mt-3">

                  <select
                    className="input"
                    value={
                      productId
                    }
                    onChange={(e) =>
                      setProductId(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select product / SKU
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
                          {' — '}
                          {product.name}
                        </option>

                      )
                    )}

                  </select>


                  {selectedProduct && (

                    <div className="mt-3 rounded-xl bg-canvas border border-ink-900/10 px-4 py-3">

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

                        <div>

                          <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                            SKU
                          </div>

                          <div className="text-sm font-medium">
                            {selectedProduct.sku}
                          </div>

                        </div>


                        <div>

                          <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                            Product
                          </div>

                          <div className="text-sm font-medium">
                            {selectedProduct.name}
                          </div>

                        </div>


                        <div>

                          <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                            Colour
                          </div>

                          <div className="text-sm font-medium">
                            {selectedProduct.color ||
                              '—'}
                          </div>

                        </div>


                        <div>

                          <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                            Width
                          </div>

                          <div className="text-sm font-medium">
                            {selectedProduct.width ||
                              '—'}
                            {selectedProduct.width
                              ? ' cm'
                              : ''}
                          </div>

                        </div>

                      </div>

                    </div>

                  )}

                </div>

              )}


              {/* NEW PRODUCT */}

              {productMode ===
                'new' && (

                <div className="mt-3 rounded-xl border border-loom-200 bg-loom-50/40 p-4">

                  <div className="flex items-start gap-3 mb-4">

                    <div className="w-8 h-8 rounded-lg bg-loom-600 text-white flex items-center justify-center shrink-0">

                      <Sparkles
                        size={15}
                      />

                    </div>

                    <div>

                      <p className="text-sm font-medium">
                        Create a new SKU
                      </p>

                      <p className="text-xs text-ink-700/50 mt-0.5">
                        The product and its rolls will be created together in one database transaction.
                      </p>

                    </div>

                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


                    <div>

                      <label className="label">
                        Category *
                      </label>

                      <select
                        className="input mt-1"
                        value={
                          newProduct.category
                        }
                        onChange={(e) =>
                          updateNewProduct({
                            category:
                              e.target.value,
                          })
                        }
                      >

                        <option value="ESSENTIAL">
                          Essential
                        </option>

                        <option value="PREMIUM">
                          Premium
                        </option>

                      </select>

                    </div>


                    <div>

                      <label className="label">
                        SKU *
                      </label>

                      <input
                        className="input mt-1"
                        value={
                          newProduct.sku
                        }
                        onChange={(e) =>
                          updateNewProduct({
                            sku:
                              e.target.value,
                          })
                        }
                        placeholder="e.g. ZEB-RED-120"
                      />

                    </div>


                    <div>

                      <label className="label">
                        Product name *
                      </label>

                      <input
                        className="input mt-1"
                        value={
                          newProduct.name
                        }
                        onChange={(e) =>
                          updateNewProduct({
                            name:
                              e.target.value,
                          })
                        }
                        placeholder="e.g. Zebra Fabric"
                      />

                    </div>


                    <div>

                      <label className="label">
                        Colour *
                      </label>

                      <input
                        className="input mt-1"
                        value={
                          newProduct.color
                        }
                        onChange={(e) =>
                          updateNewProduct({
                            color:
                              e.target.value,
                          })
                        }
                        placeholder="e.g. Charcoal"
                      />

                    </div>


                    <div>

                      <label className="label">
                        Width (cm) *
                      </label>

                      <input
                        className="input mt-1"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          newProduct.width
                        }
                        onChange={(e) =>
                          updateNewProduct({
                            width:
                              e.target.value,
                          })
                        }
                        placeholder="120"
                      />

                    </div>


                    <div>

                      <label className="label">
                        Rate / meter *
                      </label>

                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                        }}
                      >

                        <span
                          style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'rgba(31, 41, 55, 0.4)',
                            fontSize: '14px',
                            lineHeight: 1,
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        >
                          ₹
                        </span>

                        <input
                          className="input"
                          style={{
                            paddingLeft: '40px',
                          }}
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            newProduct.ratePerMeter
                          }
                          onChange={(e) =>
                            updateNewProduct({
                              ratePerMeter:
                                e.target.value,
                            })
                          }
                          placeholder="310"
                        />

                      </div>

                    </div>


                    <div>

                      <label className="label">
                        Reorder level (m)
                      </label>

                      <input
                        className="input mt-1"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          newProduct.reorderLevel
                        }
                        onChange={(e) =>
                          updateNewProduct({
                            reorderLevel:
                              e.target.value,
                          })
                        }
                        placeholder="100"
                      />

                    </div>

                  </div>

                </div>

              )}

            </div>


            {/* =================================================
                ROLLS
            ================================================= */}

            <div>

              <div className="flex items-end justify-between gap-3 mb-2">

                <div>

                  <label className="label mb-0">
                    Rolls to receive
                  </label>

                  <p className="text-xs text-ink-700/45 mt-0.5">
                    Add every physical roll included in this inward.
                  </p>

                </div>


                <div className="text-right">

                  <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                    Rolls
                  </div>

                  <div className="font-display text-base">
                    {validLineCount}
                  </div>

                </div>

              </div>


              <div className="rounded-xl border border-ink-900/10 overflow-hidden">

                <div className="hidden md:grid grid-cols-[1.15fr_1fr_0.8fr_0.8fr_40px] gap-2 px-3 py-2 bg-ink-900/[0.025] border-b border-ink-900/10 text-[10px] font-semibold uppercase tracking-wide text-ink-700/40">

                  <span>
                    Length (m)
                  </span>

                  <span>
                    Batch
                  </span>

                  <span>
                    Rack
                  </span>

                  <span>
                    Bin
                  </span>

                  <span></span>

                </div>


                <div className="divide-y divide-ink-900/5">

                  {lines.map(
                    (
                      line,
                      index
                    ) => (

                      <div
                        key={
                          index
                        }
                        className="p-3"
                      >

                        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr_0.8fr_0.8fr_40px] gap-2 items-center">

                          <div>

                            <label className="md:hidden text-[10px] uppercase tracking-wide text-ink-700/40 mb-1 block">
                              Length (m)
                            </label>

                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="100"
                              value={
                                line.length
                              }
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  {
                                    length:
                                      e.target.value,
                                  }
                                )
                              }
                            />

                          </div>


                          <div>

                            <label className="md:hidden text-[10px] uppercase tracking-wide text-ink-700/40 mb-1 block">
                              Batch
                            </label>

                            <input
                              className="input"
                              placeholder="Batch"
                              value={
                                line.batch
                              }
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  {
                                    batch:
                                      e.target.value,
                                  }
                                )
                              }
                            />

                          </div>


                          <div>

                            <label className="md:hidden text-[10px] uppercase tracking-wide text-ink-700/40 mb-1 block">
                              Rack
                            </label>

                            <input
                              className="input"
                              placeholder="Rack"
                              value={
                                line.rack
                              }
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  {
                                    rack:
                                      e.target.value,
                                  }
                                )
                              }
                            />

                          </div>


                          <div>

                            <label className="md:hidden text-[10px] uppercase tracking-wide text-ink-700/40 mb-1 block">
                              Bin
                            </label>

                            <input
                              className="input"
                              placeholder="Bin"
                              value={
                                line.bin
                              }
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  {
                                    bin:
                                      e.target.value,
                                  }
                                )
                              }
                            />

                          </div>


                          <button
                            type="button"
                            className="btn-ghost text-signal-bad justify-self-end"
                            onClick={() =>
                              removeLine(
                                index
                              )
                            }
                            disabled={
                              lines.length ===
                              1
                            }
                            title="Remove roll"
                          >

                            <Trash2
                              size={15}
                            />

                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>


              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={
                  addLine
                }
              >

                <Plus
                  size={15}
                />

                Add another roll

              </button>

            </div>


            {/* =================================================
                NOTE
            ================================================= */}

            <div>

              <label className="label">
                Note
                <span className="text-ink-700/35">
                  {' '}
                  (optional)
                </span>
              </label>

              <input
                className="input mt-1"
                value={
                  note
                }
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
                placeholder="e.g. Against supplier invoice #4521"
              />

            </div>


            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-ink-900/10 pt-5">

              <button
                type="button"
                className="btn-secondary"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
              >
                Reset
              </button>


              <div className="flex items-center gap-3">

                <div className="text-right hidden sm:block">

                  <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                    Receiving
                  </div>

                  <div className="text-sm font-medium">
                    {validLineCount}{' '}
                    roll(s)
                    {' · '}
                    {totalMeters.toLocaleString(
                      'en-IN'
                    )}{' '}
                    m
                  </div>

                </div>


                <button
                  type="button"
                  className="btn-primary"
                  onClick={
                    submit
                  }
                  disabled={
                    saving
                  }
                >

                  <PackagePlus
                    size={16}
                  />

                  {saving
                    ? 'Receiving...'
                    : productMode ===
                        'new'
                    ? 'Create SKU & Receive'
                    : 'Receive Stock'}

                </button>

              </div>

            </div>

          </div>

        </div>


        {/* ====================================================
            RIGHT SIDEBAR
        ==================================================== */}

        <aside className="space-y-4">


          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="card p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/45">
                  Inward Summary
                </p>

                <p className="font-display text-3xl mt-1">
                  {totalMeters.toLocaleString(
                    'en-IN'
                  )}
                  <span className="text-lg ml-1 text-ink-700/40">
                    m
                  </span>
                </p>

              </div>

              <div className="w-11 h-11 rounded-xl bg-loom-600/10 text-loom-700 flex items-center justify-center">

                <PackagePlus
                  size={21}
                />

              </div>

            </div>


            <div className="grid grid-cols-2 gap-3 mt-5">

              <div className="rounded-xl bg-ink-900/[0.025] p-3">

                <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                  Rolls
                </div>

                <div className="font-display text-xl mt-1">
                  {validLineCount}
                </div>

              </div>


              <div className="rounded-xl bg-ink-900/[0.025] p-3">

                <div className="text-[10px] uppercase tracking-wide text-ink-700/40">
                  Supplier
                </div>

                <div className="font-medium text-sm mt-1 truncate">
                  {
                    suppliers.find(
                      (supplier) =>
                        Number(
                          supplier.id
                        ) ===
                        Number(
                          supplierId
                        )
                    )?.name ||
                    '—'
                  }
                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              HOW IT WORKS
          ================================================== */}

          <div className="card p-5">

            <h3 className="font-display text-base">
              How inward works
            </h3>


            <div className="space-y-4 mt-4">

              <div className="flex gap-3">

                <div className="w-7 h-7 rounded-full bg-loom-600/10 text-loom-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  1
                </div>

                <div>

                  <p className="text-sm font-medium">
                    Choose supplier
                  </p>

                  <p className="text-xs text-ink-700/50 mt-0.5">
                    Select where the stock came from.
                  </p>

                </div>

              </div>


              <div className="flex gap-3">

                <div className="w-7 h-7 rounded-full bg-loom-600/10 text-loom-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  2
                </div>

                <div>

                  <p className="text-sm font-medium">
                    Select or create SKU
                  </p>

                  <p className="text-xs text-ink-700/50 mt-0.5">
                    New SKUs can be created without leaving this page.
                  </p>

                </div>

              </div>


              <div className="flex gap-3">

                <div className="w-7 h-7 rounded-full bg-loom-600/10 text-loom-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  3
                </div>

                <div>

                  <p className="text-sm font-medium">
                    Enter physical rolls
                  </p>

                  <p className="text-xs text-ink-700/50 mt-0.5">
                    Length, batch and storage location.
                  </p>

                </div>

              </div>


              <div className="flex gap-3">

                <div className="w-7 h-7 rounded-full bg-loom-600/10 text-loom-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  4
                </div>

                <div>

                  <p className="text-sm font-medium">
                    Receive
                  </p>

                  <p className="text-xs text-ink-700/50 mt-0.5">
                    Product and rolls are saved together.
                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              RECENT INWARD
          ================================================== */}

          <div className="card overflow-hidden">

            <div className="px-4 py-3 border-b border-ink-900/10">

              <h3 className="font-display text-base">
                Recent inward
              </h3>

              <p className="text-xs text-ink-700/45 mt-0.5">
                Latest received rolls
              </p>

            </div>


            <div className="divide-y divide-ink-900/5">

              {recentInward.length === 0 && (

                <div className="p-5 text-center">

                  <p className="text-sm text-ink-700/45">
                    No inward entries yet.
                  </p>

                </div>

              )}


              {recentInward.map(
                (roll) => {

                  const product =
                    products.find(
                      (product) =>
                        Number(
                          product.id
                        ) ===
                        Number(
                          roll.productId
                        )
                    );

                  const supplier =
                    suppliers.find(
                      (supplier) =>
                        Number(
                          supplier.id
                        ) ===
                        Number(
                          roll.supplierId
                        )
                    );

                  return (

                    <div
                      key={
                        roll.id
                      }
                      className="px-4 py-3"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <span className="font-medium text-sm">
                              {product?.sku ||
                                roll.sku ||
                                '—'}
                            </span>

                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-900/5 text-ink-700/45">
                              {roll.status ||
                                'AVAILABLE'}
                            </span>

                          </div>


                          <p className="text-xs text-ink-700/50 mt-1 truncate">
                            {roll.rollId ||
                              roll.id}
                            {' · '}
                            {supplier?.name ||
                              '—'}
                          </p>


                          <p className="text-[11px] text-ink-700/40 mt-1">
                            {roll.inwardDate
                              ? formatDateTime(
                                  roll.inwardDate
                                )
                              : '—'}
                          </p>

                        </div>


                        <div className="text-right shrink-0">

                          <div className="font-display text-base text-signal-good">
                            +{Number(
                              roll.length ??
                              roll.originalLength ??
                              0
                            ).toLocaleString(
                              'en-IN'
                            )}
                            {' '}
                            m
                          </div>

                        </div>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          </div>

        </aside>

      </div>

    </div>
  );
}