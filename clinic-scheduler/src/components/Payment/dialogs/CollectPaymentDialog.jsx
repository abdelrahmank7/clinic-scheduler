// src/components/Payment/dialogs/CollectPaymentDialog.jsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePayments } from "@/hooks/usePayments";
import { useToast } from "@/components/ui/use-toast";
import { Timestamp } from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";

const CollectPaymentDialog = ({
  appointment,
  children,
  onPaymentCollected,
}) => {
  const [open, setOpen] = useState(false);
  const [amountCollected, setAmountCollected] = useState("");
  const [loading, setLoading] = useState(false);
  const { processPayment } = usePayments();
  const { toast } = useToast();
  const { selectedClinic } = useClinic();

  // Safely get appointment amount, defaulting to 0 if undefined
  const appointmentAmount = Number(appointment?.amount || 0);

  const toTimestamp = (d) => {
    if (!d) return Timestamp.now();
    if (d instanceof Timestamp) return d;
    // if Date or string
    const dateObj = d instanceof Date ? d : new Date(d);
    return Timestamp.fromDate(dateObj);
  };

  const defaultClinicId = appointment?.clinicId || selectedClinic || null;

  const handleCollectPayment = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const sessionAmount =
        appointment.isPackage && appointment.packageSessions
          ? appointmentAmount / appointment.packageSessions
          : appointmentAmount;

      // Validate session amount
      if (sessionAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Session amount must be greater than zero.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const newSessionsPaid = (appointment.sessionsPaid || 0) + 1;
      const newPaymentStatus =
        appointment.isPackage && appointment.packageSessions
          ? newSessionsPaid >= appointment.packageSessions
            ? "paid"
            : "partial"
          : "paid";

      const paymentData = {
        clinicId: defaultClinicId,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: sessionAmount,
        paymentMethod: "cash",
        paymentStatus: newPaymentStatus,
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPackage: appointment?.isPackage || false,
        sessionsPaid: newSessionsPaid,
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        // Update appointment status
        if (onPaymentCollected) {
          onPaymentCollected({
            sessionsPaid: newSessionsPaid,
            paymentStatus: newPaymentStatus,
          });
        }

        toast({
          title: "Payment Collected",
          description: `Successfully collected $${sessionAmount.toFixed(
            2
          )} for a session.`,
        });
        setOpen(false);
      }
    } catch (err) {
      console.error("Error collecting payment:", err);
      toast({
        title: "Payment Failed",
        description: "There was an error collecting the payment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSinglePayment = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      // Make sure we have a valid amount
      const paymentAmount = appointmentAmount > 0 ? appointmentAmount : 0;

      if (paymentAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Payment amount must be greater than zero.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const paymentData = {
        clinicId: defaultClinicId,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: paymentAmount, // Use the validated amount
        paymentMethod: "cash",
        paymentStatus: "paid",
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPackage: false,
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        if (onPaymentCollected) {
          onPaymentCollected({
            paymentStatus: "paid",
            sessionsPaid: 1,
          });
        }

        toast({
          title: "Payment Collected",
          description: `Successfully collected $${paymentAmount.toFixed(
            2
          )} for this session.`,
        });
        setOpen(false);
      }
    } catch (err) {
      console.error("Error collecting payment:", err);
      toast({
        title: "Payment Failed",
        description: "There was an error collecting the payment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePartialPayment = async (e) => {
    e?.preventDefault();
    setLoading(true);
    const newAmountCollected = parseFloat(amountCollected || 0);

    if (isNaN(newAmountCollected) || newAmountCollected <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid partial payment amount.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const paymentData = {
        clinicId: defaultClinicId,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: newAmountCollected,
        paymentMethod: "cash",
        paymentStatus: "partial",
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPartial: true,
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        if (onPaymentCollected) {
          onPaymentCollected({
            paymentStatus: "partial",
          });
        }

        toast({
          title: "Partial Payment Collected",
          description: `Successfully collected $${newAmountCollected.toFixed(
            2
          )}.`,
        });
        setOpen(false);
      }
    } catch (err) {
      console.error("Error collecting partial payment:", err);
      toast({
        title: "Payment Failed",
        description: "There was an error collecting the partial payment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] p-4">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-lg sm:text-xl">
            Collect Payment for {appointment?.clientName || "Appointment"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Payment info - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-muted-foreground">Current Status</p>
              <p className="font-semibold capitalize">
                {appointment.paymentStatus || "unpaid"}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-muted-foreground">Amount</p>
              <p className="font-semibold">${appointmentAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Package info - responsive */}
          {appointment.isPackage && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-muted-foreground">Sessions Paid</p>
              <p className="font-semibold">
                {appointment.sessionsPaid || 0} of{" "}
                {appointment.packageSessions || 1}
              </p>
            </div>
          )}

          {/* Buttons - responsive stacking */}
          <div className="flex flex-col sm:flex-row gap-2">
            {appointment.isPackage ? (
              <Button
                onClick={handleCollectPayment}
                disabled={
                  loading ||
                  (appointment.sessionsPaid || 0) >=
                    (appointment.packageSessions || 1)
                }
                className="h-12 sm:h-9"
              >
                {loading ? "Collecting..." : "Collect Payment for One Session"}
              </Button>
            ) : (
              <Button
                onClick={handleSinglePayment}
                disabled={loading || appointment.paymentStatus === "paid"}
                className="h-12 sm:h-9"
              >
                {loading ? "Collecting..." : "Mark as Paid"}
              </Button>
            )}
          </div>

          {/* Partial payment form - responsive */}
          {appointment.paymentStatus !== "paid" && !appointment.isPackage && (
            <form onSubmit={handlePartialPayment} className="space-y-3 mt-4">
              <Label htmlFor="partial-amount">Or Collect Partial Payment</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="partial-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 sm:h-9"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button
            onClick={() => setOpen(false)}
            variant="secondary"
            className="h-12 sm:h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectPaymentDialog;
