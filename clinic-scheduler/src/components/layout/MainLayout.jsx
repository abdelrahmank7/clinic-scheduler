// src/components/layout/MainLayout.jsx
import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
// --- Import the ErrorBoundary ---
import ErrorBoundary from "@/components/ErrorBoundary"; // Import the ErrorBoundary component

const MainLayout = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar - Fixed position */}
      <Sidebar
        className="fixed left-0 top-0 h-full z-30"
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Spacer to prevent content overlap on desktop */}
      {!sidebarCollapsed && window.innerWidth >= 768 && (
        <div className="w-64" />
      )}
      {sidebarCollapsed && window.innerWidth >= 768 && <div className="w-16" />}

      {/* Main content area */}
      <div className="flex-1 transition-all duration-300 ease-in-out pt-0 w-full">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm p-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoHome}
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </div>
          <div>{/* Placeholder for user info, clinic selector, etc. */}</div>
        </header>

        {/* Page content - Wrapped with ErrorBoundary */}
        <main className="p-0 md:p-1">
          {/* --- IMPORTANT: Wrap the Outlet with ErrorBoundary --- */}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          {/* --- END WRAP --- */}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
