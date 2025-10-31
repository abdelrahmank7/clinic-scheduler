import React, { useState } from "react";
import ClosedDaysManager from "../components/ClosedDaysManager";
import { Button } from "../components/ui/button";
import { CalendarX } from "lucide-react";

function ClosedDaysButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Manage Closed Days"
        className="fixed md:absolute z-30 bottom-6 right-6 md:static md:bottom-auto md:right-auto flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
        onClick={() => setOpen(true)}
        title="Manage Closed Days"
      >
        <CalendarX className="w-5 h-5" />
        <span className="hidden md:inline">Manage Closed Days</span>
      </button>
      <ClosedDaysManager open={open} onOpenChange={setOpen} />
    </>
  );
}

export default ClosedDaysButton;
