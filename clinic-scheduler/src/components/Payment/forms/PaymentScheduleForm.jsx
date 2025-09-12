// src/components/Payment/forms/PaymentScheduleForm.jsx
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";

const PaymentScheduleForm = ({
  appointment,
  onScheduleChange,
  initialData = {},
}) => {
  const [scheduleData, setScheduleData] = useState({
    paymentSchedule: initialData.paymentSchedule || "immediate",
    dueDate: initialData.dueDate || null,
    installmentPlan: initialData.installmentPlan || false,
    numberOfInstallments: initialData.numberOfInstallments || 1,
    installmentFrequency: initialData.installmentFrequency || "weekly",
    ...initialData,
  });

  const handleInputChange = (field, value) => {
    const newData = { ...scheduleData, [field]: value };
    setScheduleData(newData);
    if (onScheduleChange) {
      onScheduleChange(newData);
    }
  };

  const calculateInstallmentAmount = () => {
    const totalAmount = appointment?.amount || 0;
    const numberOfInstallments = scheduleData.numberOfInstallments || 1;
    return (totalAmount / numberOfInstallments).toFixed(2);
  };

  const generateInstallmentDates = () => {
    if (!scheduleData.installmentPlan || !appointment?.start) return [];

    const startDate = new Date(appointment.start);
    const dates = [];
    const numberOfInstallments = scheduleData.numberOfInstallments || 1;

    for (let i = 0; i < numberOfInstallments; i++) {
      let date;
      switch (scheduleData.installmentFrequency) {
        case "daily":
          date = addDays(startDate, i);
          break;
        case "weekly":
          date = addWeeks(startDate, i);
          break;
        case "monthly":
          date = addMonths(startDate, i);
          break;
        default:
          date = addWeeks(startDate, i);
      }
      dates.push(date);
    }

    return dates;
  };

  const installmentDates = generateInstallmentDates();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentSchedule">Payment Timing</Label>
            <Select
              value={scheduleData.paymentSchedule}
              onValueChange={(value) =>
                handleInputChange("paymentSchedule", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate Payment</SelectItem>
                <SelectItem value="due_date">Due on Specific Date</SelectItem>
                <SelectItem value="installment">Installment Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scheduleData.paymentSchedule === "due_date" && (
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                type="date"
                id="dueDate"
                value={
                  scheduleData.dueDate
                    ? format(new Date(scheduleData.dueDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
              />
            </div>
          )}

          {scheduleData.paymentSchedule === "installment" && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfInstallments">
                    Number of Installments
                  </Label>
                  <Input
                    type="number"
                    id="numberOfInstallments"
                    value={scheduleData.numberOfInstallments}
                    onChange={(e) =>
                      handleInputChange(
                        "numberOfInstallments",
                        parseInt(e.target.value) || 1
                      )
                    }
                    min="1"
                    max="12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installmentFrequency">Frequency</Label>
                  <Select
                    value={scheduleData.installmentFrequency}
                    onValueChange={(value) =>
                      handleInputChange("installmentFrequency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-background p-3 rounded-md">
                <p className="font-medium">Installment Details:</p>
                <p className="text-sm">
                  Amount per installment:{" "}
                  <strong>${calculateInstallmentAmount()}</strong>
                </p>
                <p className="text-sm">
                  Total installments:{" "}
                  <strong>{scheduleData.numberOfInstallments}</strong>
                </p>
              </div>

              {installmentDates.length > 0 && (
                <div className="space-y-2">
                  <Label>Installment Dates:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {installmentDates.map((date, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm p-2 bg-background rounded"
                      >
                        <span className="font-medium">#{index + 1}:</span>
                        <span>{format(date, "MMM dd, yyyy")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (onScheduleChange) {
              onScheduleChange(scheduleData);
            }
          }}
        >
          Save Schedule
        </Button>
      </div>
    </div>
  );
};

export default PaymentScheduleForm;
