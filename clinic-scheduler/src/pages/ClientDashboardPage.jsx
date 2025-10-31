// src/pages/ClientDashboardPage.jsx
import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  CreditCard,
  Clock,
  Package,
  Search,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom"; // Import useNavigate
// --- Import the new service ---
import { AppointmentRequestService } from "@/services/appointment-request-service";
// --- Import necessary utilities ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Helper functions (can be moved to a utils file if reused) ---
const formatDateTime = (date) => {
  if (!date) return "";
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
  if (!date) return "";
  const options = { hour: "2-digit", minute: "2-digit", hour12: true };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

function ClientDashboardPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate(); // Initialize useNavigate
  const [clientData, setClientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // --- State for requests ---
  const [requests, setRequests] = useState([]);
  const [searchRequestId, setSearchRequestId] = useState(""); // State for client search

  // --- State for request confirmation dialog ---
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState(null); // 'book', 'reschedule', 'cancel', 'change_status'
  const [requestDetails, setRequestDetails] = useState({}); // Holds specific data for the request
  const [processingRequest, setProcessingRequest] = useState(false); // Loading state for request submission

  useEffect(() => {
    if (!user) return; // Ensure user is logged in

    // Fetch client profile data based on user UID
    const clientDocRef = doc(db, "clients", user.uid); // Assumes UID matches clientId
    const unsubscribeClient = onSnapshot(
      clientDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setClientData(docSnap.data());
        } else {
          console.warn("Client profile not found for UID:", user.uid);
          setClientData(null);
          toast({
            title: "Profile Missing",
            description:
              "Your profile information could not be loaded. Please contact the clinic.",
            variant: "destructive",
          });
        }
      },
      (error) => {
        console.error("Error fetching client profile:", error);
        setClientData(null);
        setLoading(false); // Ensure loading stops on error
        toast({
          title: "Error Loading Profile",
          description: "Failed to load your profile. Please try again later.",
          variant: "destructive",
        });
      }
    );

    // Fetch client's appointments
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("clientId", "==", user.uid), // Filter by client's UID
      orderBy("start", "desc") // Order by start time, descending
    );
    const unsubscribeAppointments = onSnapshot(
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
        setLoading(false); // Stop loading after appointments are fetched
      },
      (error) => {
        console.error("Error fetching client appointments:", error);
        setAppointments([]);
        setLoading(false);
        toast({
          title: "Error Loading Appointments",
          description:
            "Failed to load your appointments. Please try again later.",
          variant: "destructive",
        });
      }
    );

    // Fetch client's own requests
    const requestsQuery = query(
      collection(db, "appointment_requests"),
      where("requesterEmail", "==", user.email) // Filter by user's email
    );
    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (querySnapshot) => {
        const requestsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(requestsData);
      },
      (error) => {
        console.error("Error fetching client requests:", error);
        // Optionally toast error, but might be noisy if user has no requests
        setRequests([]);
      }
    );

    return () => {
      unsubscribeClient();
      unsubscribeAppointments();
      unsubscribeRequests(); // Unsubscribe from requests listener
    };
  }, [user, toast]);

  // Filter client requests based on search term (request ID only)
  const filteredRequests = requests.filter((request) =>
    request.id.toLowerCase().includes(searchRequestId.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!clientData) {
    // Handle case where client profile doesn't exist
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Your client profile could not be found. Please contact the clinic.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Handler for initiating a request action ---
  const handleRequestAction = (type, details = {}) => {
    setRequestType(type);
    setRequestDetails(details);
    setRequestDialogOpen(true);
  };

  // --- Handler for confirming and sending the request ---
  const handleConfirmRequest = async () => {
    if (!requestType || !user) return; // Ensure type and user are set

    setProcessingRequest(true);
    try {
      let requestData = {};
      let successMessage = "";
      let errorMessagePrefix = "Request Failed";

      switch (requestType) {
        case "book":
          // For booking, we might need a simple form or collect details here.
          // For now, let's assume requestData is passed in requestDetails or collected elsewhere.
          // A dedicated form would be better for collecting booking details.
          requestData = {
            title: requestDetails.title || "Nutrition Consultation", // Default title
            start: requestDetails.start
              ? new Date(requestDetails.start)
              : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
            end: requestDetails.end
              ? new Date(requestDetails.end)
              : new Date(Date.now() + 25 * 60 * 60 * 1000), // Default to 1 hour duration
            notes: requestDetails.notes || "",
            location: requestDetails.location || "", // Get from context/form if needed
            // Add other relevant fields for a new appointment
          };
          successMessage =
            "Your appointment booking request has been sent for approval.";
          errorMessagePrefix = "Booking Request Failed";
          break;
        case "reschedule":
          // Requires appointmentId and new start/end times
          if (!requestDetails.appointmentId) {
            throw new Error("Appointment ID is required for rescheduling.");
          }
          requestData = {
            appointmentId: requestDetails.appointmentId,
            newStart: requestDetails.newStart
              ? new Date(requestDetails.newStart)
              : null,
            newEnd: requestDetails.newEnd
              ? new Date(requestDetails.newEnd)
              : null,
            // In a real scenario, you'd collect newStart/newEnd from a form/modal
          };
          successMessage = `Your request to reschedule appointment ${requestDetails.appointmentId} has been sent for approval.`;
          errorMessagePrefix = "Reschedule Request Failed";
          break;
        case "cancel":
          // Requires appointmentId
          if (!requestDetails.appointmentId) {
            throw new Error("Appointment ID is required for cancellation.");
          }
          requestData = { appointmentId: requestDetails.appointmentId };
          successMessage = `Your request to cancel appointment ${requestDetails.appointmentId} has been sent for approval.`;
          errorMessagePrefix = "Cancellation Request Failed";
          break;
        case "change_status":
          // Requires appointmentId and newStatus
          if (!requestDetails.appointmentId || !requestDetails.newStatus) {
            throw new Error("Appointment ID and new status are required.");
          }
          requestData = {
            appointmentId: requestDetails.appointmentId,
            newStatus: requestDetails.newStatus,
          };
          successMessage = `Your request to mark appointment ${requestDetails.appointmentId} as '${requestDetails.newStatus}' has been sent for approval.`;
          errorMessagePrefix = "Status Change Request Failed";
          break;
        default:
          throw new Error("Invalid request type.");
      }

      // --- Call the AppointmentRequestService ---
      const result = await AppointmentRequestService.createRequest(
        user.uid, // clientId
        requestType,
        requestData
      );

      if (result.success) {
        // Show success message with the new request ID
        toast({
          title: "Request Sent",
          description: `${successMessage} Request ID: ${result.requestId}`, // Display the ID
        });
        // Close the dialog after successful request
        setRequestDialogOpen(false);
        // Refresh client's request list (optimistic update or refetch)
        setRequests((prev) => [
          {
            id: result.requestId, // Use the returned ID
            requesterName: clientData.name || user.displayName || "N/A",
            requesterEmail: user.email,
            requestType,
            requestData: requestData,
            status: "pending",
            createdAt: new Date(), // Use local time or server time if available
            ...result.requestData, // Include any additional data from the service
          },
          ...prev,
        ]);
      } else {
        throw new Error(result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error(`${errorMessagePrefix}:`, error);
      toast({
        title: errorMessagePrefix,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(false);
      // Reset state regardless of success/failure to clean up for next request
      // Resetting is handled by closing the dialog or onOpenChange
      // setRequestType(null);
      // setRequestDetails({});
    }
  };

  // --- Function to close the dialog and reset state ---
  const handleCloseRequestDialog = () => {
    setRequestDialogOpen(false);
    // Small delay to ensure state resets cleanly after animation
    setTimeout(() => {
      setRequestType(null);
      setRequestDetails({});
    }, 300);
  };

  // --- Helper function to format request data for display ---
  const formatRequestData = (requestType, requestData) => {
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
            {requestData.start && requestData.end && (
              <p>
                <strong>Preferred Time:</strong>{" "}
                {new Date(requestData.start).toLocaleString()} -{" "}
                {new Date(requestData.end).toLocaleString()}
              </p>
            )}
            {requestData.location && ( // Display location if available
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

  // --- Helper function to get status badge ---
  const getStatusBadge = (status) => {
    let variant = "default";
    if (status === "approved") variant = "secondary";
    if (status === "rejected") variant = "destructive";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          variant === "secondary"
            ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : variant === "destructive"
            ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80"
            : "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="w-full gradient-background min-h-screen p-2">
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-4 min-h-[calc(100vh-48px)] flex flex-col">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b pb-2 gap-2">
          <h1 className="text-2xl font-bold">
            Welcome, {clientData.name || "Client"}!
          </h1>
          {/* Prominent "Book New Appointment" button */}
          {/* --- UPDATE: Navigate to the new booking form route --- */}
          <Button
            onClick={() => navigate("/book-appointment")} // Use navigate instead of handleRequestAction
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Book New Appointment
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Client Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Your Profile
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{clientData.name}</div>

              <div className="text-sm text-muted-foreground mt-2">Phone</div>
              <div className="font-medium">
                {clientData.phoneNumber || "N/A"}
              </div>

              <div className="text-sm text-muted-foreground mt-2">Email</div>
              <div className="font-medium">{clientData.email || "N/A"}</div>

              {/* Display remaining sessions if available */}
              {clientData.remainingSessions !== undefined && (
                <>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Remaining Sessions
                  </div>
                  <div className="font-medium">
                    {clientData.remainingSessions}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointment Card (or summary) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Next Appointment
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                // Find the next upcoming appointment
                (() => {
                  const now = new Date();
                  const upcoming = appointments
                    .filter((appt) => appt.start > now)
                    .sort((a, b) => a.start - b.start)[0]; // Sort and get the first one after now

                  if (upcoming) {
                    return (
                      <div>
                        <div className="font-medium">{upcoming.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(upcoming.start)} -{" "}
                          {formatTime(upcoming.end)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Status:{" "}
                          <span className="font-medium">
                            {upcoming.status || "Scheduled"}
                          </span>
                        </div>
                        {/* Add action buttons for upcoming appointment */}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRequestAction("reschedule", {
                                appointmentId: upcoming.id,
                              })
                            }
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRequestAction("cancel", {
                                appointmentId: upcoming.id,
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-muted-foreground">
                        No upcoming appointments.
                      </p>
                    );
                  }
                })()
              ) : (
                <p className="text-muted-foreground">
                  No appointments scheduled.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client's Appointment History/List */}
        <div className="mb-6">
          {" "}
          {/* Changed flex-grow to mb-6 to give space to requests section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {appointments.map((appt) => (
                    <li key={appt.id} className="p-2 border rounded-md">
                      <div className="font-medium">{appt.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(appt.start)} - {formatTime(appt.end)}
                      </div>
                      <div className="text-xs">
                        Status:{" "}
                        <span className="font-medium">
                          {appt.status || "Scheduled"}
                        </span>
                      </div>
                      {/* Add action button for past appointments to change status */}
                      {appt.start < new Date() &&
                        !["done", "missed", "postponed"].includes(
                          appt.status
                        ) && (
                          <div className="flex gap-1 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRequestAction("change_status", {
                                  appointmentId: appt.id,
                                  newStatus: "done",
                                })
                              }
                            >
                              Done
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRequestAction("change_status", {
                                  appointmentId: appt.id,
                                  newStatus: "missed",
                                })
                              }
                            >
                              Missed
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRequestAction("change_status", {
                                  appointmentId: appt.id,
                                  newStatus: "postponed",
                                })
                              }
                            >
                              Postpone
                            </Button>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No appointment history found.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client's Request History/List with Search */}
        <div className="flex-grow">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Your Requests</CardTitle>
                {/* Client Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Request ID..."
                    value={searchRequestId}
                    onChange={(e) => setSearchRequestId(e.target.value)}
                    className="pl-8 w-full max-w-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRequests.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredRequests.map((request) => (
                    <li key={request.id} className="p-2 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            Request ID: {request.id}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            Type: {request.requestType}
                          </div>
                          <div className="text-xs mt-1">
                            Status: {getStatusBadge(request.status)}
                          </div>
                          <div className="text-xs mt-1">
                            Created:{" "}
                            {request.createdAt?.toDate
                              ? request.createdAt.toDate().toLocaleString()
                              : new Date(request.createdAt).toLocaleString()}
                          </div>
                          <div className="text-sm mt-1">
                            <strong>Details:</strong>
                            <div className="mt-1">
                              {formatRequestData(
                                request.requestType,
                                request.requestData
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No requests found matching your search.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Dialog for confirming requests ---
       This is a basic confirmation. For 'book', you'd ideally have a form here.
       For 'reschedule', you'd have a date/time picker.
       For simplicity, this just confirms the intent. --- */}
      <Dialog
        open={requestDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseRequestDialog();
          } else {
            setRequestDialogOpen(isOpen);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {requestType === "book" &&
                "Are you sure you want to request a new appointment? You will be prompted to select details."}
              {requestType === "reschedule" &&
                `Are you sure you want to request to reschedule appointment ${requestDetails.appointmentId}?`}
              {requestType === "cancel" &&
                `Are you sure you want to request to cancel appointment ${requestDetails.appointmentId}?`}
              {requestType === "change_status" &&
                `Are you sure you want to request changing the status of appointment ${requestDetails.appointmentId} to '${requestDetails.newStatus}'?`}
              Your request will be sent to the clinic for approval.
            </DialogDescription>
          </DialogHeader>
          {/* --- Basic form for collecting minimal details for booking ---
           In a full implementation, 'book' would have its own dedicated form/modal. --- */}
          {requestType === "book" && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  defaultValue={
                    requestDetails.title || "Nutrition Consultation"
                  }
                  className="col-span-3"
                  onChange={(e) =>
                    setRequestDetails({
                      ...requestDetails,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  defaultValue={requestDetails.notes || ""}
                  className="col-span-3"
                  onChange={(e) =>
                    setRequestDetails({
                      ...requestDetails,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
              {/* Add date/time pickers, location selector here if needed for a basic request */}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseRequestDialog}
              disabled={processingRequest}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRequest} disabled={processingRequest}>
              {processingRequest ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientDashboardPage;
