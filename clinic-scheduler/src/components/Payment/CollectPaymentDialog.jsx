import React, { useState } from "react";
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

const CollectPaymentDialog = ({ appointment, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(appointment.amount || 0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const { loading, updateAppointmentPayment, addPaymentRecord } = usePayments();

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    if (updated) {
      // Record the payment transaction
      await addPaymentRecord({
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        amount: parseFloat(amount),
        paymentMethod,
        sessionDate: appointment.start,
        createdAt: new Date(),
      });

      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
};

export default CollectPaymentDialog;
