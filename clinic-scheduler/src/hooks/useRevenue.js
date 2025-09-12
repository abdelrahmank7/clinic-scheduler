// src/hooks/useRevenue.js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

// Add this import for date functions:
import { startOfMonth, endOfMonth, format } from "date-fns";

export function useRevenue(clinicId, dateRange) {
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    recentPayments: [],
    revenueByMethod: {},
    revenueByClient: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch monthly revenue
    const startOfMonthDate = dateRange?.start || startOfMonth(new Date());
    const endOfMonthDate = dateRange?.end || endOfMonth(new Date());

    const paymentsQuery = query(
      collection(db, "payments"),
      where("clinicId", "==", clinicId),
      where("sessionDate", ">=", startOfMonthDate),
      where("sessionDate", "<=", endOfMonthDate)
    );

    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        sessionDate: doc.data().sessionDate.toDate(),
      }));

      const totalRevenue = payments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      );

      const revenueByMethod = payments.reduce((acc, payment) => {
        acc[payment.paymentMethod] =
          (acc[payment.paymentMethod] || 0) + (payment.amount || 0);
        return acc;
      }, {});

      const revenueByClient = payments.reduce((acc, payment) => {
        acc[payment.clientName] =
          (acc[payment.clientName] || 0) + (payment.amount || 0);
        return acc;
      }, {});

      setRevenueData((prev) => ({
        ...prev,
        totalRevenue,
        monthlyRevenue: totalRevenue,
        revenueByMethod,
        revenueByClient,
        recentPayments: payments.slice(0, 5),
      }));
    });

    // Fetch pending payments
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("clinicId", "==", clinicId),
      where("paymentStatus", "in", ["unpaid", "partial"])
    );

    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        setRevenueData((prev) => ({
          ...prev,
          pendingPayments: snapshot.docs.length,
        }));
      }
    );

    return () => {
      unsubscribePayments();
      unsubscribeAppointments();
    };
  }, [clinicId, dateRange]);

  return {
    revenueData,
    loading,
  };
}
