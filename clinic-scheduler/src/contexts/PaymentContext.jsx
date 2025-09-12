// src/contexts/PaymentContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const PaymentContext = createContext();

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
};

export const PaymentProvider = ({ children, clinicId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const paymentsQuery = query(
      collection(db, "payments"),
      where("clinicId", "==", clinicId)
    );

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const paymentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
          sessionDate: doc.data().sessionDate.toDate(),
        }));
        setPayments(paymentsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching payments:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  const getPaymentHistory = (clientId) => {
    return payments.filter((payment) => payment.clientId === clientId);
  };

  const getTotalRevenue = () => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  return (
    <PaymentContext.Provider
      value={{
        payments,
        loading,
        getPaymentHistory,
        getTotalRevenue,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};
