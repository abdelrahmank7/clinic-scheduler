// src/hooks/usePayments.js
import { useState } from "react";
import { PaymentService } from "../services/payment-service";
import { toast } from "@/components/hooks/use-toast";

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processPayment = async (paymentData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await PaymentService.processPayment(paymentData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const refundPayment = async (paymentId, refundAmount, reason) => {
    setLoading(true);
    setError(null);

    try {
      const result = await PaymentService.refundPayment(
        paymentId,
        refundAmount,
        reason
      );
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    processPayment,
    refundPayment,
  };
}
