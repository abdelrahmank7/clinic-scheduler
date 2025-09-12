// src/components/Payment/dialogs/PaymentHistoryDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { usePayment } from "@/contexts/PaymentContext.jsx";
import PaymentStatusBadge from "../PaymentStatusBadge";
import RefundDialog from "./RefundDialog";

const PaymentHistoryDialog = ({ clientId, clientName, children }) => {
  const [open, setOpen] = useState(false);
  const { payments, loading } = usePayment();
  const [clientPayments, setClientPayments] = useState([]);

  useEffect(() => {
    if (open && clientId) {
      const filteredPayments = payments.filter(
        (payment) => payment.clientId === clientId
      );
      setClientPayments(filteredPayments);
    }
  }, [open, clientId, payments]);

  const totalPaid = clientPayments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle>Payment History - {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold">Total Amount Paid</h3>
            <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              From {clientPayments.length} payment
              {clientPayments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Loading payment history...</p>
            </div>
          ) : clientPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment history found for this client.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="p-3 sm:p-4 font-semibold bg-muted text-sm sm:text-base">
                Payment History
              </div>
              <div className="max-h-96 overflow-y-auto">
                <Table className="text-xs sm:text-sm">
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead className="p-2">Date</TableHead>
                      <TableHead className="p-2">Amount</TableHead>
                      <TableHead className="p-2">Method</TableHead>
                      <TableHead className="p-2">Status</TableHead>
                      <TableHead className="p-2">Session Date</TableHead>
                      <TableHead className="p-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPayments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        className="border-t hover:bg-muted/50"
                      >
                        <TableCell className="p-2">
                          {format(new Date(payment.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="p-2 font-medium">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2 capitalize">
                          {payment.paymentMethod}
                        </TableCell>
                        <TableCell className="p-2">
                          <PaymentStatusBadge
                            status={payment.paymentStatus}
                            amount={payment.amount}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          {format(
                            new Date(payment.sessionDate),
                            "MMM dd, yyyy"
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          {payment.paymentStatus === "paid" && (
                            <RefundDialog payment={payment}>
                              <Button variant="outline" size="sm">
                                Refund
                              </Button>
                            </RefundDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentHistoryDialog;
