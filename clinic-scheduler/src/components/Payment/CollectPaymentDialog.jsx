import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayments } from "@/hooks/usePayments";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useClinic } from "@/contexts/ClinicContext";
import { toast } from "@/components/hooks/use-toast";

const CollectPaymentDialog = ({ appointment, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(appointment.amount || 0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [existingPayments, setExistingPayments] = useState([]);
  const { loading, updateAppointmentPayment, addPaymentRecord } = usePayments();
  const { selectedClinic } = useClinic();

  // Check for existing payments for this appointment
  useEffect(() => {
    if (!isOpen || !selectedClinic) return;

    const paymentsQuery = query(
      collection(db, "payments"),
      where("appointmentId", "==", appointment.id),
      where("clinicId", "==", selectedClinic)
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExistingPayments(payments);
    });

    return () => unsubscribe();
  }, [isOpen, appointment.id, selectedClinic]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double payment
    if (existingPayments.length > 0) {
      toast({
        title: "Payment Already Exists",
        description: "This appointment has already been paid for.",
        variant: "destructive",
      });
      return;
    }

    // Update appointment payment status
    const newSessionsPaid = appointment.isPackage
      ? Math.min(
          (appointment.sessionsPaid || 0) + 1,
          appointment.packageSessions
        )
      : 1;

    const newPaymentStatus = appointment.isPackage
      ? newSessionsPaid === appointment.packageSessions
        ? "paid"
        : "partial"
      : "paid";

    const updated = await updateAppointmentPayment(appointment.id, {
      paymentStatus: newPaymentStatus,
      sessionsPaid: newSessionsPaid,
      lastPaymentUpdate: new Date(),
    });

    if (updated && selectedClinic) {
      // Record the payment transaction
      await addPaymentRecord({
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        amount: parseFloat(amount),
        paymentMethod,
        sessionDate: appointment.start,
        clinicId: selectedClinic,
        createdAt: new Date(),
      });

      setIsOpen(false);
    }
  };

  // Disable if already paid
  const isAlreadyPaid = existingPayments.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={isAlreadyPaid}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isAlreadyPaid ? "Payment Already Collected" : "Collect Payment"}
          </DialogTitle>
        </DialogHeader>

        {isAlreadyPaid ? (
          <div className="p-4 bg-yellow-50 rounded-md">
            <p className="text-yellow-800">
              This appointment has already been paid for. Amount: $
              {existingPayments[0]?.amount}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {appointment.isPackage && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  This is a package of {appointment.packageSessions} sessions.
                  {appointment.sessionsPaid || 0} sessions have been paid for so
                  far.
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Record Payment"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CollectPaymentDialog;
