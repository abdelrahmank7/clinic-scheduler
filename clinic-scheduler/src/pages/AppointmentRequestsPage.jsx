// src/pages/AppointmentRequestsPage.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageCircle,
  Search,
  CheckCircle,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { AppointmentRequestService } from "@/services/appointment-request-service"; // Import the service

function AppointmentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableLocations, setAvailableLocations] = useState({}); // Store locationId -> name mapping
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  // State for admin search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // Add filter state

  // Fetch location names
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsSnapshot = await getDocs(collection(db, "locations"));
        const locationsMap = {};
        locationsSnapshot.forEach((doc) => {
          locationsMap[doc.id] = doc.data().name; // Assuming 'name' field exists in location doc
        });
        setAvailableLocations(locationsMap);
      } catch (err) {
        console.error("Error fetching locations:", err);
        toast({
          title: "Error",
          description: "Failed to load location names.",
          variant: "destructive",
        });
      }
    };

    fetchLocations();
  }, [toast]);

  // Fetch appointment requests using the service
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return; // Ensure user is authenticated

      setLoading(true);
      setError(null);
      try {
        // Pass the status filter to the service method
        // The service handles Firestore ordering by createdAt desc
        const data = await AppointmentRequestService.fetchRequests(
          filterStatus !== "all" ? filterStatus : null
        );
        setRequests(data);
      } catch (err) {
        console.error("Error fetching appointment requests:", err);
        setError("Failed to load appointment requests.");
        toast({
          title: "Error",
          description: "Could not retrieve appointment requests.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user, toast, filterStatus]); // Add filterStatus as dependency

  // Filter requests based on search term (name, phone, request ID) AND status filter
  // The initial sorting by createdAt desc is handled by the service fetch
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      !searchTerm ||
      request.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requesterPhone
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.id?.toLowerCase().includes(searchTerm.toLowerCase());

    // Apply status filter if not 'all'
    const matchesStatus =
      filterStatus === "all" || request.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Handler for processing requests (approve/reject/completed)
  const handleProcessRequest = async (requestId, action, adminNotes = "") => {
    if (!user) return; // Ensure user is logged in

    try {
      let result;
      if (action === "completed") {
        // Use the new markRequestAsCompleted method
        result = await AppointmentRequestService.markRequestAsCompleted(
          requestId,
          user.uid, // Pass admin UID
          adminNotes
        );
      } else {
        // Use the existing processRequest method for approve/reject
        result = await AppointmentRequestService.processRequest(
          requestId,
          action,
          user.uid, // Pass admin UID
          adminNotes
        );
      }

      if (result.success) {
        toast({
          title: `Request ${
            action === "completed"
              ? "Marked as Completed"
              : action === "approve"
              ? "Approved"
              : "Rejected"
          }`,
          description: `The request has been ${
            action === "completed"
              ? "marked as completed"
              : action === "approve"
              ? "approved"
              : "rejected"
          }.`,
        });
        // Refresh the request list by refetching
        // A more efficient way would be to update the state directly,
        // but refetching ensures consistency.
        const fetchRequests = async () => {
          if (!user) return;
          setLoading(true);
          try {
            // Pass the status filter to the service method
            const data = await AppointmentRequestService.fetchRequests(
              filterStatus !== "all" ? filterStatus : null
            );
            setRequests(data);
          } catch (err) {
            console.error("Error refetching appointment requests:", err);
            setError("Failed to reload appointment requests.");
            toast({
              title: "Error Reloading",
              description: "Could not reload appointment requests.",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        };
        fetchRequests();
      } else {
        throw new Error(result.error || "Failed to process request.");
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast({
        title: `Request ${
          action === "completed"
            ? "Completion Failed"
            : action === "approve"
            ? "Approval Failed"
            : "Rejection Failed"
        }`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Helper function to format request data based on type
  const formatRequestData = (requestType, requestData, availableLocations) => {
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
                <strong>Location:</strong>{" "}
                {availableLocations[requestData.location] ||
                  requestData.location}
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

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    let variant = "default";
    if (status === "approved") variant = "secondary";
    if (status === "rejected") variant = "destructive";
    if (status === "completed") variant = "outline"; // Or another appropriate variant
    return <Badge variant={variant}>{status}</Badge>;
  };

  // Helper function to determine if action buttons should be shown
  const canShowActionButtons = (status) => {
    return status === "pending";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Appointment Requests</h1>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded p-2"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name, Phone, or Request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Request ID: {request.id}
                </CardTitle>
                <div className="ml-2">{getStatusBadge(request.status)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Requester</p>
                  <p className="text-sm">
                    {request.requesterName || request.requesterEmail || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm">{request.requesterPhone || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm">{request.requesterEmail || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm">
                    {availableLocations[request.location] ||
                      request.location ||
                      "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Request Type</p>
                  <p className="text-sm capitalize">
                    {request.requestType || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Request Data</p>
                  <div className="mt-1 text-sm">
                    {formatRequestData(
                      request.requestType,
                      request.requestData,
                      availableLocations
                    )}
                  </div>
                </div>
              </div>

              {request.notes && (
                <div className="flex items-start space-x-2">
                  <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Notes</p>
                    <p className="text-sm">{request.notes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons - Only show for 'pending' requests */}
              {canShowActionButtons(request.status) && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessRequest(request.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessRequest(request.id, "reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleProcessRequest(request.id, "completed")
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Mark Complete
                  </Button>
                </div>
              )}
              {/* Optional: Show a note if the request is not pending */}
              {!canShowActionButtons(request.status) && (
                <p className="text-sm text-muted-foreground mt-2">
                  This request has been {request.status}. No further action
                  required via this page.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredRequests.length === 0 && (
        <p className="text-center text-gray-500">
          No requests found matching your filters.
        </p>
      )}
    </div>
  );
}

export default AppointmentRequestsPage;
