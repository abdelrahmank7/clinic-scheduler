// src/components/Payment/dialogs/RefundDialog.jsx
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
import { Textarea } from "@/components/ui/textarea";
import { usePayments } from "@/hooks/usePayments";
import { useToast } from "@/components/ui/use-toast";

const RefundDialog = ({ payment, children }) => {
  const [open, setOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { refundPayment } = usePayments();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const refundAmountNum = parseFloat(refundAmount);

    if (isNaN(refundAmountNum) || refundAmountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid refund amount.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (refundAmountNum > payment.amount) {
      toast({
        title: "Invalid Amount",
        description: "Refund amount cannot exceed the original payment.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the refund.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const result = await refundPayment(payment.id, refundAmountNum, reason);

      if (result.success) {
        toast({
          title: "Refund Processed",
          description: `Successfully refunded $${refundAmountNum.toFixed(2)}.`,
        });
        setOpen(false);
        setRefundAmount("");
        setReason("");
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      toast({
        title: "Refund Failed",
        description: "There was an error processing the refund.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Original Payment</Label>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-semibold">{payment.clientName}</p>
              <p className="text-sm text-muted-foreground">
                ${payment.amount.toFixed(2)} on{" "}
                {new Date(payment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-amount">Refund Amount</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={payment.amount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Maximum refund: ${payment.amount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for refund..."
              required
              rows={3}
            />
          </div>
        </form>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setOpen(false)}
            variant="secondary"
            className="h-12 sm:h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-12 sm:h-9"
          >
            {loading ? "Processing..." : "Process Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;
