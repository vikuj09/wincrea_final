import React from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Layout from './components/layout/Layout';
import { useApp } from './context/AppContext';

import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import ProductMaster from './pages/ProductMaster';
import RollInventory from './pages/RollInventory';
import Inward from './pages/Inward';
import Outward from './pages/Outward';
import Returns from './pages/Returns';
import Adjustments from './pages/Adjustments';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Analytics from './pages/Analytics';
import Ledger from './pages/Ledger';
import Settings from './pages/Settings';

import SharedProductMaster from './pages/SharedProductMaster';
import SharedRollInventory from './pages/SharedRollInventory';


// ============================================================
// PROTECTED ERP ROUTES
// ============================================================

function ProtectedRoutes() {

  const {
    isAuthenticated,
  } = useApp();


  if (!isAuthenticated) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  return (

    <Routes>

      <Route element={<Layout />}>

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/products"
          element={<ProductMaster />}
        />

        <Route
          path="/rolls"
          element={<RollInventory />}
        />

        <Route
          path="/inward"
          element={<Inward />}
        />

        <Route
          path="/outward"
          element={<Outward />}
        />

        <Route
          path="/returns"
          element={<Returns />}
        />

        <Route
          path="/adjustments"
          element={<Adjustments />}
        />

        <Route
          path="/customers"
          element={<Customers />}
        />

        <Route
          path="/suppliers"
          element={<Suppliers />}
        />

        <Route
          path="/analytics"
          element={<Analytics />}
        />

        <Route
          path="/ledger"
          element={<Ledger />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

      </Route>

    </Routes>

  );
}


// ============================================================
// APP
// ============================================================

export default function App() {

  const {
    authLoading,
    isAuthenticated,
  } = useApp();


  // ----------------------------------------------------------
  // CHECKING EXISTING LOGIN SESSION
  // ----------------------------------------------------------

  if (authLoading) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-canvas">

        <div className="text-center">

          <p className="font-display text-lg text-ink-700/60">
            Loading Window Creators ERP…
          </p>

        </div>

      </div>

    );

  }


  return (

    <Routes>

      {/* ======================================================
          LOGIN
      ====================================================== */}

      <Route
        path="/login"
        element={
          isAuthenticated
            ? (
              <Navigate
                to="/"
                replace
              />
            )
            : (
              <Login />
            )
        }
      />


      {/* ======================================================
          PUBLIC SHARED PRODUCT MASTER
      ====================================================== */}

      <Route
        path="/shared/products/:token"
        element={
          <SharedProductMaster />
        }
      />


      {/* ======================================================
          PUBLIC SHARED ROLL INVENTORY
      ====================================================== */}

      <Route
        path="/shared/rolls/:token"
        element={
          <SharedRollInventory />
        }
      />


      {/* ======================================================
          PROTECTED ERP
      ====================================================== */}

      <Route
        path="/*"
        element={
          <ProtectedRoutes />
        }
      />

    </Routes>

  );
}