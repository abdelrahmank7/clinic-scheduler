// src/components/Calendar.jsx

import React, { useState, useEffect, useRef } from "react";
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
} from "firebase/firestore"; // <-- UPDATED: Import 'where'

const Calendar = ({ selectedClient, onClientSelect }) => {
  const [appointments, setAppointments] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [initialStart, setInitialStart] = useState(null);
  const [initialEnd, setInitialEnd] = useState(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // <-- UPDATED: useEffect now depends on selectedClient
  useEffect(() => {
    const appointmentsCollectionRef = collection(db, "appointments");
    let q;

    if (selectedClient) {
      // If a client is selected, filter appointments by clientId
      q = query(
        appointmentsCollectionRef,
        where("clientId", "==", selectedClient.id),
        orderBy("start", "asc")
      );
    } else {
      // Otherwise, fetch all appointments
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
  }, [selectedClient]); // <-- UPDATED: Add selectedClient to dependency array

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

  return (
    <div className="p-4 h-full">
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
        events={appointments}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={(info) => {
          console.log("Event dropped:", info.event);
        }}
        eventResize={(info) => {
          console.log("Event resized:", info.event);
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
