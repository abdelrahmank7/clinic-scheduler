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
import { Timestamp, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../../firebase";
import { useClinic } from "@/contexts/ClinicContext";
import {
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Wallet,
  Banknote,
} from "lucide-react";

const CollectPaymentDialog = ({
  appointment,
  children,
  onPaymentCollected,
}) => {
  const [open, setOpen] = useState(false);
  const [amountCollected, setAmountCollected] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const { processPayment } = usePayments();
  const { toast } = useToast();
  const { selectedLocation } = useClinic();

  React.useEffect(() => {
    // Set the initial amount when the dialog opens
    if (open) {
      const appointmentAmount = Number(appointment?.amount || 0);
      const amountPaid = Number(appointment?.amountPaid || 0);
      const remainingAmount = appointmentAmount - amountPaid;
      const totalSessions = appointment?.packageSessions || 1;
      const sessionsPaid = appointment?.sessionsPaid || 0;

      if (appointment?.isPackage) {
        if (sessionsPaid === 0) {
          // If no sessions have been paid for, default to full package price
          setAmountCollected(appointmentAmount.toFixed(2));
        } else {
          // Otherwise, default to per-session payment
          const perSessionAmount = appointmentAmount / totalSessions;
          setAmountCollected(perSessionAmount.toFixed(2));
        }
      } else {
        // For non-package appointments
        setAmountCollected(remainingAmount.toFixed(2));
      }
    }
  }, [open, appointment]);

  // Safely get appointment amount, defaulting to 0 if undefined
  const appointmentAmount = Number(appointment?.amount || 0);
  const totalSessions = appointment?.packageSessions || 1;
  const sessionsPaid = appointment?.sessionsPaid || 0;
  const remainingSessions = totalSessions - sessionsPaid;
  // Calculate amount already paid towards this appointment
  const amountPaid = appointment?.amountPaid || 0;
  const remainingAmount = appointmentAmount - amountPaid;
  const location = appointment?.location || selectedLocation || "default";

  // --- NEW: Handler for collecting payment for a package purchase ---
  // This pays for ALL sessions in the package upfront.
  const handlePurchasePackage = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const paymentData = {
        location: location,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: appointmentAmount, // Full package amount
        paymentMethod: paymentMethod,
        paymentStatus: "paid", // Mark the *package purchase* as paid
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPackage: true, // Indicate this payment is for a package
        packageName: appointment?.packageName || "Package",
        packageSessions: totalSessions,
        sessionsPaid: totalSessions, // All sessions are paid for
        isPrepayment: true, // This is a prepayment for all sessions
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        toast({
          title: "Package Payment Successful",
          description: `Full payment processed for ${totalSessions} sessions.`,
        });
        // Note: client.remainingSessions is updated centrally in payment-service
        // (payment-service.updateAppointmentPaymentStatus) to avoid double-updates.
        onPaymentCollected?.();
        setOpen(false);
      } else {
        toast({
          title: "Payment Failed",
          description:
            result.error || "There was an error processing the payment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>There was an error processing the package payment.</span>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Handler for collecting payment for a SINGLE SESSION ---
  // This is used for non-package appointments or collecting for one session of a package.
  const handleSinglePayment = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const paymentData = {
        location: location,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: Number(amountCollected) || 0,
        paymentMethod: paymentMethod,
        paymentStatus: "paid",
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPackage: appointment?.isPackage || false,
        packageName: appointment?.packageName || null,
        packageSessions: totalSessions,
        sessionsPaid: sessionsPaid + 1, // Increment sessions paid by 1
        // Track if this is a partial payment
        isPartial: Number(amountCollected) < appointmentAmount,
        amountPaid: amountPaid + Number(amountCollected),
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        toast({
          title: "Payment Successful",
          description: appointment?.isPackage
            ? `Payment processed for session ${
                sessionsPaid + 1
              }/${totalSessions}.`
            : "Payment processed successfully.",
        });
        onPaymentCollected?.();
        setOpen(false);
      } else {
        toast({
          title: "Payment Failed",
          description:
            result.error || "There was an error processing the payment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>There was an error processing the payment.</span>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();

    // Validate amount
    const amount = Number(amountCollected);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    // If this is a package and some sessions have already been paid, only allow per-session payments
    if (
      appointment?.isPackage &&
      sessionsPaid > 0 &&
      amount > appointmentAmount / totalSessions
    ) {
      toast({
        title: "Invalid Amount",
        description: `Maximum payment per session is ${formatCurrency(
          appointmentAmount / totalSessions
        )}.`,
        variant: "destructive",
      });
      return;
    }

    // If trying to pay more than remaining amount
    if (amount > remainingAmount) {
      toast({
        title: "Invalid Amount",
        description: `Maximum payment amount is ${formatCurrency(
          remainingAmount
        )}.`,
        variant: "destructive",
      });
      return;
    }

    // Handle package pre-payment vs single payment
    if (appointment?.isPackage && amount === appointmentAmount) {
      handlePurchasePackage(e);
    } else {
      handleSinglePayment(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className="h-8 px-2 lg:h-9 lg:px-4"
            disabled={appointment?.paymentStatus === "paid"}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Section */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amountCollected}
                onChange={(e) => setAmountCollected(e.target.value)}
                className="pl-9"
                placeholder={`0.00 (Max: ${(remainingAmount || 0).toFixed(2)})`}
              />
            </div>
            {appointment?.isPackage && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Package Details:</span>{" "}
                {sessionsPaid}/{totalSessions} sessions paid
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="mr-2 h-4 w-4" />
                Cash
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "card" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Card
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !amountCollected}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Collect Payment
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to convert Date to Firestore Timestamp
const toTimestamp = (date) => {
  if (!date) return Timestamp.now();
  return Timestamp.fromDate(new Date(date));
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default CollectPaymentDialog;
