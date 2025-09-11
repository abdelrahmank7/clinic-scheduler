import React from "react";
import { Badge } from "@/components/ui/badge";
import { DollarSignIcon } from "lucide-react";

const PaymentStatusBadge = ({ status, amount }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "paid":
        return {
          variant: "success",
          text: `Paid $${amount}`,
          className: "bg-green-500 hover:bg-green-600",
          icon: <DollarSignIcon className="h-3 w-3 mr-1" />,
        };
      case "unpaid":
        return {
          variant: "destructive",
          text: `Unpaid $${amount}`,
          className: "bg-red-500 hover:bg-red-600",
          icon: null,
        };
      case "package":
        return {
          variant: "secondary",
          text: `Package $${amount}`,
          className: "bg-orange-500 hover:bg-orange-600",
          icon: null,
        };
      case "partial":
        return {
          variant: "outline",
          text: `Partial $${amount}`,
          className: "bg-yellow-500 hover:bg-yellow-600",
          icon: null,
        };
      default:
        return {
          variant: "outline",
          text: "Unknown",
          className: "bg-gray-500 hover:bg-gray-600",
          icon: null,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.icon}
      {config.text}
    </Badge>
  );
};

export default PaymentStatusBadge;
