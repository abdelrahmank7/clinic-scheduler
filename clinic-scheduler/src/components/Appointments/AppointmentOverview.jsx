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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] p-4">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-lg sm:text-xl">
            Appointment Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg">
            <Label className="font-semibold text-sm">Client</Label>
            <p className="mt-1">{clientName}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-muted p-3 rounded-lg">
              <Label className="font-semibold text-sm">Type</Label>
              <p className="mt-1">{toTitleCase(appointment.title)}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <Label className="font-semibold text-sm">Time</Label>
              <p className="mt-1 text-sm">
                {formatDateTime(startDate)} - {formatTime(endDate)}
              </p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <Label className="font-semibold text-sm">Notes</Label>
            <p className="mt-1 p-2 bg-background rounded-md whitespace-pre-wrap text-sm">
              {notes}
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <Label className="font-semibold text-sm">Payment Status</Label>
            <div className="mt-2">
              <PaymentStatusBadge
                status={appointment.paymentStatus}
                amount={appointment.amount}
              />
            </div>
          </div>

          {/* Display package name if applicable */}
          {appointment.isPackage && appointment.packageName && (
            <div className="bg-muted p-3 rounded-lg">
              <Label className="font-semibold text-sm">Package</Label>
              <p className="mt-1">{appointment.packageName}</p>
            </div>
          )}

          {appointment.isPackage && (
            <div>
              <Label className="font-semibold text-sm mb-2 block">
                Package Details
              </Label>
              <PackagePaymentTracker appointment={appointment} />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <CollectPaymentDialog appointment={appointment}>
            <Button variant="outline" className="h-12 sm:h-9">
              Collect Payment
            </Button>
          </CollectPaymentDialog>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-3">
          <Button onClick={onClose} variant="secondary" className="h-12 sm:h-9">
            Close
          </Button>
          <Button
            onClick={() => {
              onEdit(appointment);
            }}
            className="h-12 sm:h-9"
          >
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentOverview;
