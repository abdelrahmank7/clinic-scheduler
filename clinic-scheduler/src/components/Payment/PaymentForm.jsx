import React, { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/hooks/use-toast";

const PaymentForm = ({ appointment, onPaymentUpdate }) => {
  const [paymentType, setPaymentType] = useState("full");
  const [amount, setAmount] = useState(appointment?.amount || 0);
  const [paymentStatus, setPaymentStatus] = useState(
    appointment?.paymentStatus || "unpaid"
  );
  const [isPackage, setIsPackage] = useState(appointment?.isPackage || false);
  const [packageSessions, setPackageSessions] = useState(
    appointment?.packageSessions || 1
  );
  const [sessionsPaid, setSessionsPaid] = useState(
    appointment?.sessionsPaid || 0
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // This will be implemented in the next step
      // We'll update the appointment with payment information
      const paymentData = {
        amount: parseFloat(amount),
        paymentStatus,
        isPackage,
        packageSessions: isPackage ? parseInt(packageSessions) : 1,
        sessionsPaid: isPackage ? parseInt(sessionsPaid) : 1,
        lastPaymentDate: new Date(),
      };

      if (onPaymentUpdate) {
        await onPaymentUpdate(appointment.id, paymentData);
        toast({
          title: "Success",
          description: "Payment information updated successfully!",
        });
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($)</Label>
          <Input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Type</Label>
        <RadioGroup
          value={paymentType}
          onValueChange={setPaymentType}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="full" id="full" />
            <Label htmlFor="full">Full Payment</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="package" id="package" />
            <Label htmlFor="package">Package</Label>
          </div>
        </RadioGroup>
      </div>

      {paymentType === "package" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="packageSessions">Total Sessions</Label>
            <Input
              type="number"
              id="packageSessions"
              value={packageSessions}
              onChange={(e) => setPackageSessions(e.target.value)}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionsPaid">Sessions Paid</Label>
            <Input
              type="number"
              id="sessionsPaid"
              value={sessionsPaid}
              onChange={(e) => setSessionsPaid(e.target.value)}
              min="0"
              max={packageSessions}
            />
          </div>
        </div>
      )}

      <Button type="submit" onClick={handleSubmit} disabled={loading}>
        {loading ? "Updating..." : "Update Payment"}
      </Button>
    </div>
  );
};

export default PaymentForm;
