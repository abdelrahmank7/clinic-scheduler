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
  limit,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "../components/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppointmentForm from "../components/Appointments/AppointmentForm";
import ClientSelector from "../components/Clients/ClientSelector";
import CalendarView from "../components/Calendar/CalendarView";
import ReportDialog from "../components/Reports/ReportDialog";
import AppointmentOverview from "../components/Appointments/AppointmentOverview";
import PaymentReports from "../components/Payment/PaymentReports";
import CollectPaymentDialog from "../components/Payment/dialogs/CollectPaymentDialog";
import ClinicSelector from "@/components/ClinicSelector";
import { useClinic } from "@/contexts/ClinicContext";
import RevenueDashboard from "@/components/Payment/reports/RevenueDashboard";
import { useRevenue } from "@/hooks/useRevenue";

import { DollarSignIcon, AlertCircleIcon, SettingsIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

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

  // Get clinic context
  const { selectedClinic, loading: clinicLoading } = useClinic();
  const { revenueData, loading: revenueLoading } = useRevenue(selectedClinic);

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate("/");
      }
    });

    // Only fetch appointments if a clinic is selected
    if (!selectedClinic) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("clinicId", "==", selectedClinic),
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
  }, [navigate, calendarRange, selectedClinic]);

  // Fetch recent payments for sidebar
  useEffect(() => {
    if (!selectedClinic) {
      return;
    }

    // Recent payments
    const recentPaymentsQuery = query(
      collection(db, "payments"),
      where("clinicId", "==", selectedClinic),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribeRecent = onSnapshot(recentPaymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
    });

    return () => {
      unsubscribeRecent();
    };
  }, [selectedClinic]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout failed: ", err);
      setError("Logout failed. Please try again.");
    }
  };

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
    try {
      const appointmentDoc = doc(db, "appointments", event.id);
      await updateDoc(appointmentDoc, { start, end });
      toast({
        title: "Appointment Resized",
        description: "The appointment time has been updated.",
      });
    } catch (error) {
      console.error("Error resizing appointment: ", error);
      toast({
        title: "Update Failed",
        description: "Could not save the new appointment time.",
        variant: "destructive",
      });
    }
  };

  const handleEventDrop = async ({ event, start, end }) => {
    try {
      const appointmentDoc = doc(db, "appointments", event.id);
      await updateDoc(appointmentDoc, { start, end });
      toast({
        title: "Appointment Moved",
        description: "The appointment has been moved successfully.",
      });
    } catch (error) {
      console.error("Error moving appointment: ", error);
      toast({
        title: "Update Failed",
        description: "Could not save the new appointment location.",
        variant: "destructive",
      });
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const appointmentDoc = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentDoc, { status });
      toast({
        title: "Appointment status updated",
        description: `Appointment marked as ${status}.`,
      });
    } catch (error) {
      console.error("Error updating appointment status: ", error);
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const eventPropGetter = (event) => {
    const isPast = moment(event.end).isBefore(moment());
    let style = {
      backgroundColor: "#1565c0", // Default blue
      borderColor: "#0d47a1",
      color: "white",
    };

    switch (event.status) {
      case "done":
        style.backgroundColor = isPast ? "#047857" : "#10b981";
        style.borderColor = "#047857";
        break;
      case "missed":
        style.backgroundColor = isPast ? "#b91c1c" : "#ef4444";
        style.borderColor = "#b91c1c";
        break;
      case "postponed":
        style.backgroundColor = isPast ? "#c2410c" : "#f97316";
        style.borderColor = "#c2410c";
        break;
      default:
        if (isPast) {
          style.backgroundColor = "#6b7280";
          style.borderColor = "#4b5563";
        }
        break;
    }

    // Add dollar sign indicator for paid appointments
    if (event.paymentStatus === "paid") {
      style.borderLeft = "4px solid #22c55e"; // Green border for paid appointments
    }

    return { style };
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    toast({
      title: "Client Selected",
      description: `${client.name} is now ready for an appointment. Click a slot on the calendar.`,
    });
  };

  if (clinicLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading clinics...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full gradient-background min-h-screen p-6">
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-6 flex flex-col min-h-[calc(100vh-48px)]">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <ClinicSelector />
            <Button asChild>
              <Link to="/clients">Client Management</Link>
            </Button>

            <Button asChild variant="ghost">
              <Link to="/payments">
                <DollarSignIcon className="mr-2 h-4 w-4" />
                Payments
              </Link>
            </Button>

            <Button asChild variant="ghost">
              <Link to="/settings">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>

            <PaymentReports />
            <ReportDialog />
            <Button onClick={handleLogout} variant="destructive">
              Logout
            </Button>
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {!selectedClinic ? (
          <div className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No Clinic Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please select a clinic from the dropdown above to view
              appointments and payments.
            </p>
            <Button asChild>
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Enhanced Revenue Dashboard */}
            <div className="mb-6">
              <RevenueDashboard
                revenueData={revenueData}
                loading={revenueLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow">
              <div className="md:col-span-1">
                <Card className="p-4 shadow-sm h-full">
                  <ClientSelector
                    onSelectClient={handleSelectClient}
                    showAddButton={false}
                    onUpdateAppointmentStatus={updateAppointmentStatus}
                  />
                </Card>

                {/* Recent Payments */}
                <Card className="p-4 shadow-sm mt-4">
                  <h3 className="font-semibold mb-3">Recent Payments</h3>
                  <div className="space-y-3">
                    {revenueData.recentPayments?.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium">{payment.clientName}</p>
                          <p className="text-muted-foreground">
                            {format(payment.createdAt, "MMM dd")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${payment.amount?.toFixed(2)}
                          </p>
                          <p className="text-muted-foreground capitalize text-xs">
                            {payment.paymentMethod}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!revenueData.recentPayments ||
                      revenueData.recentPayments.length === 0) && (
                      <p className="text-muted-foreground text-center py-2 text-sm">
                        No recent payments
                      </p>
                    )}
                  </div>
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
                  onMarkDone={(id) => updateAppointmentStatus(id, "done")}
                  onMarkMissed={(id) => updateAppointmentStatus(id, "missed")}
                  onMarkPostponed={(id) =>
                    updateAppointmentStatus(id, "postponed")
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>

      <AppointmentOverview
        appointment={selectedAppointmentForOverview}
        isOpen={isOverviewOpen}
        onClose={handleOverviewClose}
        onEdit={handleOpenEditForm}
      />

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
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
            selectedClient={selectedClient}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardPage;
