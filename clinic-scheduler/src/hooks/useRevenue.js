// src/hooks/useRevenue.js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
// Add this import for date functions:
import { startOfMonth, endOfMonth } from "date-fns"; // Removed 'format' if unused

/**
 * Custom hook to fetch and manage revenue data for the single clinic instance.
 * Filters by selectedLocations if provided.
 *
 * @param {Array<string>} [selectedLocations=[]] - Optional array of location names to filter by.
 * @param {Object} dateRange - Object with `start` and `end` Date properties.
 * @returns {Object} - Contains revenueData object, loading state, and error state.
 */
export function useRevenue(selectedLocations = [], dateRange) {
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    recentPayments: [],
    revenueByMethod: {},
    revenueByClient: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null); // Clear previous errors before fetching

    // --- FETCH MONTHLY REVENUE (Payments Collection) ---
    const startOfMonthDate = dateRange?.start || startOfMonth(new Date());
    const endOfMonthDate = dateRange?.end || endOfMonth(new Date());

    // --- BUILD BASE PAYMENTS QUERY (NO CLINIC FILTER) ---
    let paymentsQuery = query(
      collection(db, "payments"),
      where("sessionDate", ">=", startOfMonthDate),
      where("sessionDate", "<=", endOfMonthDate),
      orderBy("sessionDate", "desc") // Order by sessionDate for consistency
    );

    // --- ADD LOCATION FILTER TO PAYMENTS QUERY IF SPECIFIED ---
    if (selectedLocations.length > 0) {
      paymentsQuery = query(
        paymentsQuery,
        where("location", "in", selectedLocations) // Apply location filter
      );
    }
    // If selectedLocations is empty, the query fetches all locations for the instance

    const unsubscribePayments = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const payments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : data.createdAt
                ? new Date(data.createdAt)
                : new Date(),
            sessionDate:
              data.sessionDate instanceof Timestamp
                ? data.sessionDate.toDate()
                : data.sessionDate
                ? new Date(data.sessionDate)
                : new Date(),
          };
        });

        const totalRevenue = payments.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        );

        const revenueByMethod = payments.reduce((acc, payment) => {
          const method = payment.paymentMethod || "unknown";
          acc[method] = (acc[method] || 0) + (Number(payment.amount) || 0);
          return acc;
        }, {});

        const revenueByClient = payments.reduce((acc, payment) => {
          const client = payment.clientName || "Unknown Client";
          acc[client] = (acc[client] || 0) + (Number(payment.amount) || 0);
          return acc;
        }, {});

        // Replace entire object to keep identity stable
        setRevenueData({
          totalRevenue,
          monthlyRevenue: totalRevenue,
          pendingPayments: 0, // will be updated by appointments listener
          recentPayments: payments.slice(0, 5),
          revenueByMethod,
          revenueByClient,
        });
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching payments for revenue: ", err);
        setError("Failed to load payments.");
        setLoading(false);
      }
    );

    // --- FETCH PENDING PAYMENTS (Appointments Collection) - NO CLINIC FILTER ---
    let appointmentsQuery = query(
      collection(db, "appointments"),
      where("paymentStatus", "in", ["unpaid", "partial"]),
      orderBy("start", "desc") // Order by start date
    );

    // --- ADD LOCATION FILTER TO APPOINTMENTS QUERY IF SPECIFIED ---
    if (selectedLocations.length > 0) {
      appointmentsQuery = query(
        appointmentsQuery,
        where("location", "in", selectedLocations) // Apply location filter
      );
    }
    // If selectedLocations is empty, the query fetches all locations for the instance

    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        setRevenueData((prev) => ({
          ...prev,
          pendingPayments: snapshot.docs.length,
        }));
        // Do not modify loading here; payments listener controls it
      },
      (err) => {
        console.error("Error fetching pending appointments for revenue: ", err);
        setError("Failed to load pending appointments.");
        // Do not modify loading here
        // Don't reset pendingPayments here, let the successful snapshot set it to 0 if needed
      }
    );

    // --- CLEANUP SUBSCRIPTIONS ---
    return () => {
      unsubscribePayments();
      unsubscribeAppointments();
    };
  }, [
    dateRange?.start,
    dateRange?.end,
    Array.isArray(selectedLocations) ? selectedLocations.join("|") : "",
  ]);

  return {
    revenueData,
    loading,
    error,
  };
}
