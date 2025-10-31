// src/contexts/PricingContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useClinic } from "./ClinicContext";

const PricingContext = createContext(null);

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
};

export const PricingProvider = ({ children }) => {
  const { selectedClinic } = useClinic();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedClinic) {
      setPricing(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const pricingDoc = doc(db, "settings", `pricing_${selectedClinic}`);
    const unsubscribe = onSnapshot(pricingDoc, (doc) => {
      if (doc.exists()) {
        setPricing(doc.data());
      } else {
        // Default pricing
        setPricing({
          singleSession: 100,
          packages: [
            { id: "basic", sessions: 4, price: 350, name: "Basic Package" },
            { id: "premium", sessions: 8, price: 600, name: "Premium Package" },
          ],
        });
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      setLoading(false);
    };
  }, [selectedClinic]);

  return (
    <PricingContext.Provider value={{ pricing, loading }}>
      {children}
    </PricingContext.Provider>
  );
};
