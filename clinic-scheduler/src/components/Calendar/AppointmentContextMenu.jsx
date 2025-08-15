// src/components/Calendar/AppointmentContextMenu.jsx

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle, XCircle, Clock } from "lucide-react"; // <-- NEW: Import icons

function AppointmentContextMenu({
  x,
  y,
  isVisible,
  appointment, // <-- NEW: Receive appointment object
  onClose, // <-- NEW: Add onClose handler
  onEdit,
  onMarkDone,
  onMarkMissed,
  onMarkPostponed,
}) {
  // <-- NEW: Handle outside clicks to close the menu
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Check if the click is outside the context menu
      if (
        isVisible &&
        event.target.closest(".appointment-context-menu") === null
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 bg-white shadow-lg rounded-md p-2 flex flex-col gap-1 border appointment-context-menu"
      onClick={(e) => e.stopPropagation()} // Prevent click from bubbling up and closing immediately
    >
      {/* <-- UPDATED: Add icons and simplified onClick handlers */}
      <Button
        variant="ghost"
        className="justify-start flex gap-2"
        onClick={() => onEdit(appointment)}
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="ghost"
        className="justify-start flex gap-2"
        onClick={() => onMarkDone(appointment)}
      >
        <CheckCircle className="h-4 w-4 text-green-500" />
        Mark as Done
      </Button>
      <Button
        variant="ghost"
        className="justify-start flex gap-2"
        onClick={() => onMarkMissed(appointment)}
      >
        <XCircle className="h-4 w-4 text-red-500" />
        Mark as Missed
      </Button>
      <Button
        variant="ghost"
        className="justify-start flex gap-2"
        onClick={() => onMarkPostponed(appointment)}
      >
        <Clock className="h-4 w-4 text-blue-500" />
        Mark as Postponed
      </Button>
    </div>
  );
}

export default AppointmentContextMenu;
