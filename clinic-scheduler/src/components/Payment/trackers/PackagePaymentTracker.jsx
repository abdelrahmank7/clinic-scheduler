// src/components/Payment/trackers/PackagePaymentTracker.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/Payment";

const PackagePaymentTracker = ({ appointment }) => {
  if (!appointment?.isPackage) return null;

  const totalSessions = appointment.packageSessions || 1;
  const sessionsPaid = appointment.sessionsPaid || 0;
  const progress = Math.min((sessionsPaid / totalSessions) * 100, 100);
  const amountPerSession = (appointment.amount || 0) / totalSessions;
  const amountPaid = amountPerSession * sessionsPaid;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Package Progress</span>
          <Badge variant="secondary">
            {sessionsPaid}/{totalSessions} Sessions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Amount Paid</p>
            <p className="font-semibold text-lg">
              {formatCurrency(amountPaid)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Remaining</p>
            <p className="font-semibold text-lg">
              {formatCurrency((appointment.amount || 0) - amountPaid)}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Package total: {formatCurrency(appointment.amount || 0)} for{" "}
            {totalSessions} sessions
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PackagePaymentTracker;
