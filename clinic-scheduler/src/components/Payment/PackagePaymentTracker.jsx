import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PaymentStatusBadge from "./PaymentStatusBadge";

const PackagePaymentTracker = ({ appointment }) => {
  if (!appointment.isPackage) return null;

  const progress =
    (appointment.sessionsPaid / appointment.packageSessions) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Package Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sessions Completed</span>
            <span>
              {appointment.sessionsPaid} / {appointment.packageSessions}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>Amount Paid</span>
            <span>
              $
              {(
                (appointment.amount * appointment.sessionsPaid) /
                appointment.packageSessions
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PackagePaymentTracker;
