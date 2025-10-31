// src/contexts/ClientSessionContext.jsx (NEW FILE)
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase"; // Import auth to listen for admin logouts
import { useAuthState } from "react-firebase-hooks/auth";

const ClientSessionContext = createContext();

export const useClientSession = () => {
  const context = useContext(ClientSessionContext);
  if (!context) {
    throw new Error(
      "useClientSession must be used within a ClientSessionProvider"
    );
  }
  return context;
};

export const ClientSessionProvider = ({ children }) => {
  const [clientSession, setClientSession] = useState(null); // { id, name, phoneNumber }
  const [loading, setLoading] = useState(true);
  const [adminUser] = useAuthState(auth); // Listen for admin auth state

  // Check for stored session on initial load and admin login state
  useEffect(() => {
    const storedSession = localStorage.getItem("clientSession");
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        setClientSession(parsedSession);
      } catch (e) {
        console.error("Failed to parse client session from localStorage:", e);
        localStorage.removeItem("clientSession"); // Clear invalid session
      }
    }
    setLoading(false);
  }, []);

  // Clear client session if admin logs in
  useEffect(() => {
    if (adminUser && clientSession) {
      console.log("Admin logged in, clearing client session.");
      setClientSession(null);
      localStorage.removeItem("clientSession");
    }
  }, [adminUser, clientSession]);

  const loginClient = (clientData) => {
    // Store client session data
    setClientSession(clientData);
    localStorage.setItem("clientSession", JSON.stringify(clientData));
  };

  const logoutClient = () => {
    setClientSession(null);
    localStorage.removeItem("clientSession");
  };

  // The context value includes session data, loading state, and login/logout functions
  const value = {
    clientSession,
    loading,
    loginClient,
    logoutClient,
  };

  return (
    <ClientSessionProvider value={value}>{children}</ClientSessionProvider>
  );
};
