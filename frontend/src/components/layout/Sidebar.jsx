import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  SlidersHorizontal,
  Users,
  Truck,
  LineChart,
  ScrollText,
  Settings as SettingsIcon,
  LogOut,
  X,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';


const NAV = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/products',
    label: 'Product Master',
    icon: Package,
  },
  {
    to: '/rolls',
    label: 'Roll Inventory',
    icon: Layers,
  },
  {
    to: '/inward',
    label: 'Inward',
    icon: ArrowDownToLine,
  },
  {
    to: '/outward',
    label: 'Outward',
    icon: ArrowUpFromLine,
  },
  {
    to: '/returns',
    label: 'Returns',
    icon: RotateCcw,
  },
  {
    to: '/adjustments',
    label: 'Adjustments',
    icon: SlidersHorizontal,
  },
  {
    to: '/customers',
    label: 'Customers',
    icon: Users,
  },
  {
    to: '/suppliers',
    label: 'Suppliers & PIs',
    icon: Truck,
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: LineChart,
  },
  {
    to: '/ledger',
    label: 'Ledger',
    icon: ScrollText,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
  },
];


export default function Sidebar() {

  const {
    currentUser,
    logout,
  } = useApp();

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);


  function openLogoutModal() {
    setShowLogoutModal(true);
  }


  function closeLogoutModal() {
    setShowLogoutModal(false);
  }


  function handleLogout() {

    logout();

    setShowLogoutModal(false);
  }


  return (
    <>
      <aside className="w-60 shrink-0 bg-ink-950 text-canvas/90 flex flex-col h-screen sticky top-0">

        {/* ====================================================
            BRANDING
        ==================================================== */}

        <div className="px-5 py-5 border-b border-canvas/10">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center overflow-hidden shrink-0">

              <img
                src="/window-creators-logo.png"
                alt="Window Creators"
                className="w-full h-full object-contain p-1"
              />

            </div>

            <div className="min-w-0">

              <p className="font-display text-lg text-canvas leading-tight">
                Window Creators
              </p>

              <p className="text-[11px] uppercase tracking-wider text-loom-300/80 mt-0.5">
                WINCREA ERP
              </p>

            </div>

          </div>

        </div>


        {/* ====================================================
            NAVIGATION
        ==================================================== */}

        <nav className="flex-1 overflow-y-auto py-3 px-2">

          {NAV.map(
            ({
              to,
              label,
              icon: Icon,
              end,
            }) => (

              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm mb-0.5 transition-colors ${
                    isActive
                      ? 'bg-loom-600/20 text-loom-300'
                      : 'text-canvas/70 hover:bg-canvas/5 hover:text-canvas'
                  }`
                }
              >

                <Icon size={16} />

                <span>
                  {label}
                </span>

              </NavLink>

            )
          )}

        </nav>


        {/* ====================================================
            CURRENT USER
        ==================================================== */}

        <div className="px-4 py-4 border-t border-canvas/10">

          <div className="flex items-center gap-3 mb-3">

            <div className="w-9 h-9 rounded-full bg-loom-600/20 text-loom-300 flex items-center justify-center text-sm font-semibold shrink-0">

              {currentUser?.name
                ? currentUser.name
                    .charAt(0)
                    .toUpperCase()
                : 'U'}

            </div>


            <div className="min-w-0">

              <div className="text-sm text-canvas truncate">

                {currentUser?.name ||
                  'User'}

              </div>

              <div className="text-[11px] text-canvas/40 uppercase tracking-wide">

                {currentUser?.role ||
                  'STAFF'}

              </div>

            </div>

          </div>


          {/* ==================================================
              LOGOUT BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={openLogoutModal}
            className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              px-3
              py-2
              rounded-sm
              text-sm
              text-canvas/60
              border
              border-canvas/10
              hover:bg-signal-bad/10
              hover:text-signal-bad
              hover:border-signal-bad/20
              transition-colors
            "
          >

            <LogOut size={15} />

            Logout

          </button>

        </div>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="px-5 py-3 border-t border-canvas/10 text-[10px] text-canvas/30">

          Window Creators · WINCREA ERP

        </div>

      </aside>


      {/* ======================================================
          LOGOUT MODAL
      ====================================================== */}

      {showLogoutModal && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            px-4
          "
        >

          {/* Backdrop */}

          <div
            className="
              absolute
              inset-0
              bg-ink-950/60
              backdrop-blur-sm
            "
            onClick={closeLogoutModal}
          />


          {/* Modal */}

          <div
            className="
              relative
              w-full
              max-w-sm
              rounded-xl
              bg-canvas
              shadow-2xl
              border
              border-ink-900/10
              overflow-hidden
            "
          >

            {/* Header */}

            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-900/10">

              <h2 className="font-display text-lg">
                Log out?
              </h2>

              <button
                type="button"
                onClick={closeLogoutModal}
                className="
                  p-1.5
                  rounded-md
                  text-ink-700/50
                  hover:bg-ink-900/5
                  hover:text-ink-900
                "
              >

                <X size={18} />

              </button>

            </div>


            {/* Content */}

            <div className="px-5 py-5">

              <div className="flex items-center gap-3 mb-4">

                <div className="w-11 h-11 rounded-full bg-signal-bad/10 flex items-center justify-center text-signal-bad">

                  <LogOut size={20} />

                </div>


                <div>

                  <p className="text-sm font-medium">

                    {currentUser?.name ||
                      'User'}

                  </p>

                  <p className="text-xs text-ink-700/50">

                    {currentUser?.email ||
                      ''}

                  </p>

                </div>

              </div>


              <p className="text-sm text-ink-700/70">

                Are you sure you want to log out of
                the Window Creators ERP?

              </p>

            </div>


            {/* Actions */}

            <div className="px-5 py-4 bg-ink-900/[0.02] border-t border-ink-900/10 flex justify-end gap-2">

              <button
                type="button"
                onClick={closeLogoutModal}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-danger flex items-center gap-2"
              >

                <LogOut size={15} />

                Logout

              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
}