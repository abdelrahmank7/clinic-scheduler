// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { Toaster } from "@/components/ui/toaster";
import ClientsPage from "./pages/ClientsPage";
import IndexTestPage from "./pages/IndexTestPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { PricingProvider } from "@/contexts/PricingContext";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        Loading authentication...
      </div>
    );
  }

  return (
    <BrowserRouter basename="/clinic-scheduler/">
      <ClinicProvider>
        <PricingProvider>
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
            />
            <Route
              path="/dashboard"
              element={user ? <DashboardPage /> : <Navigate to="/" />}
            />
            <Route
              path="/clients"
              element={user ? <ClientsPage /> : <Navigate to="/" />}
            />
            <Route
              path="/payments"
              element={user ? <PaymentsPage /> : <Navigate to="/" />}
            />
            <Route
              path="/settings"
              element={user ? <SettingsPage /> : <Navigate to="/" />}
            />
            <Route
              path="/test-index"
              element={user ? <IndexTestPage /> : <Navigate to="/" />}
            />
          </Routes>
          <Toaster />
        </PricingProvider>
      </ClinicProvider>
    </BrowserRouter>
  );
}

export default App;
