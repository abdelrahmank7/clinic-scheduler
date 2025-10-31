// src/components/Payment/PaymentStatusBadge.jsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
} from "lucide-react";

const formatCurrency = (v) =>
  v == null || isNaN(v)
    ? "$0.00"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD" });

const PaymentStatusBadge = ({ status, amount, className = "" }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "paid":
        return {
          variant: "default",
          text: `Paid ${formatCurrency(amount)}`,
          className: "bg-green-500 hover:bg-green-600 text-white",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "unpaid":
        return {
          variant: "destructive",
          text: `Unpaid ${formatCurrency(amount)}`,
          className: "bg-red-500 hover:bg-red-600 text-white",
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
        };
      case "partial":
        return {
          variant: "secondary",
          text: `Partial ${formatCurrency(amount)}`,
          className: "bg-yellow-500 hover:bg-yellow-600 text-white",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "package":
        return {
          variant: "outline",
          text: `Package ${formatCurrency(amount)}`,
          className: "bg-blue-500 hover:bg-blue-600 text-white",
          icon: <Package className="h-3 w-3 mr-1" />,
        };
      default:
        return {
          variant: "default",
          text: status || "Unknown",
          className: "bg-gray-500 hover:bg-gray-600 text-white",
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1`}
    >
      {config.icon}
      <span className="text-xs sm:text-sm font-medium">{config.text}</span>
    </Badge>
  );
};

export default PaymentStatusBadge;
