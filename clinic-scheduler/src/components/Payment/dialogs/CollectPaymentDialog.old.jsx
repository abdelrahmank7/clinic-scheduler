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

  // Safely get appointment amount, defaulting to 0 if undefined
  const appointmentAmount = Number(appointment?.amount || 0);
  const totalSessions = appointment?.packageSessions || 1;
  const sessionsPaid = appointment?.sessionsPaid || 0;
  const remainingSessions = totalSessions - sessionsPaid;
  // Calculate amount already paid towards this appointment
  const amountPaid = appointment?.amountPaid || 0;
  const remainingAmount = appointmentAmount - amountPaid;

  const toTimestamp = (d) => {
    if (!d) return Timestamp.now();
    if (d instanceof Timestamp) return d;
    // if Date or string
    const dateObj = d instanceof Date ? d : new Date(d);
    return Timestamp.fromDate(dateObj);
  };

  const location = appointment?.location || selectedLocation || "default";

  // --- NEW: Handler for collecting payment for a package purchase ---
  // This pays for ALL sessions in the package upfront.
  const handlePurchasePackage = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const paymentData = {
        clinicId: defaultClinicId,
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
        packageId: appointment?.packageId || null, // Link back if applicable
        // --- KEY CHANGE: Mark all sessions in the package as paid/prepaid ---
        sessionsPaid: totalSessions,
        amountPaid: appointmentAmount, // Record the full amount paid
        isPrepayment: true, // Flag to indicate this is a package prepayment
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        // Update appointment status to reflect package is fully paid
        if (onPaymentCollected) {
          onPaymentCollected({
            sessionsPaid: totalSessions, // All sessions are now considered paid/prepaid
            paymentStatus: "paid", // The package itself is paid
            amountPaid: appointmentAmount, // Update the amount paid field
          });
        }

        toast({
          title: "Package Purchased",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                Successfully collected ${appointmentAmount.toFixed(2)} for
                package of {totalSessions} sessions.
              </span>
            </div>
          ),
        });
        setOpen(false);
        setAmountCollected("");
      }
    } catch (err) {
      console.error("Error purchasing package:", err);
      toast({
        title: "Payment Failed",
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
        clinicId: defaultClinicId,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: appointmentAmount, // Amount for this single session/appointment
        paymentMethod: paymentMethod,
        paymentStatus: "paid", // Mark this specific appointment/session as paid
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPackage: appointment?.isPackage || false,
        packageName: appointment?.packageName || null,
        packageId: appointment?.packageId || null,
        // --- For single appt or single session collection ---
        sessionsPaid: appointment?.isPackage ? (sessionsPaid || 0) + 1 : 1,
        amountPaid: appointmentAmount, // Pay the full amount for this item
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        let updateData = {
          paymentStatus: "paid",
          amountPaid: appointmentAmount, // Update amount paid for the appointment
        };

        // If it's a package, increment sessions paid
        if (appointment?.isPackage) {
          updateData.sessionsPaid = (sessionsPaid || 0) + 1;
        } else {
          updateData.sessionsPaid = 1;
        }

        if (onPaymentCollected) {
          onPaymentCollected(updateData);
        }

        toast({
          title: "Payment Collected",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                Successfully collected ${appointmentAmount.toFixed(2)} for this
                session.
              </span>
            </div>
          ),
        });
        setOpen(false);
        setAmountCollected("");
      }
    } catch (err) {
      console.error("Error collecting payment:", err);
      toast({
        title: "Payment Failed",
        description: (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>There was an error collecting the payment.</span>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Handler for partial payment ---
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

    if (newAmountCollected > remainingAmount) {
      toast({
        title: "Invalid amount",
        description: `Amount cannot exceed remaining balance of $${remainingAmount.toFixed(
          2
        )}.`,
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
        paymentMethod: paymentMethod,
        paymentStatus: "partial", // Explicitly mark as partial
        sessionDate: toTimestamp(
          appointment?.start || appointment?.sessionDate || new Date()
        ),
        isPackage: appointment?.isPackage || false,
        packageName: appointment?.packageName || null,
        packageId: appointment?.packageId || null,
        isPartial: true, // Flag for partial payment
        // Note: sessionsPaid and amountPaid are updated in the service
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        if (onPaymentCollected) {
          // Service should handle updating amountPaid. We just signal status change.
          onPaymentCollected({
            paymentStatus: "partial",
            // amountPaid will be updated by the service
          });
        }

        toast({
          title: "Partial Payment Collected",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                Successfully collected ${newAmountCollected.toFixed(2)}.
              </span>
            </div>
          ),
        });
        setOpen(false);
        setAmountCollected("");
      }
    } catch (err) {
      console.error("Error collecting partial payment:", err);
      toast({
        title: "Payment Failed",
        description: (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>There was an error collecting the partial payment.</span>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: Wallet },
    { id: "card", name: "Credit/Debit Card", icon: CreditCard },
    { id: "bank", name: "Bank Transfer", icon: Banknote },
    { id: "instapay", name: "InstaPay", icon: DollarSign },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Collect Payment for {appointment?.clientName || "Appointment"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Payment info - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <p className="font-semibold capitalize">
                  {appointment.paymentStatus || "unpaid"}
                </p>
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold">${appointmentAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Package info - responsive */}
          {appointment.isPackage && (
            <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Sessions Progress
                </p>
                <p className="font-semibold">
                  {sessionsPaid} of {totalSessions} ({remainingSessions}{" "}
                  remaining)
                </p>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant={
                      paymentMethod === method.id ? "default" : "outline"
                    }
                    className="flex flex-col items-center justify-center h-12 gap-1 p-2"
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-xs">{method.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Buttons - responsive stacking */}
          <div className="flex flex-col sm:flex-row gap-2">
            {appointment.isPackage ? (
              // --- PACKAGE APPOINTMENT ---
              <>
                {/* Button to pay for the ENTIRE package upfront */}
                <Button
                  onClick={handlePurchasePackage}
                  disabled={
                    loading ||
                    appointment.paymentStatus === "paid" ||
                    sessionsPaid > 0 // Prevent repurchasing if sessions already paid
                  }
                  className="h-12 sm:h-9 flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  {loading
                    ? "Processing..."
                    : `Buy Package (${totalSessions} sessions)`}
                </Button>

                {/* Button to pay for ONE session within the package (if not fully paid) */}
                {/* Only show if package isn't fully paid yet */}
                {(sessionsPaid < totalSessions ||
                  appointment.paymentStatus !== "paid") && (
                  <Button
                    onClick={handleSinglePayment}
                    disabled={
                      loading ||
                      (appointment.paymentStatus === "paid" &&
                        sessionsPaid >= totalSessions)
                    }
                    className="h-12 sm:h-9 flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    {loading ? "Collecting..." : "Pay Single Session"}
                  </Button>
                )}
              </>
            ) : (
              // --- NON-PACKAGE APPOINTMENT ---
              <Button
                onClick={handleSinglePayment}
                disabled={loading || appointment.paymentStatus === "paid"}
                className="h-12 sm:h-9 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {loading ? "Collecting..." : "Mark as Paid"}
              </Button>
            )}
          </div>

          {/* Partial payment form - responsive */}
          {/* Show partial payment option if not fully paid */}
          {(appointment.paymentStatus !== "paid" ||
            (appointment.isPackage && sessionsPaid < totalSessions)) && (
            <form onSubmit={handlePartialPayment} className="space-y-3 mt-4">
              <Label
                htmlFor="partial-amount"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Or Collect Partial Payment
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="partial-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingAmount} // Prevent overpayment
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(e.target.value)}
                  required
                  placeholder={`Enter amount (max $${remainingAmount.toFixed(
                    2
                  )})`}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 sm:h-9 flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button
            onClick={() => {
              setOpen(false);
              setAmountCollected("");
            }}
            variant="secondary"
            className="h-12 sm:h-9 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectPaymentDialog;
