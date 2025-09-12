// src/services/payment-service.js
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { toast } from "@/components/hooks/use-toast";

export class PaymentService {
  static async processPayment(paymentData) {
    try {
      // More flexible validation
      const amount = Number(paymentData.amount) || 0;

      // Allow zero amounts for certain cases, but warn
      if (amount < 0) {
        throw new Error("Payment amount cannot be negative");
      }

      if (amount === 0) {
        console.warn("Processing payment with zero amount");
      }

      // Record payment in payments collection
      const paymentRecord = {
        ...paymentData,
        createdAt: Timestamp.now(),
        amount: amount, // Use validated amount
      };

      const paymentDoc = await addDoc(
        collection(db, "payments"),
        paymentRecord
      );

      // Update appointment payment status
      if (paymentData.appointmentId) {
        await this.updateAppointmentPaymentStatus(
          paymentData.appointmentId,
          paymentData
        );
      }

      toast({
        title: "Payment Processed",
        description: `Payment of $${amount.toFixed(2)} recorded successfully`,
      });

      return { success: true, paymentId: paymentDoc.id };
    } catch (error) {
      console.error("Payment processing error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  }
  static async updateAppointmentPaymentStatus(appointmentId, paymentData) {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);

      // Calculate new payment status based on payment type
      let updateData = {
        paymentStatus: paymentData.paymentStatus || "paid",
        lastPaymentUpdate: Timestamp.now(),
      };

      if (paymentData.isPackage) {
        updateData.sessionsPaid = paymentData.sessionsPaid || 1;
      }

      await updateDoc(appointmentRef, updateData);
    } catch (error) {
      console.error("Error updating appointment payment status:", error);
      throw error;
    }
  }

  static calculatePackageProgress(appointment) {
    if (!appointment.isPackage) return 100;

    const totalSessions = appointment.packageSessions || 1;
    const sessionsPaid = appointment.sessionsPaid || 0;

    return Math.min((sessionsPaid / totalSessions) * 100, 100);
  }

  static validatePaymentAmount(amount, appointment) {
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount < 0) {
      return { valid: false, error: "Invalid amount" };
    }

    if (appointment.isPackage) {
      const sessionAmount = appointment.amount / appointment.packageSessions;
      if (numericAmount > sessionAmount) {
        return {
          valid: false,
          error: `Amount cannot exceed $${sessionAmount.toFixed(
            2
          )} per session`,
        };
      }
    }

    return { valid: true };
  }

  static async refundPayment(paymentId, refundAmount, reason) {
    try {
      // Record refund transaction
      const refundRecord = {
        originalPaymentId: paymentId,
        refundAmount: Number(refundAmount),
        reason,
        refundDate: Timestamp.now(),
        status: "completed",
      };

      await addDoc(collection(db, "refunds"), refundRecord);

      toast({
        title: "Refund Processed",
        description: `Refund of $${refundAmount.toFixed(2)} completed`,
      });

      return { success: true };
    } catch (error) {
      console.error("Refund processing error:", error);
      toast({
        title: "Refund Failed",
        description: "Failed to process refund",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  }
}
