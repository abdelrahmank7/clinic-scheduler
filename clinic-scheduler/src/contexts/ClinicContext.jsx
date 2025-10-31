// clinic-scheduler/src/contexts/ClinicContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

const ClinicContext = createContext();

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
};

export const ClinicProvider = ({ children }) => {
  const [user] = useAuthState(auth);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user's clinic preference
  useEffect(() => {
    if (!user) return;

    const userPrefDoc = doc(db, "user_preferences", user.uid);
    const unsubscribe = onSnapshot(userPrefDoc, (doc) => {
      if (doc.exists()) {
        setSelectedClinic(doc.data().selectedClinic);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Update user's clinic preference
  const updateClinicPreference = async (clinicId) => {
    if (!user) return;

    try {
      await setDoc(doc(db, "user_preferences", user.uid), {
        selectedClinic: clinicId,
        lastUpdated: new Date(),
      });
      setSelectedClinic(clinicId);
    } catch (error) {
      console.error("Error updating clinic preference:", error);
    }
  };

  return (
    <ClinicContext.Provider
      value={{
        selectedClinic,
        clinics,
        setClinics,
        updateClinicPreference,
        loading,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};
