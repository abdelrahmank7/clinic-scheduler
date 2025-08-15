// src/pages/DashboardPage.jsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "../components/hooks/use-toast";
import { Card } from "@/components/ui/card";

// Custom components
import AppointmentForm from "../components/Appointments/AppointmentForm";
import ClientSelector from "../components/Clients/ClientSelector";
import CalendarView from "../components/Calendar/CalendarView";
import ReportDialog from "../components/Reports/ReportDialog";
import AppointmentOverview from "../components/Appointments/AppointmentOverview";

function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAppointmentForOverview, setSelectedAppointmentForOverview] =
    useState(null);

  const [calendarRange, setCalendarRange] = useState({
    start: moment().startOf("month").toDate(),
    end: moment().endOf("month").toDate(),
  });

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate("/");
      }
    });

    const appointmentsQuery = query(
      collection(db, "appointments"),
      orderBy("start"),
      where("start", ">=", calendarRange.start),
      where("start", "<=", calendarRange.end)
    );

    const appointmentsUnsubscribe = onSnapshot(
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
      (err) => {
        console.error("Error fetching appointments: ", err);
        setError("Failed to load appointments.");
        setLoading(false);
      }
    );

    return () => {
      authUnsubscribe();
      appointmentsUnsubscribe();
    };
  }, [navigate, calendarRange]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout failed: ", err);
      setError("Logout failed. Please try again.");
    }
  };

  // All other handler functions remain the same...
  const handleSelectSlot = ({ start, end }) => {
    setSelectedSlot({ start, end });
    setIsFormOpen(true);
  };
  const handleSelectEvent = (event) => {
    setSelectedAppointmentForOverview(event);
    setIsOverviewOpen(true);
  };
  const handleNavigate = (newDate, view) => {
    const start = moment(newDate)
      .startOf(view === "month" ? "month" : "day")
      .toDate();
    const end = moment(newDate)
      .endOf(view === "month" ? "month" : "day")
      .toDate();
    setCalendarRange({ start, end });
  };
  const handleOpenEditForm = (appointment) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
    setIsOverviewOpen(false);
  };
  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAppointment(null);
    setSelectedSlot(null);
  };
  const handleOverviewClose = () => {
    setIsOverviewOpen(false);
    setSelectedAppointmentForOverview(null);
  };
  const handleEventResize = async ({ event, start, end }) => {
    /* ... */
  };
  const handleEventDrop = async ({ event, start, end }) => {
    /* ... */
  };
  const updateAppointmentStatus = async (appointmentId, status) => {
    /* ... */
  };
  const eventPropGetter = (event) => {
    /* ... */
  };

  // This function is key for the workflow
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    toast({
      title: "Client Selected",
      description: `${client.name} is now ready for an appointment. Click a slot on the calendar.`,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full gradient-background min-h-screen p-6">
      {/* Style tag remains the same... */}
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-6 flex flex-col min-h-[calc(100vh-48px)]">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="space-x-2">
            <Button asChild>
              <Link to="/clients">Client Management</Link>
            </Button>
            <ReportDialog />
            <Button onClick={handleLogout} variant="destructive">
              Logout
            </Button>
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow">
          <div className="md:col-span-1">
            <Card className="p-4 shadow-sm h-full">
              {/* 👇 FIX: Pass the showAddButton prop as false */}
              <ClientSelector
                onSelectClient={handleSelectClient}
                showAddButton={false}
              />
            </Card>
          </div>

          <div className="md:col-span-3 flex flex-col">
            <CalendarView
              events={appointments}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              onEventResize={handleEventResize}
              onEventDrop={handleEventDrop}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>

      <AppointmentOverview
        appointment={selectedAppointmentForOverview}
        isOpen={isOverviewOpen}
        onClose={handleOverviewClose}
        onEdit={handleOpenEditForm}
      />

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Edit the details."
                : "Schedule a new appointment."}
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            initialStart={selectedSlot?.start}
            initialEnd={selectedSlot?.end}
            appointmentToEdit={editingAppointment}
            onAppointmentAdded={handleFormClose}
            onAppointmentDeleted={handleFormClose}
            // This prop passes the selected client to the form
            selectedClient={selectedClient}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardPage;
