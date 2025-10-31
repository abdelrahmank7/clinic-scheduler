// src/pages/ClientPortalPage.jsx (Updated to check session internally)
import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageCircle,
} from "lucide-react";
import { useClientSession } from "@/contexts/ClientSessionContext"; // Import the context
import { useNavigate } from "react-router-dom";

function ClientPortalPage() {
  const {
    clientSession,
    loading: sessionLoading,
    logoutClient,
  } = useClientSession(); // Get session data
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableLocations, setAvailableLocations] = useState({}); // Store locationId -> name mapping
  const [searchRequestId, setSearchRequestId] = useState(""); // State for client search
  const { toast } = useToast();
  const navigate = useNavigate(); // For navigation if needed (e.g., logout redirect)

  // Check if client is logged in via session context
  useEffect(() => {
    if (sessionLoading) return; // Wait for session check
    if (!clientSession) {
      // Redirect to client login if not logged in
      navigate("/client/login");
      return;
    }
    // Fetch client's requests and locations after session is confirmed
    fetchLocationsAndRequests();
  }, [clientSession, sessionLoading, navigate]);

  const fetchLocationsAndRequests = async () => {
    if (!clientSession) return; // Ensure client is logged in

    setLoading(true);
    setError(null);

    try {
      // Fetch location names
      const locationsSnapshot = await getDocs(collection(db, "locations"));
      const locationsMap = {};
      locationsSnapshot.forEach((doc) => {
        locationsMap[doc.id] = doc.data().name; // Assuming 'name' field exists in location doc
      });
      setAvailableLocations(locationsMap);

      // Fetch client's own requests using their stored ID
      const requestsQuery = query(
        collection(db, "appointment_requests"),
        where("clientId", "==", clientSession.id) // Filter by client's Firestore ID
      );
      const unsubscribeRequests = onSnapshot(
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
          setRequests(requestsData);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching client requests:", err);
          setError("Failed to load your requests.");
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => unsubscribeRequests();
    } catch (err) {
      console.error("Error setting up client portal:", err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  // Filter client requests based on search term (request ID only)
  const filteredRequests = requests.filter((request) =>
    request.id.toLowerCase().includes(searchRequestId.toLowerCase())
  );

  // Helper function to format request data for display
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

  if (sessionLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
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

  if (!clientSession) {
    // This case might occur if the session was cleared elsewhere while on the page
    // The useEffect should handle the redirect, but render a message just in case
    return (
      <div className="flex justify-center items-center h-screen">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="w-full gradient-background min-h-screen p-2">
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-4 min-h-[calc(100vh-48px)] flex flex-col">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b pb-2 gap-2">
          <h1 className="text-2xl font-bold">Welcome, {clientSession.name}!</h1>
          <Button onClick={logoutClient} variant="outline" size="sm">
            Logout
          </Button>
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
                <ul className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredRequests.map((request) => (
                    <li
                      key={request.id}
                      className="p-4 border rounded-md bg-muted/50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="font-medium">
                                Request ID: {request.id}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">
                                Type: {request.requestType}
                              </div>
                            </div>
                            <div className="ml-2">
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Created:{" "}
                            {request.createdAt?.toLocaleString() || "N/A"}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start space-x-2 text-sm">
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
                            <div className="flex items-start space-x-2 text-sm">
                              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">
                                  Request Data
                                </p>
                                <div className="mt-1">
                                  {formatRequestData(
                                    request.requestType,
                                    request.requestData
                                  )}
                                </div>
                              </div>
                            </div>
                            {request.notes && (
                              <div className="flex items-start space-x-2 text-sm">
                                <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">Notes</p>
                                  <p className="text-sm">{request.notes}</p>
                                </div>
                              </div>
                            )}
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
    </div>
  );
}

export default ClientPortalPage;
