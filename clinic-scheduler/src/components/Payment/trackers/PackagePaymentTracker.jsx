// src/components/Payment/trackers/PackagePaymentTracker.jsx
import React from "react";
import { useClinic } from "@/contexts/ClinicContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PaymentService } from "@/services/payment-service";
import { toast } from "@/components/ui/use-toast";

export default function PackagePaymentTracker({ appointment, onUpdate }) {
  const { selectedLocations } = useClinic();
  const [processing, setProcessing] = React.useState(false);

  // Derived package progress
  const progress = appointment?.isPackage
    ? Math.round((appointment.sessionsPaid / appointment.packageSessions) * 100)
    : 0;

  const handleAddSession = async () => {
    if (!appointment?.id) return;

    setProcessing(true);
    try {
      await PaymentService.processPayment({
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        amount: 0, // Free session
        isPackage: true,
        isPrepayment: false,
        location: selectedLocations[0] || "default",
      });
      toast({ title: "Session added successfully" });
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Failed to add session",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!appointment?.isPackage) return null;

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Package Progress</h3>
        <Badge variant={progress >= 100 ? "default" : "secondary"}>
          {progress}% Complete
        </Badge>
      </div>

      <Progress value={progress} />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Sessions</p>
          <p>
            {appointment.sessionsPaid}/{appointment.packageSessions}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Amount Paid</p>
          <p>{formatCurrency(appointment.amountPaid)}</p>
        </div>
      </div>

      {progress < 100 && (
        <Button size="sm" onClick={handleAddSession} disabled={processing}>
          {processing ? "Processing..." : "Mark Session Completed"}
        </Button>
      )}
    </div>
  );
}
