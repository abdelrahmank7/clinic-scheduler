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
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "../hooks/use-toast";
import { usePayments } from "../../hooks/usePayments";
import { Timestamp } from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";

const CollectPaymentDialog = ({ appointment, children }) => {
  const [open, setOpen] = useState(false);
  const [amountCollected, setAmountCollected] = useState("");
  const [loading, setLoading] = useState(false);
  const { addPaymentRecord, updateAppointmentPayment } = usePayments();
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

  const recordPayment = async ({
    amount,
    method = "cash",
    status = "paid",
  }) => {
    // add record to payments collection
    await addPaymentRecord({
      clinicId: defaultClinicId,
      appointmentId: appointment?.id || null,
      clientId: appointment?.clientId || null,
      clientName: appointment?.clientName || "",
      amount: Number(amount) || 0,
      paymentMethod: method,
      paymentStatus: status,
      sessionDate: toTimestamp(
        appointment?.start || appointment?.sessionDate || new Date()
      ),
    });
  };

  const handleCollectPayment = async (e) => {
    e?.preventDefault();
    setLoading(true);

    const sessionAmount =
      appointment.isPackage && appointment.packageSessions
        ? appointmentAmount / appointment.packageSessions
        : appointmentAmount;

    const newSessionsPaid = (appointment.sessionsPaid || 0) + 1;
    const newPaymentStatus =
      appointment.isPackage && appointment.packageSessions
        ? newSessionsPaid >= appointment.packageSessions
          ? "paid"
          : "partial"
        : "paid";

    try {
      await updateDoc(doc(db, "appointments", appointment.id), {
        sessionsPaid: newSessionsPaid,
        paymentStatus: newPaymentStatus,
        lastPaymentUpdate: Timestamp.now(),
      });

      await recordPayment({
        amount: sessionAmount,
        method: "cash",
        status: newPaymentStatus,
      });

      toast({
        title: "Payment Collected",
        description: `Successfully collected payment for a session.`,
      });
      setOpen(false);
    } catch (err) {
      console.error("Error updating payment:", err);
      toast({
        title: "Payment Failed",
        description: "There was an error updating the payment status.",
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
      await updateDoc(doc(db, "appointments", appointment.id), {
        paymentStatus: "paid",
        sessionsPaid: 1,
        lastPaymentUpdate: Timestamp.now(),
      });

      await recordPayment({
        amount: appointmentAmount,
        method: "cash",
        status: "paid",
      });

      toast({
        title: "Payment Collected",
        description: `Successfully collected payment for this session.`,
      });
      setOpen(false);
    } catch (err) {
      console.error("Error updating payment:", err);
      toast({
        title: "Payment Failed",
        description: "There was an error updating the payment status.",
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
      // For partial payments, we just mark appointment as partial and record the payment amount.
      await updateDoc(doc(db, "appointments", appointment.id), {
        paymentStatus: "partial",
        lastPaymentUpdate: Timestamp.now(),
      });

      await recordPayment({
        amount: newAmountCollected,
        method: "cash",
        status: "partial",
      });

      toast({
        title: "Partial Payment Collected",
        description: `Successfully collected $${newAmountCollected.toFixed(
          2
        )}.`,
      });
      setOpen(false);
    } catch (err) {
      console.error("Error updating payment:", err);
      toast({
        title: "Payment Failed",
        description: "There was an error updating the payment status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Collect Payment for {appointment?.clientName || "Appointment"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p>
            Current Status:{" "}
            <span className="font-semibold">{appointment.paymentStatus}</span>
          </p>
          <p>
            Amount:{" "}
            <span className="font-semibold">
              ${appointmentAmount.toFixed(2)}
            </span>
          </p>
          {appointment.isPackage ? (
            <>
              <p>
                Sessions Paid:{" "}
                <span className="font-semibold">
                  {appointment.sessionsPaid || 0} of{" "}
                  {appointment.packageSessions || 1}
                </span>
              </p>
              <Button
                onClick={handleCollectPayment}
                disabled={
                  loading ||
                  appointment.sessionsPaid >= appointment.packageSessions
                }
              >
                {loading ? "Collecting..." : "Collect Payment for One Session"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSinglePayment}
              disabled={loading || appointment.paymentStatus === "paid"}
            >
              {loading ? "Collecting..." : "Mark as Paid"}
            </Button>
          )}

          {appointment.paymentStatus !== "paid" && !appointment.isPackage && (
            <form onSubmit={handlePartialPayment} className="space-y-2 mt-4">
              <Label htmlFor="partial-amount">Or Collect Partial Payment</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="partial-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(e.target.value)}
                  required
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="secondary">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectPaymentDialog;
