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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { Badge } from "@/components/ui/badge"; // Import Badge
import moment from "moment";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Calendar, FileText } from "lucide-react"; // Import icons for actions/status
import PaymentStatusBadge from "../Payment/PaymentStatusBadge"; // Import the existing payment badge

// --- Helper Functions (remains the same) ---
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

// --- Status Icon Component ---
const StatusIcon = ({ status, endTime }) => {
  const isPast = moment(endTime).isBefore(moment());
  const isCompleted = status === "done";
  const isMissed = status === "missed";
  const isPostponed = status === "postponed";

  let IconComponent = Clock; // Default for 'pending' or other statuses
  let iconColor = "text-gray-500"; // Default color

  if (isCompleted) {
    iconColor = isPast ? "text-green-700" : "text-green-500";
    IconComponent = CheckCircle2;
  } else if (isMissed) {
    iconColor = isPast ? "text-red-700" : "text-red-500";
    IconComponent = XCircle;
  } else if (isPostponed) {
    iconColor = isPast ? "text-orange-700" : "text-orange-500";
    IconComponent = Clock; // Or a specific postponement icon if desired
  }

  return <IconComponent className={`h-4 w-4 ${iconColor}`} />;
};

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
    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (querySnapshot) => {
        const appointmentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start.toDate(),
          end: doc.data().end.toDate(),
        }));
        setAppointments(appointmentsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching appointments:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [clientId]);

  // Determine status class for badge background (optional, can use default Badge styling)
  const getStatusClass = (status, endTime) => {
    const isPast = moment(endTime).isBefore(moment());
    switch (status) {
      case "done":
        return isPast
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-green-100 text-green-800 border-green-200";
      case "missed":
        return isPast
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-red-100 text-red-800 border-red-200";
      case "postponed":
        return isPast
          ? "bg-orange-100 text-orange-800 border-orange-200"
          : "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return isPast
          ? "bg-gray-100 text-gray-800 border-gray-200"
          : "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-center">Loading appointments...</p>
        <Progress value={50} className="w-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Appointment History
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}{" "}
        found
      </p>
      {appointments.length > 0 ? (
        // --- WRAP LIST IN SCROLL AREA ---
        <ScrollArea className="h-96 w-full rounded-md border p-2">
          {" "}
          {/* Adjust height as needed */}
          <ul className="space-y-3">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="p-3 border rounded-lg shadow-sm hover:bg-accent transition-colors" // Increased padding and added hover effect
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      status={appointment.status}
                      endTime={appointment.end}
                    />
                    <h4 className="font-medium text-sm">
                      {toTitleCase(appointment.title)}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      className={cn(
                        "text-xs",
                        getStatusClass(appointment.status, appointment.end)
                      )}
                    >
                      {appointment.status
                        ? toTitleCase(appointment.status)
                        : "Pending"}
                    </Badge>
                    {/* Show payment status if available */}
                    {appointment.paymentStatus && (
                      <PaymentStatusBadge
                        status={appointment.paymentStatus}
                        amount={appointment.amount}
                        className="text-xs"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-2 mb-2">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDateTime(appointment.start)}</span>
                  <span>-</span>
                  <span>{formatTime(appointment.end)}</span>
                </div>
                {appointment.notes && (
                  <div className="flex items-start text-xs text-muted-foreground gap-1 mb-2">
                    <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{appointment.notes}</span>
                  </div>
                )}
                <div className="flex justify-end gap-1 mt-2">
                  <Button
                    size="xs"
                    variant={
                      appointment.status === "done" ? "default" : "outline"
                    }
                    onClick={() => onUpdateStatus(appointment.id, "done")}
                    className="h-7 px-2"
                    title="Mark as Done"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="xs"
                    variant={
                      appointment.status === "missed" ? "default" : "outline"
                    }
                    onClick={() => onUpdateStatus(appointment.id, "missed")}
                    className="h-7 px-2"
                    title="Mark as Missed"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                  <Button
                    size="xs"
                    variant={
                      appointment.status === "postponed" ? "default" : "outline"
                    }
                    onClick={() => onUpdateStatus(appointment.id, "postponed")}
                    className="h-7 px-2"
                    title="Mark as Postponed"
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
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
