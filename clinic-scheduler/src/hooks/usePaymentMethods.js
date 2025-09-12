// src/hooks/usePaymentMethods.js
import { useState, useEffect } from "react";

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState([
    { id: "cash", name: "Cash", icon: "💵" },
    { id: "card", name: "Credit/Debit Card", icon: "💳" },
    { id: "bank", name: "Bank Transfer", icon: "🏦" },
    { id: "other", name: "Other", icon: "❓" },
  ]);

  const [loading, setLoading] = useState(false);

  // You can add more logic here to fetch payment methods from your database
  // For now, we're using static data

  return {
    paymentMethods,
    loading,
    addPaymentMethod: (method) => {
      setPaymentMethods((prev) => [...prev, method]);
    },
    removePaymentMethod: (methodId) => {
      setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));
    },
  };
}
