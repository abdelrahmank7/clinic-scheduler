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
// signOut is used in sidebar/navigation — not needed here
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button"; // Import Button
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "../components/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ClosedDaysButton moved to sidebar/navigation
import AppointmentForm from "../components/Appointments/AppointmentForm";
import ClientSelector from "../components/Clients/ClientSelector";
import CalendarView from "../components/Calendar/CalendarView";
import ReportDialog from "../components/Reports/ReportDialog";
import AppointmentOverview from "../components/Appointments/AppointmentOverview";
import PaymentReports from "../components/Payment/PaymentReports";
import CollectPaymentDialog from "../components/Payment/dialogs/CollectPaymentDialog";
import LocationSelector from "@/components/LocationSelector"; // Import LocationSelector
import { useClinic } from "@/contexts/ClinicContext";
import RevenueDashboard from "@/components/Payment/reports/RevenueDashboard";
import { useRevenue } from "@/hooks/useRevenue"; // Import useRevenue

import {
  DollarSignIcon,
  AlertCircleIcon,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  MessageCircle,
} from "lucide-react"; // Import new icons
import { format } from "date-fns";
import ClosedDaysManager from "@/components/ClosedDaysManager"; // Import ClosedDaysManager
import { useToast } from "@/components/ui/use-toast"; // Import useToast if needed
import { AppointmentRequestService } from "@/services/appointment-request-service"; // Import the service
import { useAuthState } from "react-firebase-hooks/auth"; // Import useAuthState to get admin UID

function DashboardPage() {
  // Add state for the manager dialog
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const { toast: toastHook } = useToast(); // Get toast hook if needed in this component
  const [user] = useAuthState(auth); // Get the current admin user

  // State for the request details dialog
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // Closed days and revenue 'close day' actions moved to sidebar

  // Single-instance model: only use location filters
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

  // State for approved requests
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const { selectedLocations, loading: clinicLoading } = useClinic();
  const { revenueData: _revenueData } = useRevenue(
    selectedLocations,
    calendarRange
  );
  const revenueData = _revenueData || { recentPayments: [] };

  // Get today's revenue from RevenueDashboard logic (duplicate for now)
  const today = new Date();
  const isToday = (date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const todaysPayments = (revenueData.recentPayments || []).filter(
    (p) => p.createdAt && isToday(new Date(p.createdAt))
  );
  const todaysRevenue = todaysPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  // handleCloseDay moved to sidebar closed days manager

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate("/");
      }
    });

    let appointmentsQuery = query(
      collection(db, "appointments"),
      orderBy("start"),
      where("start", ">=", calendarRange.start),
      where("start", "<=", calendarRange.end)
    );

    // Add location filter if specific locations are selected
    if (selectedLocations.length > 0) {
      // Use 'in' query for multiple locations
      // selectedLocations is an array of strings like ['Cairo', 'Alexandria']
      appointmentsQuery = query(
        appointmentsQuery,
        where("location", "in", selectedLocations)
      );
    }
    // If selectedLocations is empty, the query fetches all locations for the clinic

    const appointmentsUnsubscribe = onSnapshot(
      appointmentsQuery,
      (querySnapshot) => {
        const appointmentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start?.toDate
            ? doc.data().start.toDate()
            : doc.data().start,
          end: doc.data().end?.toDate
            ? doc.data().end.toDate()
            : doc.data().end,
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
  }, [navigate, calendarRange, selectedLocations]);

  // Fetch approved appointment requests
  useEffect(() => {
    if (!user) return; // Ensure user is authenticated

    let requestsQuery = query(
      collection(db, "appointment_requests"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc") // Order by creation time, newest first
    );

    // Add location filter if specific locations are selected
    if (selectedLocations.length > 0) {
      requestsQuery = query(
        requestsQuery,
        where("location", "in", selectedLocations)
      );
    }

    const requestsUnsubscribe = onSnapshot(
      requestsQuery,
      (querySnapshot) => {
        const requestsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate()
            : doc.data().createdAt,
          processedAt: doc.data().processedAt?.toDate
            ? doc.data().processedAt.toDate()
            : doc.data().processedAt,
        }));
        setApprovedRequests(requestsData);
        setLoadingRequests(false);
      },
      (err) => {
        console.error("Error fetching approved requests: ", err);
        setError("Failed to load approved requests.");
        setLoadingRequests(false);
      }
    );

    return () => {
      requestsUnsubscribe(); // Clean up the listener
    };
  }, [user, selectedLocations]); // Depend on user and selectedLocations

  // Fetch recent payments for sidebar - filter by optional selectedLocations
  useEffect(() => {
    let recentPaymentsQuery = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    // Add location filter if specific locations are selected
    if (selectedLocations.length > 0) {
      recentPaymentsQuery = query(
        recentPaymentsQuery,
        where("location", "in", selectedLocations)
      );
    }

    const unsubscribeRecent = onSnapshot(recentPaymentsQuery, () => {
      // recent payments snapshot observed for sidebar/reporting - data used elsewhere (revenue hook)
    });

    return () => {
      unsubscribeRecent();
    };
  }, [selectedLocations]);

  // Logout handled in the sidebar/navigation pane now

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

  // Function to open the manager dialog
  const openCloseDayManager = () => {
    setIsManagerOpen(true);
  };

  // Function to handle refresh after closing day
  const handleManagerRefresh = () => {
    // Optionally trigger any local updates if needed
    // For now, just close the dialog
    setIsManagerOpen(false);
  };

  // Handler for marking a request as completed from the dashboard
  const handleMarkRequestAsCompleted = async (requestId) => {
    if (!user) return; // Ensure user is logged in

    try {
      const result = await AppointmentRequestService.markRequestAsCompleted(
        requestId,
        user.uid // Pass admin UID
        // Optional: Add admin notes input if needed
      );

      if (result.success) {
        toast({
          title: "Request Marked as Completed",
          description: "The request has been marked as completed.",
        });
        // The real-time listener will automatically update the state and remove it from the list
      } else {
        throw new Error(result.error || "Failed to mark request as completed.");
      }
    } catch (error) {
      console.error("Error marking request as completed:", error);
      toast({
        title: "Completion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handler for opening the request details dialog
  const handleOpenRequestDetails = (request) => {
    setSelectedRequest(request);
    setIsRequestDialogOpen(true);
  };

  // Helper function to format request data for display in dashboard
  const formatRequestDataForDashboard = (requestType, requestData) => {
    if (!requestData) return "No data provided";

    switch (requestType) {
      case "create":
        return `New: ${requestData.title || "N/A"}`;
      case "reschedule":
        return `Reschedule: ${
          requestData.existingAppointmentId || requestData.appointmentId
        }`;
      case "cancel":
        return `Cancel: ${
          requestData.existingAppointmentId || requestData.appointmentId
        }`;
      default:
        return JSON.stringify(requestData, null, 2); // Fallback to raw data
    }
  };

  // Helper function to format request data for display in dialog
  const formatRequestDataForDialog = (requestType, requestData) => {
    if (!requestData) return <p className="text-gray-500">No data provided</p>;

    switch (requestType) {
      case "create":
        return (
          <div className="space-y-1">
            <p>
              <strong>Title:</strong> {requestData.title || "N/A"}
            </p>
            <p>
              <strong>Notes:</strong> {requestData.notes || "N/A"}
            </p>
            {requestData.preferredStart && requestData.preferredEnd && (
              <p>
                <strong>Preferred Time:</strong>{" "}
                {new Date(requestData.preferredStart).toLocaleString()} -{" "}
                {new Date(requestData.preferredEnd).toLocaleString()}
              </p>
            )}
            {requestData.location && ( // Display location if available in requestData (fallback if not top-level)
              <p>
                <strong>Location:</strong> {requestData.location}
              </p>
            )}
          </div>
        );
      case "reschedule":
        return (
          <div className="space-y-1">
            <p>
              <strong>Appointment ID to Reschedule:</strong>{" "}
              {requestData.existingAppointmentId || requestData.appointmentId}
            </p>
            {requestData.newStart && requestData.newEnd && (
              <p>
                <strong>New Time:</strong>{" "}
                {new Date(requestData.newStart).toLocaleString()} -{" "}
                {new Date(requestData.newEnd).toLocaleString()}
              </p>
            )}
            <p>
              <strong>Reason:</strong> {requestData.notes || "N/A"}
            </p>
          </div>
        );
      case "cancel":
        return (
          <div className="space-y-1">
            <p>
              <strong>Appointment ID to Cancel:</strong>{" "}
              {requestData.existingAppointmentId || requestData.appointmentId}
            </p>
            <p>
              <strong>Reason:</strong> {requestData.notes || "N/A"}
            </p>
          </div>
        );
      default:
        // Fallback for unknown request types or raw data
        return (
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(requestData, null, 2)}
          </pre>
        );
    }
  };

  // Helper function to get status badge for dialog
  const getStatusBadge = (status) => {
    let variant = "default";
    if (status === "approved") variant = "secondary";
    if (status === "rejected") variant = "destructive";
    if (status === "completed") variant = "outline"; // Or another appropriate variant
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          variant === "secondary"
            ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : variant === "destructive"
            ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80"
            : variant === "outline"
            ? "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            : "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
        }`}
      >
        {status}
      </span>
    );
  };

  if (clinicLoading) {
    // Use clinicLoading instead of checking selectedClinic
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
    <div className="w-full gradient-background min-h-screen p-2">
      <div className="container mx-auto bg-card rounded-xl shadow-lg px-2 py-4 md:p-6 flex flex-col min-h-[calc(100vh-48px)] relative">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 border-b pb-4 gap-4 md:gap-0">
          {/* Updated Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">
            Home
          </h1>
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-2">
            <LocationSelector />
            {/* Add the Close Day Button */}
            <Button onClick={openCloseDayManager} variant="default">
              Close Day
            </Button>
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Revenue Card at the top */}
        <div className="mb-4 md:mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Collected Revenue
              </CardTitle>
              <DollarSignIcon className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  ${todaysRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground ml-4">
                  Total collected today (read-only)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Closed days and revenue-close actions moved to sidebar */}

        {/* Main content: client selector, recent payments, calendar */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-grow">
          {/* Left Sidebar: Client Selector, Recent Payments, Approved Requests */}
          <div className="md:w-1/4 w-full flex flex-col gap-4">
            <Card className="p-4 shadow-sm h-full">
              <ClientSelector
                onSelectClient={handleSelectClient}
                showAddButton={false}
                onUpdateAppointmentStatus={updateAppointmentStatus}
              />
            </Card>

            <Card className="p-4 shadow-sm">
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

            {/* New Section: Approved Requests */}
            <Card className="p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Actions
                </CardTitle>
                <span className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {approvedRequests.length}
                </span>
              </div>
              <CardContent className="p-0 pt-3">
                {loadingRequests ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Loading requests...
                  </p>
                ) : approvedRequests.length > 0 ? (
                  <ul className="space-y-3 max-h-60 overflow-y-auto">
                    {approvedRequests.map((request) => (
                      <li
                        key={request.id}
                        className="p-3 border rounded-md bg-muted/50 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleOpenRequestDetails(request)} // Open dialog on click
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {request.requesterName ||
                                  request.requesterEmail ||
                                  "N/A"}
                              </span>
                              <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded capitalize">
                                {request.requestType}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {request.location || "N/A"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent dialog from opening when clicking the button
                              handleMarkRequestAsCompleted(request.id);
                            }}
                            className="ml-2 h-8 w-8 p-0 flex-shrink-0"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending actions.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendar Section */}
          <div className="md:w-3/4 w-full flex flex-col">
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
              onMarkPostponed={(id) => updateAppointmentStatus(id, "postponed")}
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

      {/* Add the ClosedDaysManager Dialog */}
      <ClosedDaysManager
        open={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        onRefresh={handleManagerRefresh}
      />

      {/* Dialog for Request Details */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
                <DialogDescription>
                  View the details of the approved request.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Requester</p>
                    <p className="text-sm">
                      {selectedRequest.requesterName ||
                        selectedRequest.requesterEmail ||
                        "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm">
                      {selectedRequest.requesterPhone || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm">
                      {selectedRequest.requesterEmail || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm">
                      {selectedRequest.location || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Request Type</p>
                    <p className="text-sm capitalize">
                      {selectedRequest.requestType || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Request Data</p>
                    <div className="mt-1 text-sm">
                      {formatRequestDataForDialog(
                        selectedRequest.requestType,
                        selectedRequest.requestData
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleMarkRequestAsCompleted(selectedRequest.id)
                    }
                    className="ml-2"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />{" "}
                    Mark Complete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardPage;

// In some component's render output, add something like this:
