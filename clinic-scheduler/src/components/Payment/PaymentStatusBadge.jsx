import React from "react";
import { Badge } from "@/components/ui/badge";

const PaymentStatusBadge = ({ status, amount }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "paid":
        return {
          variant: "success",
          text: `Paid $${amount}`,
          className: "bg-green-500 hover:bg-green-600",
        };
      case "unpaid":
        return {
          variant: "destructive",
          text: `Unpaid $${amount}`,
          className: "bg-red-500 hover:bg-red-600",
        };
      case "package":
        return {
          variant: "secondary",
          text: `Package $${amount}`,
          className: "bg-orange-500 hover:bg-orange-600",
        };
      case "partial":
        return {
          variant: "outline",
          text: `Partial $${amount}`,
          className: "bg-yellow-500 hover:bg-yellow-600",
        };
      default:
        return {
          variant: "outline",
          text: "Unknown",
          className: "bg-gray-500 hover:bg-gray-600",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.text}
    </Badge>
  );
};

export default PaymentStatusBadge;
