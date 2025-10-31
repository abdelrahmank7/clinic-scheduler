// src/components/Calendar.jsx

import React, { useState, useEffect, useRef } from "react";
import { getClosedDays } from "@/services/closed-day-service";
import ClosedDaysManager from "./ClosedDaysManager";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import AppointmentForm from "./Appointments/AppointmentForm";
import AppointmentOverview from "./Appointments/AppointmentOverview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

const Calendar = ({ selectedClient, onClientSelect }) => {
  const [appointments, setAppointments] = useState([]);
  const [closedDays, setClosedDays] = useState([]);
  const [showClosedDays, setShowClosedDays] = useState(false);
  const [showClosedDaysManager, setShowClosedDaysManager] = useState(false);
  // Fetch closed days from Firestore only for calendar display
  useEffect(() => {
    if (!showClosedDays) return;
    async function fetchClosedDays() {
      try {
        const days = await getClosedDays();
        setClosedDays(days);
      } catch (err) {
        setClosedDays([]);
      }
    }
    fetchClosedDays();
  }, [showClosedDays]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [initialStart, setInitialStart] = useState(null);
  const [initialEnd, setInitialEnd] = useState(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    const appointmentsCollectionRef = collection(db, "appointments");
    let q;

    if (selectedClient) {
      q = query(
        appointmentsCollectionRef,
        where("clientId", "==", selectedClient.id),
        orderBy("start", "asc")
      );
    } else {
      q = query(appointmentsCollectionRef, orderBy("start", "asc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAppointments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate(),
      }));
      setAppointments(fetchedAppointments);
    });

    return () => unsubscribe();
  }, [selectedClient]);

  const handleDateClick = (arg) => {
    setAppointmentToEdit(null);
    setInitialStart(arg.date);
    setInitialEnd(new Date(arg.date.getTime() + 3600000)); // Default to 1 hour
    setIsFormOpen(true);
  };

  const handleEventClick = (info) => {
    const clickedAppointment = appointments.find(
      (app) => app.id === info.event.id
    );
    if (clickedAppointment) {
      setSelectedAppointment(clickedAppointment);
      setIsOverviewOpen(true);
    }
  };

  const handleEditAppointment = (appointment) => {
    setAppointmentToEdit(appointment);
    setIsFormOpen(true);
    setIsOverviewOpen(false);
  };

  const handleAppointmentAdded = () => {
    setIsFormOpen(false);
  };

  const handleAppointmentDeleted = () => {
    setIsOverviewOpen(false);
  };

  // Filter closed days for FullCalendar events
  const closedDayEvents = closedDays.map((cd) => ({
    id: `closed-${cd.id}`,
    title: cd.reason ? `Closed: ${cd.reason}` : "Closed",
    start: cd.date,
    end: cd.date,
    allDay: true,
    display: "background",
    backgroundColor: "#f87171", // red-400
    borderColor: "#f87171",
    textColor: "#fff",
    extendedProps: { isClosedDay: true },
  }));

  // Only show closed days if toggled
  const calendarEvents = showClosedDays
    ? [...appointments, ...closedDayEvents]
    : appointments;

  return (
    <div className="p-4 h-full">
      <div className="mb-2 flex gap-2 items-center">
        <button
          className={`px-3 py-1 rounded text-xs font-semibold border ${
            showClosedDays
              ? "bg-red-400 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setShowClosedDays((v) => !v)}
        >
          {showClosedDays ? "Hide Closed Days" : "Show Closed Days"}
        </button>
        <button
          className="px-3 py-1 rounded text-xs font-semibold border bg-blue-100 text-blue-700"
          onClick={() => setShowClosedDaysManager(true)}
        >
          Manage Closed Days
        </button>
      </div>
      <ClosedDaysManager
        open={showClosedDaysManager}
        onOpenChange={setShowClosedDaysManager}
      />
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        events={calendarEvents}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={(info) => {
          console.log("Event dropped:", info.event);
        }}
        eventResize={(info) => {
          console.log("Event resized:", info.event);
        }}
        eventContent={(arg) => {
          // Custom rendering for closed days
          if (arg.event.extendedProps.isClosedDay) {
            return (
              <div
                style={{
                  background: "#f87171",
                  color: "#fff",
                  borderRadius: 4,
                  padding: 2,
                  textAlign: "center",
                }}
              >
                {arg.event.title}
              </div>
            );
          }
          return undefined;
        }}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {appointmentToEdit ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm
            onAppointmentAdded={handleAppointmentAdded}
            initialStart={initialStart}
            initialEnd={initialEnd}
            appointmentToEdit={appointmentToEdit}
            selectedClient={selectedClient}
            onAppointmentDeleted={handleAppointmentDeleted}
          />
        </DialogContent>
      </Dialog>

      <AppointmentOverview
        appointment={selectedAppointment}
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        onEdit={handleEditAppointment}
      />
    </div>
  );
};

export default Calendar;
