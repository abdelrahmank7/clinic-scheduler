import { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { toast } from "@/components/hooks/use-toast";

export function usePayments() {
  const [loading, setLoading] = useState(false);

  const updateAppointmentPayment = async (appointmentId, paymentData) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        ...paymentData,
        lastPaymentUpdate: new Date(),
      });
      return true;
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment information.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addPaymentRecord = async (paymentData) => {
    setLoading(true);
    try {
      await addDoc(collection(db, "payments"), {
        ...paymentData,
        createdAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error("Error adding payment record:", error);
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateAppointmentPayment,
    addPaymentRecord,
  };
}
