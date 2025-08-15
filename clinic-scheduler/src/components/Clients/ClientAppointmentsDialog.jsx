// src/components/Clients/ClientAppointmentsDialog.jsx

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // 👇 Import Button

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
  const options = { hour: "2-digit", minute: "2-digit", hour12: true };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const toTitleCase = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// 👇 Accept the new onUpdateStatus prop
function ClientAppointmentsDialog({ clientId, onUpdateStatus }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("clientId", "==", clientId),
      orderBy("start", "desc")
    );
    const unsubscribe = onSnapshot(appointmentsQuery, (querySnapshot) => {
      const appointmentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate(),
      }));
      setAppointments(appointmentsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [clientId]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <p>Loading appointments...</p>
        <Progress value={50} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Appointment History</h3>
      {appointments.length > 0 ? (
        <ul className="space-y-3">
          {appointments.map((appointment) => (
            <li
              key={appointment.id}
              className="p-4 border rounded-md shadow-sm"
            >
              <p className="font-medium">{toTitleCase(appointment.title)}</p>
              <p className="text-sm text-gray-600">
                {formatDateTime(appointment.start)} -{" "}
                {formatTime(appointment.end)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Status:</span>
                  <Badge
                    variant={
                      appointment.status === "done"
                        ? "success"
                        : appointment.status === "missed"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {appointment.status
                      ? toTitleCase(appointment.status)
                      : "Pending"}
                  </Badge>
                </div>
                {/* 👇 Add the buttons to change the status */}
                <div className="flex items-center gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onUpdateStatus(appointment.id, "done")}
                  >
                    Done
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onUpdateStatus(appointment.id, "missed")}
                  >
                    Missed
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onUpdateStatus(appointment.id, "postponed")}
                  >
                    Postpone
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Alert>
          <AlertTitle>No Appointments Found</AlertTitle>
          <AlertDescription>
            This client does not have any appointments yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ClientAppointmentsDialog;
