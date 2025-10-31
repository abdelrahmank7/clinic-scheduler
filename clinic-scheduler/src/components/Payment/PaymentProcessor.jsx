// src/components/Payment/PaymentProcessor.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayments } from "@/hooks/usePayments";
import { useToast } from "@/components/ui/use-toast";
import { useClinic } from "@/contexts/ClinicContext";
import PaymentMethodForm from "./forms/PaymentMethodForm";
import PaymentScheduleForm from "./forms/PaymentScheduleForm";
import CollectPaymentDialog from "./dialogs/CollectPaymentDialog";
import { DollarSign, Calendar, Settings } from "lucide-react";

const PaymentProcessor = ({
  appointment,
  onSuccess,
  onCancel,
  showCollectButton = true,
}) => {
  const [activeTab, setActiveTab] = useState("method");
  const [paymentData, setPaymentData] = useState({
    paymentMethod: "cash",
    amount: appointment?.amount || 0,
    paymentStatus: appointment?.paymentStatus || "unpaid",
    isPackage: appointment?.isPackage || false,
    packageSessions: appointment?.packageSessions || 1,
    sessionsPaid: appointment?.sessionsPaid || 0,
  });

  const [scheduleData, setScheduleData] = useState({
    paymentSchedule: "immediate",
    dueDate: null,
    installmentPlan: false,
    numberOfInstallments: 1,
    installmentFrequency: "weekly",
  });

  const { processPayment, loading } = usePayments();
  const { toast } = useToast();
  const { selectedClinic } = useClinic();

  const handlePaymentMethodChange = (data) => {
    setPaymentData(data);
  };

  const handleScheduleChange = (data) => {
    setScheduleData(data);
  };

  const handleProcessPayment = async () => {
    try {
      const paymentPayload = {
        clinicId: selectedClinic,
        appointmentId: appointment?.id || null,
        clientId: appointment?.clientId || null,
        clientName: appointment?.clientName || "",
        amount: parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        paymentStatus: paymentData.paymentStatus,
        sessionDate: appointment?.start || new Date(),
        isPackage: paymentData.isPackage,
        packageSessions: paymentData.packageSessions,
        sessionsPaid: paymentData.sessionsPaid,
        ...scheduleData,
      };

      const result = await processPayment(paymentPayload);

      if (result.success) {
        toast({
          title: "Payment Processed",
          description: "Payment has been successfully processed.",
        });

        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Failed",
        description: "There was an error processing the payment.",
        variant: "destructive",
      });
    }
  };

  const handleAppointmentUpdate = (updateData) => {
    // This will be called when payment is collected via dialog
    if (onSuccess) {
      onSuccess({ success: true, appointmentUpdate: updateData });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="method" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Method
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="method" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodForm
                appointment={appointment}
                initialData={paymentData}
                onPaymentMethodChange={handlePaymentMethodChange}
              />
              <div className="flex justify-end mt-6">
                <Button onClick={() => setActiveTab("schedule")}>
                  Next: Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentScheduleForm
                appointment={appointment}
                initialData={scheduleData}
                onScheduleChange={handleScheduleChange}
              />
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("method")}
                >
                  Back
                </Button>
                <Button onClick={() => setActiveTab("review")}>
                  Next: Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Payment Details</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Client:</span>{" "}
                        {appointment?.clientName}
                      </p>
                      <p>
                        <span className="font-medium">Amount:</span> $
                        {paymentData.amount.toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Method:</span>{" "}
                        {paymentData.paymentMethod}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {paymentData.paymentStatus}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Schedule Details</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Timing:</span>{" "}
                        {scheduleData.paymentSchedule}
                      </p>
                      {scheduleData.paymentSchedule === "due_date" &&
                        scheduleData.dueDate && (
                          <p>
                            <span className="font-medium">Due Date:</span>{" "}
                            {new Date(
                              scheduleData.dueDate
                            ).toLocaleDateString()}
                          </p>
                        )}
                      {scheduleData.paymentSchedule === "installment" && (
                        <>
                          <p>
                            <span className="font-medium">Installments:</span>{" "}
                            {scheduleData.numberOfInstallments}
                          </p>
                          <p>
                            <span className="font-medium">Frequency:</span>{" "}
                            {scheduleData.installmentFrequency}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {paymentData.isPackage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Package Information</h4>
                    <p className="text-sm">
                      Sessions Paid: {paymentData.sessionsPaid} of{" "}
                      {paymentData.packageSessions}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("schedule")}
                  >
                    Back
                  </Button>

                  <div className="flex flex-wrap gap-2">
                    {showCollectButton && (
                      <CollectPaymentDialog
                        appointment={{
                          ...appointment,
                          ...paymentData,
                        }}
                        onPaymentCollected={handleAppointmentUpdate}
                      >
                        <Button variant="outline">Quick Collect</Button>
                      </CollectPaymentDialog>
                    )}

                    <Button onClick={handleProcessPayment} disabled={loading}>
                      {loading ? "Processing..." : "Process Payment"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {onCancel && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentProcessor;
