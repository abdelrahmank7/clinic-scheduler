// src/components/Payment/trackers/PaymentProgressTracker.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/Payment";

const PaymentProgressTracker = ({
  totalAmount,
  paidAmount,
  title = "Payment Progress",
  showAmounts = true,
}) => {
  const progress =
    totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  // Determine status based on progress
  let status = "in-progress";
  let statusText = "In Progress";
  let statusVariant = "secondary";

  if (progress >= 100) {
    status = "completed";
    statusText = "Completed";
    statusVariant = "default";
  } else if (progress === 0) {
    status = "not-started";
    statusText = "Not Started";
    statusVariant = "destructive";
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={statusVariant}>{statusText}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress
            value={progress}
            className="h-3"
            indicatorClassName={
              progress >= 100
                ? "bg-green-500"
                : progress > 50
                ? "bg-blue-500"
                : "bg-yellow-500"
            }
          />
        </div>

        {showAmounts && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Paid</p>
              <p className="font-semibold text-lg">
                {formatCurrency(paidAmount)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-semibold text-lg">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Total amount: {formatCurrency(totalAmount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentProgressTracker;
