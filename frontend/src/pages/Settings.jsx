import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  ShieldCheck,
  LockKeyhole,
  Building2,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

const API_URL =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// SETTINGS
// ============================================================

export default function Settings() {

  const {
    settings,
    setSettings,
    products,
    updateProduct,

    users,
    addUser,
    updateUser,
    removeUser,

    reseed,
    clearAll,

    currentUser,
  } = useApp();


  // ==========================================================
  // AUTHORIZATION
  // ==========================================================

  const role =
    String(
      currentUser?.role || 'STAFF'
    ).toUpperCase();

  const isAdmin =
    role === 'ADMIN';


  // ==========================================================
  // STATE
  // ==========================================================

  const [confirmReseed, setConfirmReseed] =
    useState(false);

  const [confirmClear, setConfirmClear] =
    useState(false);

  const [showUserForm, setShowUserForm] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState(null);

  const [form, setForm] =
    useState({
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
      isActive: true,
    });

  const [savingUser, setSavingUser] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [rejectingUser, setRejectingUser] =
    useState(null);

  const [rejectReason, setRejectReason] =
    useState('');

  const [processingUser, setProcessingUser] =
    useState(null);


  // ==========================================================
  // HELPERS
  // ==========================================================

  function resetMessages() {
    setError('');
    setSuccess('');
  }


  function getAuthHeaders() {

    const token =
      localStorage.getItem(
        'wincrea-auth-token'
      );

    return {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization:
              `Bearer ${token}`,
          }
        : {}),
    };
  }


  async function approvePendingUser(user) {

    if (!isAdmin) {
      return;
    }

    resetMessages();

    setProcessingUser(
      user.id
    );

    try {

      const response =
        await fetch(
          `${API_URL}/auth/users/${user.id}/approve`,
          {
            method: 'PATCH',
            headers:
              getAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Failed to approve user.'
        );
      }

      setSuccess(
        'User approved successfully.'
      );

      // Refresh user list without assuming a particular
      // AppContext implementation.
      window.location.reload();

    } catch (err) {

      setError(
        err?.message ||
        'Failed to approve user.'
      );

    } finally {

      setProcessingUser(
        null
      );
    }
  }


  function openRejectUser(user) {

    if (!isAdmin) {
      return;
    }

    resetMessages();

    setRejectingUser(
      user
    );

    setRejectReason('');
  }


  async function rejectPendingUser() {

    if (
      !isAdmin ||
      !rejectingUser
    ) {
      return;
    }

    resetMessages();

    setProcessingUser(
      rejectingUser.id
    );

    try {

      const response =
        await fetch(
          `${API_URL}/auth/users/${rejectingUser.id}/reject`,
          {
            method: 'PATCH',

            headers:
              getAuthHeaders(),

            body:
              JSON.stringify({
                reason:
                  rejectReason.trim() ||
                  null,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Failed to reject user.'
        );
      }

      setRejectingUser(
        null
      );

      setRejectReason('');

      setSuccess(
        'User rejected successfully.'
      );

      window.location.reload();

    } catch (err) {

      setError(
        err?.message ||
        'Failed to reject user.'
      );

    } finally {

      setProcessingUser(
        null
      );
    }
  }


  async function changeUserRole(
    user
  ) {

    if (!isAdmin) {
      return;
    }

    const nextRole =
      String(
        user.role || 'STAFF'
      ).toUpperCase() ===
      'ADMIN'
        ? 'STAFF'
        : 'ADMIN';

    const confirmed =
      window.confirm(
        `Change ${user.name}'s role to ${nextRole}?`
      );

    if (!confirmed) {
      return;
    }

    resetMessages();

    setProcessingUser(
      user.id
    );

    try {

      const response =
        await fetch(
          `${API_URL}/auth/users/${user.id}/role`,
          {
            method: 'PATCH',

            headers:
              getAuthHeaders(),

            body:
              JSON.stringify({
                role:
                  nextRole,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Failed to change user role.'
        );
      }

      setSuccess(
        `User role changed to ${nextRole}.`
      );

      window.location.reload();

    } catch (err) {

      setError(
        err?.message ||
        'Failed to change user role.'
      );

    } finally {

      setProcessingUser(
        null
      );
    }
  }


  // ==========================================================
  // USER FORM
  // ==========================================================

  function openCreateUser() {

    if (!isAdmin) {
      return;
    }

    resetMessages();

    setEditingUser(null);

    setForm({
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
      isActive: true,
    });

    setShowUserForm(true);
  }


  function openEditUser(user) {

    if (!isAdmin) {
      return;
    }

    resetMessages();

    setEditingUser(user);

    setForm({
      name:
        user.name || '',

      email:
        user.email || '',

      password:
        '',

      role:
        user.role || 'STAFF',

      isActive:
        Boolean(
          user.isActive
        ),
    });

    setShowUserForm(true);
  }


  async function handleSaveUser(e) {

    if (!isAdmin) {
      return;
    }

    e.preventDefault();

    resetMessages();
    setSavingUser(true);

    try {

      if (!form.name.trim()) {
        throw new Error(
          'Name is required.'
        );
      }

      if (!form.email.trim()) {
        throw new Error(
          'Email is required.'
        );
      }

      if (!editingUser) {

        if (!form.password) {
          throw new Error(
            'Password is required.'
          );
        }

        await addUser({
          name:
            form.name.trim(),

          email:
            form.email.trim(),

          password:
            form.password,

          role:
            form.role,

          isActive:
            form.isActive,
        });

        setSuccess(
          'User created successfully.'
        );

      } else {

        const payload = {

          name:
            form.name.trim(),

          email:
            form.email.trim(),

          role:
            form.role,

          isActive:
            form.isActive,
        };

        if (
          form.password.trim()
        ) {
          payload.password =
            form.password;
        }

        await updateUser(
          editingUser.id,
          payload
        );

        setSuccess(
          'User updated successfully.'
        );
      }

      setShowUserForm(false);

    } catch (err) {

      setError(
        err?.message ||
        'Failed to save user.'
      );

    } finally {

      setSavingUser(false);
    }
  }


  async function handleDeleteUser(user) {

    if (!isAdmin) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete user "${user.name}"?`
      );

    if (!confirmed) {
      return;
    }

    resetMessages();

    try {

      await removeUser(
        user.id
      );

      setSuccess(
        'User deleted successfully.'
      );

    } catch (err) {

      setError(
        err?.message ||
        'Failed to delete user.'
      );
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="space-y-8 max-w-5xl">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <div className="flex items-center gap-3">

          <div
            className={`
              h-11
              w-11
              rounded-xl
              flex
              items-center
              justify-center
              ${
                isAdmin
                  ? 'bg-loom-50 text-loom-700 border border-loom-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }
            `}
          >
            {isAdmin
              ? <ShieldCheck size={20} />
              : <LockKeyhole size={20} />}
          </div>

          <div>

            <div className="flex items-center gap-2">

              <h1 className="font-display text-2xl">
                Settings
              </h1>

              <span
                className={`
                  inline-flex
                  items-center
                  rounded-full
                  px-2.5
                  py-1
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.1em]
                  ${
                    isAdmin
                      ? 'bg-loom-50 text-loom-700 border border-loom-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }
                `}
              >
                {isAdmin
                  ? 'ADMIN'
                  : 'STAFF'}
              </span>

            </div>

            <p className="text-sm text-ink-700/60 mt-1">

              {isAdmin
                ? 'Manage users, company settings, alerts, and inventory thresholds.'
                : 'View your account access and company information.'}

            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          STAFF ACCESS BANNER
      ====================================================== */}

      {!isAdmin && (

        <section
          className="
            rounded-2xl
            border
            border-amber-200
            bg-gradient-to-br
            from-amber-50
            via-white
            to-orange-50/30
            p-5
          "
        >

          <div className="flex items-start gap-3">

            <div
              className="
                h-10
                w-10
                rounded-xl
                bg-amber-100
                text-amber-700
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <LockKeyhole size={18} />
            </div>

            <div>

              <p className="font-display text-base">
                Limited access
              </p>

              <p className="text-sm text-ink-700/55 mt-1">
                Staff accounts cannot manage users,
                reorder levels, company settings,
                or danger-zone operations.
              </p>

            </div>

          </div>

        </section>

      )}


      {/* ======================================================
          COMPANY
      ====================================================== */}

      <section className="card p-5 space-y-5">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-display text-lg">
              Company
            </h2>

            <p className="text-xs text-ink-700/50 mt-1">
              {isAdmin
                ? 'Manage the company identity used across WINCREA.'
                : 'Company information is read-only for Staff.'}
            </p>

          </div>

          {!isAdmin && (

            <span
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-slate-200
                bg-slate-50
                px-2.5
                py-1
                text-[10px]
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              <LockKeyhole size={12} />
              READ ONLY
            </span>

          )}

        </div>


        <div className="flex items-center gap-5">

          <div
            className="
              w-24
              h-24
              rounded-xl
              border
              border-ink-900/10
              flex
              items-center
              justify-center
              bg-white
              overflow-hidden
            "
          >

            <img
              src="/window-creators-logo.png"
              alt="Window Creators"
              className="max-w-full max-h-full object-contain p-2"
            />

          </div>


          <div>

            <div className="font-display text-xl">
              Window Creators
            </div>

            <div className="text-sm text-ink-700/60">
              WINCREA
            </div>

          </div>

        </div>


        <div>

          <label className="label">
            Company Name
          </label>

          <input
            className="input"
            value={
              settings.companyName
            }
            disabled={!isAdmin}
            readOnly={!isAdmin}
            onChange={(e) => {

              if (!isAdmin) {
                return;
              }

              setSettings({
                ...settings,
                companyName:
                  e.target.value,
              });

            }}
          />

        </div>

      </section>


      {/* ======================================================
          ADMIN ONLY
      ====================================================== */}

      {isAdmin && (

        <>

          {/* ==================================================
              USERS
          ================================================== */}

          <section className="card p-5 space-y-5">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-display text-lg">
                  Users
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  Manage registrations, approvals, roles, and ERP users.
                </p>

              </div>


              <button
                className="
                  btn-primary
                  flex
                  items-center
                  gap-2
                "
                onClick={
                  openCreateUser
                }
              >
                <Plus size={16} />
                Add User
              </button>

            </div>


            {error && (

              <div className="p-3 rounded-lg bg-signal-bad/10 text-signal-bad text-sm">
                {error}
              </div>

            )}


            {success && (

              <div className="p-3 rounded-lg bg-signal-good/10 text-signal-good text-sm">
                {success}
              </div>

            )}


            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b border-ink-900/10 text-left">

                    <th className="py-3 pr-4">
                      User
                    </th>

                    <th className="py-3 pr-4">
                      Email
                    </th>

                    <th className="py-3 pr-4">
                      Role
                    </th>

                    <th className="py-3 pr-4">
                      Status
                    </th>

                    <th className="py-3 text-right">
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {(users || []).map(
                    (user) => (

                      <tr
                        key={user.id}
                        className="border-b border-ink-900/5"
                      >

                        <td className="py-3 pr-4">
                          <div className="font-medium">
                            {user.name}
                          </div>
                        </td>


                        <td className="py-3 pr-4 text-ink-700/60">
                          {user.email}
                        </td>


                        <td className="py-3 pr-4">

                          <span className="px-2 py-1 rounded-md text-xs bg-ink-900/5">
                            {String(
                              user.role || 'STAFF'
                            ).toUpperCase()}
                          </span>

                        </td>


                        <td className="py-3 pr-4">

                          {String(
                            user.approvalStatus ??
                            user.approval_status ??
                            ''
                          ).toUpperCase() === 'PENDING' ? (

                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-full
                                border
                                border-amber-200
                                bg-amber-50
                                px-2.5
                                py-1
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-wide
                                text-amber-700
                              "
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pending Approval
                            </span>

                          ) : String(
                            user.approvalStatus ??
                            user.approval_status ??
                            ''
                          ).toUpperCase() === 'REJECTED' ? (

                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-full
                                border
                                border-signal-bad/20
                                bg-signal-bad/10
                                px-2.5
                                py-1
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-wide
                                text-signal-bad
                              "
                            >
                              Rejected
                            </span>

                          ) : user.isActive ? (

                            <span className="inline-flex items-center gap-1 text-signal-good">
                              <UserCheck size={14} />
                              Active
                            </span>

                          ) : (

                            <span className="inline-flex items-center gap-1 text-ink-700/40">
                              <UserX size={14} />
                              Inactive
                            </span>

                          )}

                        </td>


                        <td className="py-3">

                          <div className="flex justify-end gap-2 flex-wrap">

                            {String(
                              user.approvalStatus ??
                              user.approval_status ??
                              ''
                            ).toUpperCase() === 'PENDING' ? (

                              <>

                                <button
                                  className="
                                    btn-primary
                                    text-xs
                                    px-3
                                    py-1.5
                                  "
                                  onClick={() =>
                                    approvePendingUser(
                                      user
                                    )
                                  }
                                  disabled={
                                    processingUser ===
                                    user.id
                                  }
                                >
                                  {processingUser === user.id
                                    ? 'Processing...'
                                    : 'Approve'}
                                </button>

                                <button
                                  className="
                                    btn-secondary
                                    text-xs
                                    px-3
                                    py-1.5
                                  "
                                  onClick={() =>
                                    openRejectUser(
                                      user
                                    )
                                  }
                                  disabled={
                                    processingUser ===
                                    user.id
                                  }
                                >
                                  Reject
                                </button>

                              </>

                            ) : (

                              <>

                                <button
                                  className="btn-ghost"
                                  onClick={() =>
                                    openEditUser(
                                      user
                                    )
                                  }
                                  title="Edit user"
                                >
                                  <Pencil size={15} />
                                </button>

                                <button
                                  className="btn-ghost"
                                  onClick={() =>
                                    changeUserRole(
                                      user
                                    )
                                  }
                                  title={
                                    String(
                                      user.role || ''
                                    ).toUpperCase() ===
                                    'ADMIN'
                                      ? 'Demote to Staff'
                                      : 'Promote to Admin'
                                  }
                                  disabled={
                                    processingUser ===
                                    user.id
                                  }
                                >
                                  <ShieldCheck size={15} />
                                </button>

                                <button
                                  className="btn-ghost text-signal-bad"
                                  onClick={() =>
                                    handleDeleteUser(
                                      user
                                    )
                                  }
                                  title="Delete user"
                                >
                                  <Trash2 size={15} />
                                </button>

                              </>

                            )}

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>


          {/* ==================================================
              USER FORM
          ================================================== */}

          {showUserForm && (

            <section className="card p-5 space-y-5">

              <div className="flex items-center justify-between">

                <h2 className="font-display text-lg">

                  {editingUser
                    ? 'Edit User'
                    : 'Add User'}

                </h2>

                <button
                  className="btn-ghost"
                  onClick={() =>
                    setShowUserForm(false)
                  }
                  disabled={
                    savingUser
                  }
                >
                  Cancel
                </button>

              </div>


              <form
                onSubmit={
                  handleSaveUser
                }
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >

                <Field label="Name">

                  <input
                    className="input"
                    value={
                      form.name
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name:
                          e.target.value,
                      })
                    }
                  />

                </Field>


                <Field label="Email">

                  <input
                    type="email"
                    className="input"
                    value={
                      form.email
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email:
                          e.target.value,
                      })
                    }
                  />

                </Field>


                <Field label="Password">

                  <input
                    type="password"
                    className="input"
                    placeholder={
                      editingUser
                        ? 'Leave blank to keep current password'
                        : 'Minimum 6 characters'
                    }
                    value={
                      form.password
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password:
                          e.target.value,
                      })
                    }
                  />

                </Field>


                <Field label="Role">

                  <select
                    className="input"
                    value={
                      form.role
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role:
                          e.target.value,
                      })
                    }
                  >

                    <option value="STAFF">
                      STAFF
                    </option>

                    <option value="ADMIN">
                      ADMIN
                    </option>

                  </select>

                </Field>


                <div className="md:col-span-2">

                  <label className="flex items-center gap-2 text-sm">

                    <input
                      type="checkbox"
                      checked={
                        form.isActive
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          isActive:
                            e.target.checked,
                        })
                      }
                    />

                    Active user

                  </label>

                </div>


                <div className="md:col-span-2 flex justify-end">

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      savingUser
                    }
                  >

                    {savingUser
                      ? 'Saving...'
                      : editingUser
                        ? 'Update User'
                        : 'Create User'}

                  </button>

                </div>

              </form>

            </section>

          )}


          {/* ==================================================
              GENERAL
          ================================================== */}

          <section className="card p-5 space-y-4">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-display text-lg">
                  General
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  Dashboard and alert preferences.
                </p>

              </div>

              <ShieldCheck
                size={18}
                className="text-loom-600"
              />

            </div>


            <label className="flex items-center gap-2 text-sm">

              <input
                type="checkbox"
                className="accent-loom-600"
                checked={
                  settings.lowStockAlerts
                }
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lowStockAlerts:
                      e.target.checked,
                  })
                }
              />

              Show low-stock alerts on dashboard

            </label>

          </section>


          {/* ==================================================
              REORDER LEVELS
          ================================================== */}

          <section className="card p-5 space-y-3">

            <div>

              <h2 className="font-display text-lg">
                Reorder levels
              </h2>

              <p className="text-xs text-ink-700/50 mt-1">
                Update minimum stock thresholds per product.
              </p>

            </div>


            <div className="space-y-2 max-h-72 overflow-y-auto">

              {products.map(
                (product) => (

                  <div
                    key={product.id}
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      text-sm
                      border-b
                      border-ink-900/5
                      pb-2
                    "
                  >

                    <span className="font-medium w-32">
                      {product.sku}
                    </span>

                    <input
                      type="number"
                      className="input w-32"
                      value={
                        product.reorderLevel
                      }
                      onChange={(e) =>
                        updateProduct(
                          product.id,
                          {
                            reorderLevel:
                              Number(
                                e.target.value
                              ),
                          }
                        )
                      }
                    />

                    <span className="text-ink-700/50 text-xs">
                      meters
                    </span>

                  </div>

                )
              )}

            </div>

          </section>


          {/* ==================================================
              DANGER ZONE
          ================================================== */}

          <section className="card p-5 space-y-4 border-signal-bad/20">

            <div className="flex items-center gap-2">

              <AlertTriangle
                size={16}
                className="text-signal-bad"
              />

              <h2 className="font-display text-lg">
                Danger zone
              </h2>

            </div>


            <p className="text-xs text-ink-700/50">
              These actions affect locally stored browser data.
              They cannot be undone.
            </p>


            <div className="flex flex-wrap gap-3">

              {!confirmReseed ? (

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setConfirmReseed(true)
                  }
                >
                  Reset &amp; Reseed
                  with sample data
                </button>

              ) : (

                <div className="flex gap-2 items-center flex-wrap">

                  <span className="text-sm">
                    Replace local data with fresh sample data?
                  </span>

                  <button
                    className="btn-danger"
                    onClick={() => {

                      reseed();

                      setConfirmReseed(
                        false
                      );

                    }}
                  >
                    Confirm
                  </button>

                  <button
                    className="btn-ghost"
                    onClick={() =>
                      setConfirmReseed(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              )}

            </div>


            <div className="flex flex-wrap gap-3">

              {!confirmClear ? (

                <button
                  className="btn-danger"
                  onClick={() =>
                    setConfirmClear(true)
                  }
                >
                  Clear all data
                </button>

              ) : (

                <div className="flex gap-2 items-center flex-wrap">

                  <span className="text-sm">
                    Delete local browser data?
                  </span>

                  <button
                    className="btn-danger"
                    onClick={() => {

                      clearAll();

                      setConfirmClear(
                        false
                      );

                    }}
                  >
                    Confirm
                  </button>

                  <button
                    className="btn-ghost"
                    onClick={() =>
                      setConfirmClear(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              )}

            </div>

          </section>

        </>

      )}


      {/* ======================================================
          REJECT USER MODAL
      ====================================================== */}

      {rejectingUser && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/30
            backdrop-blur-sm
            px-4
          "
        >

          <div
            className="
              w-full
              max-w-md
              rounded-2xl
              bg-white
              border
              border-ink-900/10
              shadow-2xl
              p-6
            "
          >

            <div className="flex items-start gap-3">

              <div
                className="
                  h-10
                  w-10
                  rounded-xl
                  bg-signal-bad/10
                  text-signal-bad
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <UserX size={18} />
              </div>

              <div>

                <h3 className="font-display text-lg">
                  Reject registration
                </h3>

                <p className="text-sm text-ink-700/55 mt-1">
                  Reject {rejectingUser.name}'s request?
                  An email will be sent to {rejectingUser.email}.
                </p>

              </div>

            </div>


            <div className="mt-5">

              <label className="label">
                Reason (optional)
              </label>

              <textarea
                className="input min-h-24 resize-none"
                value={rejectReason}
                onChange={(e) =>
                  setRejectReason(
                    e.target.value
                  )
                }
                placeholder="Add a reason for the rejection..."
              />

            </div>


            <div className="flex justify-end gap-2 mt-5">

              <button
                className="btn-secondary"
                onClick={() => {
                  setRejectingUser(null);
                  setRejectReason('');
                }}
                disabled={
                  processingUser ===
                  rejectingUser.id
                }
              >
                Cancel
              </button>

              <button
                className="btn-danger"
                onClick={
                  rejectPendingUser
                }
                disabled={
                  processingUser ===
                  rejectingUser.id
                }
              >
                {processingUser ===
                rejectingUser.id
                  ? 'Rejecting...'
                  : 'Reject User'}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          STAFF ACCOUNT INFO
      ====================================================== */}

      {!isAdmin && (

        <section className="card p-5">

          <div className="flex items-center gap-3">

            <div
              className="
                h-10
                w-10
                rounded-xl
                bg-slate-100
                border
                border-slate-200
                text-slate-600
                flex
                items-center
                justify-center
              "
            >
              <UserCheck size={18} />
            </div>

            <div>

              <p className="font-medium">
                {currentUser?.name || 'Staff User'}
              </p>

              <p className="text-xs text-ink-700/50 mt-0.5">
                {currentUser?.email || '—'}
              </p>

            </div>

          </div>


          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">

            <span className="text-ink-700/50">
              Access level:
            </span>

            <span
              className="
                rounded-full
                border
                border-slate-200
                bg-slate-100
                px-2
                py-0.5
                font-semibold
                uppercase
                tracking-wide
                text-slate-600
              "
            >
              STAFF
            </span>

            <span className="text-ink-700/40">
              Administrative controls are hidden.
            </span>

          </div>

        </section>

      )}

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
