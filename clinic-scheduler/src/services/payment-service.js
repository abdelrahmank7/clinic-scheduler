// src/services/payment-service.js
import { db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  runTransaction,
  Timestamp,
  increment,
} from "firebase/firestore";
import { toast } from "@/components/hooks/use-toast";

export class PaymentService {
  static async _applyPaymentTransactionUpdates(tx, paymentData) {
    // If there's an appointment to update, perform the appointment update within the same transaction
    if (paymentData.appointmentId) {
      const appointmentRef = doc(db, "appointments", paymentData.appointmentId);
      const appointmentSnap = await tx.get(appointmentRef);

      const updateData = { lastPaymentUpdate: Timestamp.now() };

      if (paymentData.isPartial) {
        const paymentAmount = Number(paymentData.amount) || 0;
        updateData.amountPaid = (paymentData.amountPaid || 0) + paymentAmount;
        updateData.paymentStatus = "partial";
      } else if (paymentData.paymentStatus === "paid") {
        updateData.amountPaid = Number(paymentData.amount) || 0;
        updateData.paymentStatus = "paid";

        if (paymentData.isPackage && paymentData.isPrepayment) {
          updateData.sessionsPaid =
            paymentData.sessionsPaid || paymentData.packageSessions || 1;
          updateData.isPackagePrepaid = true;
        } else if (paymentData.isPackage) {
          updateData.sessionsPaid = paymentData.sessionsPaid || 1;
          const totalSessions = paymentData.packageSessions || 1;
          const currentSessionsPaid = paymentData.sessionsPaid || 1;
          updateData.paymentStatus =
            currentSessionsPaid >= totalSessions ? "paid" : "partial";
        } else {
          updateData.sessionsPaid = 1;
        }
      }

      if (appointmentSnap.exists()) {
        tx.update(appointmentRef, updateData);
      }
    }

    // Sync client.remainingSessions inside transaction when possible
    // This handles payment-related session updates (e.g., prepayment adds, non-prepayment might deduct if centralized)
    if (paymentData.clientId) {
      const clientRef = doc(db, "clients", paymentData.clientId);
      if (paymentData.isPackage && paymentData.isPrepayment) {
        // --- CHANGE HERE: Decrement by 1 from the total package sessions ---
        // This means if a 4-session package is bought, 3 sessions go into remainingSessions
        const inc = Math.max(0, (paymentData.packageSessions || 0) - 1); // Ensure inc is not negative
        if (inc > 0) {
          tx.update(clientRef, { remainingSessions: increment(inc) });
        }
        console.log(
          `[DEBUG] Prepayment: Added ${inc} sessions to client remainingSessions for package of ${
            paymentData.packageSessions || 0
          } total.`
        );
      } else if (paymentData.isPackage && !paymentData.isPrepayment) {
        // This path might still be relevant if a single session payment is made for an appointment
        // that was booked using a remaining session, potentially requiring a sync adjustment.
        // However, if session consumption is now ONLY via booking (centralized),
        // this decrement might be redundant or incorrect depending on exact payment flow.
        // For now, keeping it as it might handle partial payments or adjustments correctly.
        const clientSnap = await tx.get(clientRef);
        const current = clientSnap.exists()
          ? clientSnap.data().remainingSessions || 0
          : 0;
        if (current > 0) {
          tx.update(clientRef, { remainingSessions: increment(-1) });
        }
      }
    }
  }

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

      // Record payment in payments collection with location
      const paymentRecord = {
        ...paymentData,
        createdAt: Timestamp.now(),
        amount: amount, // Use validated amount
        location: paymentData.location || "default", // Add location support
      };

      // Use a transaction to create the payment record and update related docs atomically
      const paymentsCol = collection(db, "payments");
      const paymentRef = doc(paymentsCol); // generate new doc ref

      // Attempt transaction with a couple of retries for transient failures
      const maxRetries = 2;
      let attempt = 0;
      let paymentId = null;
      while (attempt <= maxRetries) {
        try {
          await runTransaction(db, async (tx) => {
            // --- READS FIRST ---
            let appointmentSnap = null;
            let clientSnap = null;
            let appointmentRef = null;
            let clientRef = null;

            if (paymentData.appointmentId) {
              appointmentRef = doc(
                db,
                "appointments",
                paymentData.appointmentId
              );
              appointmentSnap = await tx.get(appointmentRef);
            }
            if (paymentData.clientId) {
              clientRef = doc(db, "clients", paymentData.clientId);
              // Only need to read if we might decrement sessions (non-prepayment package)
              if (paymentData.isPackage && !paymentData.isPrepayment) {
                clientSnap = await tx.get(clientRef);
              }
            }

            // --- WRITES AFTER ---
            tx.set(paymentRef, paymentRecord);

            // Appointment update
            if (appointmentRef && appointmentSnap) {
              const updateData = { lastPaymentUpdate: Timestamp.now() };
              if (paymentData.isPartial) {
                const paymentAmount = Number(paymentData.amount) || 0;
                updateData.amountPaid =
                  (paymentData.amountPaid || 0) + paymentAmount;
                updateData.paymentStatus = "partial";
              } else if (paymentData.paymentStatus === "paid") {
                updateData.amountPaid = Number(paymentData.amount) || 0;
                updateData.paymentStatus = "paid";
                if (paymentData.isPackage && paymentData.isPrepayment) {
                  updateData.sessionsPaid =
                    paymentData.sessionsPaid ||
                    paymentData.packageSessions ||
                    1;
                  updateData.isPackagePrepaid = true;
                } else if (paymentData.isPackage) {
                  updateData.sessionsPaid = paymentData.sessionsPaid || 1;
                  const totalSessions = paymentData.packageSessions || 1;
                  const currentSessionsPaid = paymentData.sessionsPaid || 1;
                  updateData.paymentStatus =
                    currentSessionsPaid >= totalSessions ? "paid" : "partial";
                } else {
                  updateData.sessionsPaid = 1;
                }
              }
              if (appointmentSnap.exists()) {
                tx.update(appointmentRef, updateData);
              }
            }

            // Client update (payment-related)
            if (clientRef) {
              if (paymentData.isPackage && paymentData.isPrepayment) {
                // --- CHANGE HERE: Decrement by 1 from the total package sessions ---
                const inc = Math.max(0, (paymentData.packageSessions || 0) - 1); // Ensure inc is not negative
                if (inc > 0) {
                  tx.update(clientRef, { remainingSessions: increment(inc) });
                }
                console.log(
                  `[DEBUG] ProcessPayment Prepayment: Added ${inc} sessions to client remainingSessions for package of ${
                    paymentData.packageSessions || 0
                  } total.`
                );
              } else if (paymentData.isPackage && !paymentData.isPrepayment) {
                const current =
                  clientSnap && clientSnap.exists()
                    ? clientSnap.data().remainingSessions || 0
                    : 0;
                if (current > 0) {
                  tx.update(clientRef, { remainingSessions: increment(-1) });
                }
              }
            }
          });

          paymentId = paymentRef.id;
          break; // success
        } catch (txErr) {
          attempt += 1;
          console.warn(`Payment transaction attempt ${attempt} failed:`, txErr);
          if (attempt > maxRetries) throw txErr;
          // small backoff
          await new Promise((res) => setTimeout(res, 250 * attempt));
        }
      }

      // If we reached here with no paymentId, something went wrong
      if (!paymentId) {
        throw new Error("Failed to create payment record after retries");
      }

      toast({
        title: "Payment Processed",
        description: `Payment of $${amount.toFixed(2)} recorded successfully`,
      });
      return { success: true, paymentId };
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

  // --- UPDATED: Enhanced logic for updating appointment status ---
  static async updateAppointmentPaymentStatus(appointmentId, paymentData) {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);

      await runTransaction(db, async (tx) => {
        const appointmentSnap = await tx.get(appointmentRef);
        if (!appointmentSnap.exists()) return; // nothing to update

        // --- Prepare update data based on payment type ---
        let updateData = {
          lastPaymentUpdate: Timestamp.now(),
        };

        if (paymentData.isPartial) {
          const paymentAmount = Number(paymentData.amount) || 0;
          updateData.amountPaid = (paymentData.amountPaid || 0) + paymentAmount;
          updateData.paymentStatus = "partial";
        } else if (paymentData.paymentStatus === "paid") {
          updateData.amountPaid = Number(paymentData.amount) || 0;
          updateData.paymentStatus = "paid";

          if (paymentData.isPackage && paymentData.isPrepayment) {
            updateData.sessionsPaid =
              paymentData.sessionsPaid || paymentData.packageSessions || 1;
            updateData.isPackagePrepaid = true;
          } else if (paymentData.isPackage) {
            updateData.sessionsPaid = paymentData.sessionsPaid || 1;
            const totalSessions = paymentData.packageSessions || 1;
            const currentSessionsPaid = paymentData.sessionsPaid || 1;
            updateData.paymentStatus =
              currentSessionsPaid >= totalSessions ? "paid" : "partial";
          } else {
            updateData.sessionsPaid = 1;
          }
        }

        tx.update(appointmentRef, updateData);

        // Keep centralized client.remainingSessions in sync
        // This handles payment-related session updates
        if (paymentData.clientId) {
          const clientRef = doc(db, "clients", paymentData.clientId);
          if (paymentData.isPackage && paymentData.isPrepayment) {
            // --- CHANGE HERE: Decrement by 1 from the total package sessions ---
            const inc = Math.max(0, (paymentData.packageSessions || 0) - 1); // Ensure inc is not negative
            if (inc > 0) {
              tx.update(clientRef, { remainingSessions: increment(inc) });
            }
            console.log(
              `[DEBUG] UpdateStatus Prepayment: Added ${inc} sessions to client remainingSessions for package of ${
                paymentData.packageSessions || 0
              } total.`
            );
          } else if (paymentData.isPackage && !paymentData.isPrepayment) {
            // This path might still be relevant for non-prepayment package payments
            // Check if this is the correct place to potentially decrement remainingSessions
            // upon payment confirmation for a session booked using remainingSessions.
            // If session consumption is now ONLY via booking, this might be redundant.
            // Keeping for now to maintain payment logic, but might need review.
            const clientSnap = await tx.get(clientRef);
            const current = clientSnap.exists()
              ? clientSnap.data().remainingSessions || 0
              : 0;
            if (current > 0)
              tx.update(clientRef, { remainingSessions: increment(-1) });
          }
        }
      });
    } catch (error) {
      console.error("Error updating appointment payment status:", error);
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

  // Create an appointment and atomically consume a session from the client's centralized remainingSessions.
  // The packageAppointmentToDeduct parameter is now unused.
  static async createAppointmentAndConsumeSession(
    appointmentData,
    packageAppointmentToDeduct = null // Parameter is now unused
  ) {
    try {
      const appointmentsCol = collection(db, "appointments");
      const appointmentRef = doc(appointmentsCol); // Use 'appointments' collection

      await runTransaction(db, async (tx) => {
        // --- READS FIRST ---
        let clientSnap = null;
        let clientRef = null;

        // Check if session should be consumed from centralized pool
        if (appointmentData.usedCentralRemaining && appointmentData.clientId) {
          clientRef = doc(db, "clients", appointmentData.clientId);
          clientSnap = await tx.get(clientRef);
        }

        // Debug: print current session info before write
        if (clientRef && clientSnap) {
          console.log("[DEBUG] Before appointment creation (centralized):", {
            clientId: appointmentData.clientId,
            remainingSessions: clientSnap.exists()
              ? clientSnap.data().remainingSessions
              : null,
            appointmentData,
          });
        }

        tx.set(appointmentRef, {
          ...appointmentData,
          createdAt: Timestamp.now(),
        });

        // If consuming from centralized pool, decrement client's remainingSessions
        if (clientRef && clientSnap) {
          const current = clientSnap.exists()
            ? clientSnap.data().remainingSessions || 0
            : 0;
          if (current > 0) {
            tx.update(clientRef, { remainingSessions: increment(-1) });
            console.log("[DEBUG] Central session deducted (centralized):", {
              clientId: appointmentData.clientId,
              previous: current,
              newRemaining: current - 1,
            });
          } else {
            // If there are no remaining sessions, throw to abort the transaction
            throw new Error(
              "Client has no remaining sessions to consume (centralized)"
            );
          }
        }

        // Note: Removed the old logic to decrement packageAppointmentToDeduct.sessionsPaid
      });

      return { success: true, appointmentId: appointmentRef.id };
    } catch (err) {
      console.error(
        "Error creating appointment with session consumption (centralized):",
        err
      );
      return { success: false, error: err.message };
    }
  }

  // Delete an appointment and, if it consumed a centralized session, return it to the pool
  static async deleteAppointmentAndReturnSession(
    appointmentId,
    appointmentDoc
  ) {
    try {
      const apptRef = doc(db, "appointments", appointmentId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(apptRef);
        if (!snap.exists()) return; // nothing to do
        tx.delete(apptRef);

        // Return centralized remaining session if was used (check appointmentDoc)
        if (appointmentDoc?.usedCentralRemaining && appointmentDoc.clientId) {
          const clientRef = doc(db, "clients", appointmentDoc.clientId);
          const clientSnap = await tx.get(clientRef);
          // Only update if client doc exists
          if (clientSnap.exists()) {
            tx.update(clientRef, { remainingSessions: increment(1) });
            console.log("[DEBUG] Central session returned (centralized):", {
              clientId: appointmentDoc.clientId,
              remainingSessions: clientSnap.data().remainingSessions + 1, // Note: This is the value *before* increment is applied by the transaction
            });
          }
        }

        // Note: Removed the old logic to increment sourcePackageAppointmentId.sessionsPaid
      });

      return { success: true };
    } catch (err) {
      console.error(
        "Error deleting appointment and returning session (centralized):",
        err
      );
      return { success: false, error: err.message };
    }
  }
}
