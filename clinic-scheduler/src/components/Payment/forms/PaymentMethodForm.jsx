// src/components/Payment/forms/PaymentMethodForm.jsx
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wallet, Banknote } from "lucide-react";

const PaymentMethodForm = ({
  appointment,
  onPaymentMethodChange,
  initialData = {},
}) => {
  const [paymentData, setPaymentData] = useState({
    paymentMethod: initialData.paymentMethod || "cash",
    amount: initialData.amount || appointment?.amount || 0,
    paymentStatus:
      initialData.paymentStatus || appointment?.paymentStatus || "unpaid",
    isPackage: initialData.isPackage || appointment?.isPackage || false,
    packageSessions:
      initialData.packageSessions || appointment?.packageSessions || 1,
    sessionsPaid: initialData.sessionsPaid || appointment?.sessionsPaid || 0,
    ...initialData,
  });

  const handleInputChange = (field, value) => {
    const newData = { ...paymentData, [field]: value };
    setPaymentData(newData);
    if (onPaymentMethodChange) {
      onPaymentMethodChange(newData);
    }
  };

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: Wallet },
    { id: "card", name: "Credit/Debit Card", icon: CreditCard },
    { id: "bank", name: "Bank Transfer", icon: Banknote },
    { id: "other", name: "Other", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {paymentMethods.map((method) => {
              const IconComponent = method.icon;
              return (
                <Button
                  key={method.id}
                  variant={
                    paymentData.paymentMethod === method.id
                      ? "default"
                      : "outline"
                  }
                  className="flex flex-col items-center justify-center h-20 gap-2 p-2"
                  onClick={() => handleInputChange("paymentMethod", method.id)}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-xs">{method.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select
            value={paymentData.paymentStatus}
            onValueChange={(value) => handleInputChange("paymentStatus", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($)</Label>
          <Input
            type="number"
            id="amount"
            value={paymentData.amount}
            onChange={(e) =>
              handleInputChange("amount", parseFloat(e.target.value) || 0)
            }
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Payment Type</Label>
        <RadioGroup
          value={paymentData.isPackage ? "package" : "single"}
          onValueChange={(value) =>
            handleInputChange("isPackage", value === "package")
          }
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single">Single Session</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="package" id="package" />
            <Label htmlFor="package">Package</Label>
          </div>
        </RadioGroup>
      </div>

      {paymentData.isPackage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="packageSessions">Total Sessions in Package</Label>
            <Input
              type="number"
              id="packageSessions"
              value={paymentData.packageSessions}
              onChange={(e) =>
                handleInputChange(
                  "packageSessions",
                  parseInt(e.target.value) || 1
                )
              }
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionsPaid">Sessions Paid For</Label>
            <Input
              type="number"
              id="sessionsPaid"
              value={paymentData.sessionsPaid}
              onChange={(e) =>
                handleInputChange("sessionsPaid", parseInt(e.target.value) || 0)
              }
              min="0"
              max={paymentData.packageSessions}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodForm;
