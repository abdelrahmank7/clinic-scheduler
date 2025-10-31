// src/contexts/ClinicContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
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

// --- SINGLE INSTANCE MODEL ---
// This context now manages locations for the *single instance* of the app.
// It assumes all data in 'locations', 'appointments', 'clients', 'payments' belongs to this instance.
export const ClinicProvider = ({ children }) => {
  const [user] = useAuthState(auth);
  // --- STATE FOR LOCATIONS ---
  const [allLocations, setAllLocations] = useState([]); // Store all unique locations found in the database
  const [selectedLocations, setSelectedLocations] = useState([]); // e.g., ['Cairo', 'Alexandria'] or [] for all
  const [selectedLocation, setSelectedLocation] = useState(null); // Single selected location for specific views
  const [loading, setLoading] = useState(true);

  // --- LOAD ALL UNIQUE LOCATIONS FROM THE DATABASE ---
  // This runs once, ideally after user login
  useEffect(() => {
    if (!user) {
      setAllLocations([]);
      setSelectedLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query the dedicated 'locations' collection for ALL locations in this instance
    const locationsQuery = query(
      collection(db, "locations"),
      orderBy("name") // Order by name for consistent display
    );
    const locationsUnsub = onSnapshot(
      locationsQuery,
      (snapshot) => {
        const locationsData = snapshot.docs.map((doc) => ({
          id: doc.id, // Use the document ID as the location ID
          ...doc.data(),
        }));
        // Extract just the names (or IDs if you prefer) for the filtering system
        // Assuming the document has a 'name' field, otherwise use 'id'
        const locationNames = locationsData
          .map((loc) => loc.name || loc.id) // Fallback to ID if name is missing
          .sort(); // Sort names alphabetically
        setAllLocations(locationNames);
        console.log(
          "Debug: All locations loaded for this instance:",
          locationNames
        ); // Debug log
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching locations for this instance:", error);
        setAllLocations([]);
        setSelectedLocations([]); // Reset selected locations on error
        setLoading(false);
        // Optionally show an error state or toast
        // e.g., toast({ title: "Error", description: "Could not load locations.", variant: "destructive" });
      }
    );

    return () => {
      locationsUnsub(); // Unsubscribe from the locations listener
      setLoading(false); // Ensure loading is false on cleanup
    };
  }, [user]); // Only run when user changes

  // --- FUNCTIONS TO MANAGE LOCATION SELECTION (FILTERING) ---
  const updateSelectedLocations = (locationsArray) => {
    // Optional: Validate that selected locations exist in the global list?
    // For now, just set it. The query logic will handle invalid locations by showing none.
    // You could filter: const validLocations = locationsArray.filter(loc => allLocations.includes(loc));
    setSelectedLocations(locationsArray);
  };

  const toggleLocationFilter = (locationName) => {
    setSelectedLocations((prev) => {
      if (prev.includes(locationName)) {
        return prev.filter((loc) => loc !== locationName);
      } else {
        return [...prev, locationName];
      }
    });
  };

  const selectAllLocations = () => {
    setSelectedLocations(allLocations);
  };

  const clearLocationFilter = () => {
    setSelectedLocations([]);
  };

  // --- PROVIDE VALUES TO CONSUMERS ---
  return (
    <ClinicContext.Provider
      value={{
        selectedLocations, // Array of location names for filtering
        allLocations, // List of all available locations for this instance
        selectedLocation, // Single selected location for specific views
        setSelectedLocation, // Set a single selected location
        updateSelectedLocations, // Setter for location filter array
        toggleLocationFilter, // Toggle a single location in the filter
        selectAllLocations, // Select all available locations
        clearLocationFilter, // Clear the location filter
        loading, // Loading state for initial data fetch
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};
