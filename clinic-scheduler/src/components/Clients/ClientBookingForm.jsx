// src/components/Clients/ClientBookingForm.jsx
import React, { useState, useEffect } from "react";
import { db } from "@/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore"; // Consolidated imports
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { AppointmentRequestService } from "@/services/appointment-request-service"; // Corrected import path
import { useNavigate } from "react-router-dom";
import {
  DialogHeader, // Import DialogHeader
  DialogTitle, // Import DialogTitle
  DialogDescription, // Import DialogDescription
} from "@/components/ui/dialog"; // Import dialog components
import { Calendar } from "lucide-react"; // Import Calendar icon

const ClientBookingForm = ({ onBookingRequested }) => {
  const [user] = useAuthState(auth);
  const [clientData, setClientData] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [title, setTitle] = useState("Nutrition Consultation"); // Default title
  const [notes, setNotes] = useState("");
  const [preferredDate, setPreferredDate] = useState(""); // For collecting a preferred date (optional)
  const [preferredTime, setPreferredTime] = useState(""); // For collecting a preferred time (optional)
  const [location, setLocation] = useState(""); // If client needs to select location
  const [availableLocations, setAvailableLocations] = useState([]); // List of clinic locations
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate(); // Hook for navigation

  // Fetch client data and available locations
  useEffect(() => {
    if (!user) return;

    const fetchClientAndLocations = async () => {
      try {
        // Fetch client data
        const clientDoc = await getDoc(doc(db, "clients", user.uid));
        if (clientDoc.exists()) {
          setClientData(clientDoc.data());
        } else {
          console.warn("Client data not found for UID:", user.uid);
        }

        // Fetch available locations (simple query, adjust if needed)
        // This assumes locations are public or accessible to authenticated users
        // You might fetch this from a context or service if already loaded elsewhere
        // For simplicity, fetching here. Consider optimizing if locations are static/global.
        const locationsSnapshot = await getDocs(collection(db, "locations"));
        const locationsList = locationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        })); // Map to id and name
        setAvailableLocations(locationsList);
        if (locationsList.length > 0) {
          setLocation(locationsList[0].id); // Default to first location ID
        }
      } catch (err) {
        console.error("Error fetching client data or locations:", err);
        toast({
          title: "Error Loading Data",
          description:
            "Failed to load necessary information. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingClient(false);
      }
    };

    fetchClientAndLocations();
  }, [user, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !clientData) {
      toast({
        title: "Error",
        description: "Client information is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a title for your appointment.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for date/time if provided
    let startDateTime = null;
    if (preferredDate) {
      const [year, month, day] = preferredDate.split("-").map(Number);
      let hours = 9; // Default hour
      let minutes = 0; // Default minute
      if (preferredTime) {
        const [h, m] = preferredTime.split(":").map(Number);
        hours = h || hours;
        minutes = m || minutes;
      }
      startDateTime = new Date(year, month - 1, day, hours, minutes); // Month is 0-indexed
      if (isNaN(startDateTime.getTime())) {
        toast({
          title: "Invalid Date/Time",
          description: "The provided preferred date/time is invalid.",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Prepare request data
      const requestData = {
        title: title.trim(),
        notes: notes.trim(),
        // Include preferred date/time if provided
        ...(startDateTime && {
          preferredStart: startDateTime,
          preferredEnd: new Date(startDateTime.getTime() + 60 * 60 * 1000), // Assume 1-hour duration
        }),
        // location is now passed separately, so don't include it here
        // Add any other relevant fields you want to collect initially
      };

      // Use the service to create the request - pass location as a separate argument
      const result = await AppointmentRequestService.createRequest(
        user.uid, // clientId
        "create", // requestType
        requestData, // requestData
        location // location (top-level field)
      );

      if (result.success) {
        toast({
          title: "Booking Request Sent",
          description: `Your appointment request has been submitted for approval. Request ID: ${result.requestId}`, // Include ID in success message
        });
        // Optionally call a callback prop if provided by parent
        if (onBookingRequested) {
          onBookingRequested();
        }
        // Navigate back to the client dashboard
        // Note: This might not be ideal if the form is inside a dialog.
        // Consider calling a callback to close the dialog instead.
        // navigate("/client-dashboard");
      } else {
        throw new Error(result.error || "Failed to submit request.");
      }
    } catch (error) {
      console.error("Error submitting booking request:", error);
      toast({
        title: "Booking Request Failed",
        description:
          error.message ||
          "An error occurred while submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingClient) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading booking form...</p>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Unable to load your profile. Please contact the clinic.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-2">
      {/* --- ADD ACCESSIBILITY HEADERS FOR DIALOG CONTEXT --- */}
      {/* Visually hidden but accessible to screen readers */}
      <DialogHeader className="sr-only">
        <DialogTitle>Request New Appointment</DialogTitle>
        <DialogDescription>
          Fill in the details below and submit your request. Our team will
          review it and confirm the appointment.
        </DialogDescription>
      </DialogHeader>
      {/* --- END ACCESSIBILITY HEADERS --- */}

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          {" "}
          {/* Center align header */}
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> {/* Add icon */}
            Request New Appointment
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the details below and submit your request. Our team will
            review it and confirm the appointment.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={clientData.name || "Unknown Client"}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="appointment-title">Appointment Title *</Label>
              <Input
                id="appointment-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Nutrition Consultation, Follow-up"
                required
              />
            </div>

            {/* Location Selection */}
            {availableLocations.length > 0 && (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="location-select">Preferred Location *</Label>
                <select
                  id="location-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border rounded p-2 w-full" // Added w-full
                  required // Make it required if location is mandatory
                >
                  {availableLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preferred Date/Time (Optional but useful) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="preferred-date">
                  Preferred Date (Optional)
                </Label>
                <Input
                  type="date"
                  id="preferred-date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]} // Prevent past dates
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="preferred-time">
                  Preferred Time (Optional)
                </Label>
                <Input
                  type="time"
                  id="preferred-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="appointment-notes">Notes (Optional)</Label>
              <Textarea
                id="appointment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requests, symptoms, or information you'd like to share..."
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting
                  ? "Submitting Request..."
                  : "Submit Booking Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientBookingForm;
