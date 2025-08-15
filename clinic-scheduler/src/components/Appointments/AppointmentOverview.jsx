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

// Helper function to format a string to title case
const toTitleCase = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to safely get a JS Date object from a Firestore Timestamp or a JS Date
const getJsDate = (date) => {
  return date instanceof Timestamp ? date.toDate() : date;
};

// Helper function for native date formatting
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="font-semibold">Client</Label>
            <p>{clientName}</p>
          </div>
          <div>
            <Label className="font-semibold">Type</Label>
            <p>{toTitleCase(appointment.title)}</p>
          </div>
          <div>
            <Label className="font-semibold">Time</Label>
            <p>
              {formatDateTime(startDate)} - {formatTime(endDate)}
            </p>
          </div>
          <div>
            <Label className="font-semibold">Notes</Label>
            <p className="mt-1 p-2 bg-gray-100 rounded-md whitespace-pre-wrap">
              {notes}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
          <Button
            onClick={() => {
              onEdit(appointment);
              onClose();
            }}
          >
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentOverview;
