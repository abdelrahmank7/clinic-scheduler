// src/hooks/useClients.js (or update existing clients hook)
import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";

export const useClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedLocation } = useClinic();

  useEffect(() => {
    let clientsQuery;
    if (selectedLocation) {
      // Filter by location
      clientsQuery = query(
        collection(db, "clients"),
        where("location", "==", selectedLocation),
        orderBy("name", "asc")
      );
    } else {
      // Get all clients (no location filter)
      clientsQuery = query(collection(db, "clients"), orderBy("name", "asc"));
    }

    const unsubscribe = onSnapshot(
      clientsQuery,
      (querySnapshot) => {
        const clientsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching clients: ", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedLocation]); // Only re-run when location selection changes

  const updateClient = async (clientId, clientData) => {
    try {
      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, {
        ...clientData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating client: ", err);
      throw err;
    }
  };

  return { clients, loading, error, updateClient };
};
