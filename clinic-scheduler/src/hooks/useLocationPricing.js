// src/hooks/useLocationPricing.js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/**
 * Custom hook to fetch pricing settings for a specific location.
 * @param {string} locationName - The name or ID of the location.
 * @returns {Object} - Contains pricing data, loading state, and error state.
 */
export const useLocationPricing = (locationName) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!locationName) {
      setPricing(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Construct document path using location name/ID
    // Example: settings/pricing_CairoBranch or settings/pricing_cairo
    const pricingDocRef = doc(db, "settings", `pricing_${locationName}`);

    const unsubscribe = onSnapshot(
      pricingDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setPricing(docSnap.data());
        } else {
          // Default pricing if no document exists for this location
          setPricing({
            packages: [
              {
                id: "basic_loc",
                sessions: 4,
                price: 300,
                name: "Basic Local Package",
              },
              {
                id: "premium_loc",
                sessions: 8,
                price: 550,
                name: "Premium Local Package",
              },
            ],
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error(
          `Error fetching pricing for location ${locationName}:`,
          err
        );
        setError(err);
        setPricing(null); // Or a default/error state
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or location change
    return () => {
      unsubscribe();
    };
  }, [locationName]); // Re-run effect if locationName changes

  const saveLocationPricing = async (pricingData) => {
    if (!locationName) {
      throw new Error("Location name is required to save pricing");
    }

    const pricingDocRef = doc(db, "settings", `pricing_${locationName}`);
    try {
      await setDoc(pricingDocRef, pricingData, { merge: true });
      return true;
    } catch (err) {
      console.error(`Error saving pricing for location ${locationName}:`, err);
      throw err;
    }
  };

  return { pricing, loading, error, saveLocationPricing };
};
