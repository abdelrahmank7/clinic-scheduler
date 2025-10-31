// src/components/Appointments/AppointmentOverview.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Timestamp } from "firebase/firestore";
import {
  User,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Package,
} from "lucide-react";

import PaymentStatusBadge from "../Payment/PaymentStatusBadge";
import PackagePaymentTracker from "../Payment/trackers/PackagePaymentTracker";
import CollectPaymentDialog from "../Payment/dialogs/CollectPaymentDialog";

const toTitleCase = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getJsDate = (date) => {
  return date instanceof Timestamp ? date.toDate() : date;
};

const formatDateTime = (date) => {
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const formatTime = (date) => {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const AppointmentOverview = ({ appointment, isOpen, onClose, onEdit }) => {
  if (!appointment) return null;

  const startDate = getJsDate(appointment.start);
  const endDate = getJsDate(appointment.end);
  const clientName = appointment.clientName || "N/A";
  const notes = appointment.notes || "N/A";
  const totalSessions = appointment?.packageSessions || 1;
  const sessionsPaid = appointment?.sessionsPaid || 0;
  const amountPaid = appointment?.amountPaid || 0;
  const remainingAmount = (appointment?.amount || 0) - amountPaid;

  // Check if this is a session from a paid package
  const isSessionFromPackage =
    appointment.isPackage && appointment.packageId && sessionsPaid > 0;

  // Handle payment collection - update parent state but don't re-open overview
  const handlePaymentCollected = (updateData) => {
    console.log("Payment collected, updateData:", updateData); // Debug log
    // Pass the updated appointment data back to the parent
    // The parent component (e.g., DashboardPage) should update its state,
    // which will cause the AppointmentOverview to re-render with the new data.
    // It should NOT re-open the overview dialog itself.
    if (onEdit) {
      // Pass the updated data to the parent, which should handle the state update
      // This assumes onEdit is used for both opening the edit form AND updating the list
      // If onEdit is *only* for opening the edit form, you need a different callback from the parent
      // e.g., onAppointmentUpdated
      onEdit({ ...appointment, ...updateData });
    }
    // Do NOT call onClose() here, let the parent manage the dialog state
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold text-sm">Client</Label>
            </div>
            <p className="mt-1">{clientName}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold text-sm">Type</Label>
              </div>
              <p className="mt-1">{toTitleCase(appointment.title)}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold text-sm">Time</Label>
              </div>
              <p className="mt-1 text-sm">
                {formatDateTime(startDate)} - {formatTime(endDate)}
              </p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold text-sm">Notes</Label>
            </div>
            <p className="mt-1 p-2 bg-background rounded-md whitespace-pre-wrap text-sm">
              {notes}
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold text-sm">Payment Status</Label>
            </div>
            <div className="mt-2">
              <PaymentStatusBadge
                status={appointment.paymentStatus}
                amount={appointment.amount}
              />
            </div>
          </div>

          {/* Display remaining amount for partial payments */}
          {appointment.paymentStatus === "partial" && remainingAmount > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <Label className="font-semibold text-sm">Remaining Amount</Label>
              <p className="text-lg font-bold text-yellow-700 mt-1">
                ${remainingAmount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Display package info if applicable */}
          {appointment.isPackage && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold text-sm">Package</Label>
              </div>
              <div className="space-y-1">
                <p className="text-sm">
                  {appointment.packageName || "Package Appointment"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sessionsPaid} of {totalSessions} sessions paid
                </p>
                {isSessionFromPackage && (
                  <p className="text-xs text-green-600 font-medium">
                    Session from paid package
                  </p>
                )}
              </div>
            </div>
          )}

          {appointment.isPackage && (
            <div>
              <Label className="font-semibold text-sm mb-2 block flex items-center gap-2">
                <Package className="h-4 w-4" />
                Package Details
              </Label>
              <PackagePaymentTracker appointment={appointment} />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <CollectPaymentDialog
            appointment={appointment}
            // Pass the new handler that updates parent state without reopening
            onPaymentCollected={handlePaymentCollected}
          >
            <Button
              variant="outline"
              className="h-12 sm:h-9 flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Collect Payment
            </Button>
          </CollectPaymentDialog>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-3">
          <Button
            onClick={onClose}
            variant="secondary"
            className="h-12 sm:h-9 flex items-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Close
          </Button>
          <Button
            onClick={() => {
              onEdit(appointment);
            }}
            className="h-12 sm:h-9 flex items-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentOverview;
