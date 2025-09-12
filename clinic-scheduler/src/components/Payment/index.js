// src/components/Payment/index.js
// Export all payment-related components for easy importing

// Main Components
export { default as PaymentProcessor } from "./PaymentProcessor";
export { default as PaymentStatusBadge } from "./PaymentStatusBadge";
export { default as PaymentReports } from "./PaymentReports";

// Dialog Components
export { default as CollectPaymentDialog } from "./dialogs/CollectPaymentDialog";
export { default as RefundDialog } from "./dialogs/RefundDialog";
export { default as PaymentHistoryDialog } from "./dialogs/PaymentHistoryDialog";

// Form Components
export { default as PaymentMethodForm } from "./forms/PaymentMethodForm";
export { default as PaymentScheduleForm } from "./forms/PaymentScheduleForm";

// Report Components
export { default as RevenueDashboard } from "./reports/RevenueDashboard";
export { default as PaymentReportGenerator } from "./reports/PaymentReportGenerator";
export { default as ExportManager } from "./reports/ExportManager";

// Tracker Components
export { default as PackagePaymentTracker } from "./trackers/PackagePaymentTracker";
export { default as PaymentProgressTracker } from "./trackers/PaymentProgressTracker";

// Service Layer
export { PaymentService } from "@/services/payment-service";
export { ReportService } from "@/services/report-service";

// Hooks
export { usePayments } from "@/hooks/usePayments";
export { useRevenue } from "@/hooks/useRevenue";
export { usePaymentMethods } from "@/hooks/usePaymentMethods";

// Context
export { PaymentProvider, usePayment } from "@/contexts/PaymentContext.jsx";

// Utility functions
export const formatCurrency = (value) => {
  return value == null || isNaN(value)
    ? "$0.00"
    : value.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

export const getPaymentStatusColor = (status) => {
  switch (status) {
    case "paid":
      return "bg-green-500";
    case "unpaid":
      return "bg-red-500";
    case "partial":
      return "bg-yellow-500";
    case "package":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
};

export const calculatePackageProgress = (appointment) => {
  if (!appointment?.isPackage) return 100;

  const totalSessions = appointment.packageSessions || 1;
  const sessionsPaid = appointment.sessionsPaid || 0;

  return Math.min((sessionsPaid / totalSessions) * 100, 100);
};

export const validatePaymentAmount = (amount, appointment) => {
  const numericAmount = Number(amount);

  if (isNaN(numericAmount) || numericAmount < 0) {
    return { valid: false, error: "Invalid amount" };
  }

  if (appointment?.isPackage) {
    const sessionAmount =
      (appointment.amount || 0) / (appointment.packageSessions || 1);
    if (numericAmount > sessionAmount) {
      return {
        valid: false,
        error: `Amount cannot exceed $${sessionAmount.toFixed(2)} per session`,
      };
    }
  }

  return { valid: true };
};
