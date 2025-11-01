// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  // Remove useLocation import - not used and causing lint error
} from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth"; // Import getIdTokenResult
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { Toaster } from "@/components/ui/toaster";
import ClientsPage from "./pages/ClientsPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import ClosedDaysPage from "./pages/ClosedDaysPage";
import { ClinicProvider } from "@/contexts/ClinicContext";
import MainLayout from "@/components/layout/MainLayout";
// --- Import the new public page ---
import PublicAppointmentRequestPage from "./pages/PublicAppointmentRequestPage"; // <-- ADD THIS IMPORT
// --- Import the existing admin page ---
import AppointmentRequestsPage from "./pages/AppointmentRequestsPage"; // <-- KEEP THIS IMPORT
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react"; // Import icons if used in NotFoundPage
// --- Import the ErrorBoundary ---
import ErrorBoundary from "@/components/ErrorBoundary"; // Import the ErrorBoundary component

// --- Create a dedicated component for the 404 page ---
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <h1 className="text-4xl font-bold text-foreground mb-4">
        404 - Page Not Found
      </h1>
      <p className="text-lg text-muted-foreground mb-6">
        Sorry, the page you are looking for does not exist.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Button
          onClick={() => navigate("/dashboard")} // Redirect to admin dashboard as fallback
          variant="default"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

// --- Determine User Type Hook (Concept) ---
// This hook checks the user's token for a 'userType' claim ('admin' or 'client')
const useUserType = () => {
  const [user] = useAuthState(auth);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkClaims = async () => {
      if (user) {
        try {
          const idTokenResult = await getIdTokenResult(user);
          // Assume the claim is named 'userType' and is set to 'admin' or 'client'
          // Default to 'admin' if no userType claim is found, assuming existing users are admins
          const type = idTokenResult.claims.userType || "admin";
          setUserType(type);
        } catch (error) {
          console.error("Error fetching user claims:", error);
          // On error, default to 'admin' to not lock out existing users, or handle differently
          setUserType("admin");
        }
      } else {
        setUserType(null);
      }
      setLoading(false);
    };

    checkClaims();
  }, [user]);

  return { userType, loading };
};

// --- Admin Protected Route Wrapper ---
const AdminProtectedRoute = ({ children }) => {
  const { userType, loading } = useUserType();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (userType !== "admin") {
    // If user is a client (if any exist) or unauthenticated, redirect them appropriately
    // For now, redirect to the public form
    return <Navigate to="/request-appointment" replace />; // <-- REDIRECT TO PUBLIC FORM
  }

  return children;
};

function AppContent() {
  return (
    // --- IMPORTANT: Removed basename. ---
    // If your app is served from a subdirectory like `/clinic-scheduler/`,
    // Vite handles this via `base` in `vite.config.js`.
    // Using basename here can cause routing issues.
    // Make sure `base` in `vite.config.js` is set correctly (usually '/clinic-scheduler/')
    <Routes>
      {/* Public Routes - Public Request Form is now the root, Admin Login is separate */}
      <Route path="/" element={<PublicAppointmentRequestPage />} />{" "}
      {/* <-- NEW ROOT ROUTE: PUBLIC FORM */}
      {/* Add the dedicated admin login route */}
      <Route path="/admin-login" element={<LoginPage />} />{" "}
      {/* <-- NEW ROUTE FOR ADMIN LOGIN */}
      {/* Keep the public request form accessible at its original path too (optional) */}
      <Route
        path="/request-appointment"
        element={<PublicAppointmentRequestPage />}
      />
      {/* Admin Routes - Wrapped in AdminProtectedRoute */}
      <Route
        element={
          // This Route element wraps the protection and layout
          <AdminProtectedRoute>
            {" "}
            {/* Protect the entire group */}
            <MainLayout /> {/* Render the layout */}
          </AdminProtectedRoute>
        }
      >
        {/* These are the child routes rendered inside MainLayout via <Outlet /> */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/closed-days" element={<ClosedDaysPage />} />
        {/* Add the new admin route here */}
        <Route
          path="/appointment-requests"
          element={<AppointmentRequestsPage />}
        />
        {/* Catch-all route for unknown paths within protected admin area */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {/* Global Catch-all for unmatched routes */}
      {/* This catches routes that don't match any of the above, including '/client-dashboard' etc. */}
      {/* Ensure this is at the very end */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function AppWrapper() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (initializing) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        Initializing...
      </div>
    );
  }

  return (
    // --- IMPORTANT: Removed basename here as well ---
    <BrowserRouter>
      <ClinicProvider>
        {/* Remove PricingProvider wrapper */}
        {/* <PricingProvider> */} {/* <-- REMOVE THIS WRAPPER */}
        {/* --- Wrap the entire application with ErrorBoundary --- */}
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <Toaster />
        {/* </PricingProvider> */} {/* <-- REMOVE THIS WRAPPER */}
      </ClinicProvider>
    </BrowserRouter>
  );
}

// Export the main App component
export default AppWrapper;
