// src/components/Appointments/AppointmentForm.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  updateDoc,
  doc,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { toast } from "../hooks/use-toast";
import { PaymentService } from "@/services/payment-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useClinic } from "@/contexts/ClinicContext";
import { useLocationPricing } from "@/hooks/useLocationPricing"; // Import the new hook
import { Package } from "lucide-react";

const formatDateForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function AppointmentForm({
  onAppointmentAdded,
  initialStart,
  initialEnd,
  appointmentToEdit,
  onAppointmentDeleted,
  selectedClient,
}) {
  const [allClients, setAllClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Nutrition");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);

  // Simplified payment fields
  const [sessionType, setSessionType] = useState("package"); // package only
  const [selectedPackage, setSelectedPackage] = useState("");
  const [packageName, setPackageName] = useState("");
  // Remove availablePackageSessions state as we're not tracking sessions per appointment anymore
  // const [availablePackageSessions, setAvailablePackageSessions] = useState([]);
  const [usePaidSession, setUsePaidSession] = useState(false); // Checkbox for using paid session
  const [clientRemainingSessions, setClientRemainingSessions] = useState(0); // Track client's remaining sessions

  // --- APPOINTMENT LOCATION STATE ---
  const [selectedAppointmentLocation, setSelectedAppointmentLocation] =
    useState("");
  const { allLocations } = useClinic(); // Get all locations for the single instance

  // --- FETCH LOCATION-SPECIFIC PRICING ---
  const {
    pricing: locationSpecificPricing,
    loading: pricingLoading,
    error: pricingError,
  } = useLocationPricing(selectedAppointmentLocation);

  // --- SET DEFAULT LOCATION ON LOAD/EDIT ---
  useEffect(() => {
    if (appointmentToEdit?.location) {
      setSelectedAppointmentLocation(appointmentToEdit.location);
    } else if (allLocations.length > 0 && !selectedAppointmentLocation) {
      setSelectedAppointmentLocation(allLocations[0]); // Default to first location
    }
  }, [appointmentToEdit, allLocations, selectedAppointmentLocation]);

  // --- FETCH CLIENTS FOR THE SINGLE INSTANCE ---
  useEffect(() => {
    const clientsCollection = collection(db, "clients");
    const q = query(clientsCollection, orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllClients(clientsData);
        setIsClientLoading(false);
      },
      (error) => {
        console.error("Error fetching clients for form:", error);
        setAllClients([]);
        setIsClientLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- FIND CLIENT'S REMAINING SESSIONS ---
  useEffect(() => {
    const findClientRemainingSessions = async () => {
      // Only check if a client is selected and it's a package appointment
      if (sessionType !== "package" || !clientId) {
        setClientRemainingSessions(0);
        setUsePaidSession(false);
        return;
      }

      try {
        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);
        const clientData = clientSnap.exists() ? clientSnap.data() : null;
        const remaining = clientData?.remainingSessions || 0;
        setClientRemainingSessions(remaining);
        setUsePaidSession(remaining > 0); // Allow using paid session only if remaining > 0
      } catch (err) {
        console.error("Error checking client remainingSessions:", err);
        setClientRemainingSessions(0);
        setUsePaidSession(false);
      }
    };

    findClientRemainingSessions();
  }, [clientId, sessionType]); // Depend on clientId and sessionType

  useEffect(() => {
    if (isClientLoading) return;

    if (appointmentToEdit) {
      setClientId(appointmentToEdit.clientId);
      setTitle(appointmentToEdit.title);
      setStartDateTime(formatDateForInput(appointmentToEdit.start));
      setEndDateTime(formatDateForInput(appointmentToEdit.end));
      setNotes(appointmentToEdit.notes || "");
      setSelectedAppointmentLocation(appointmentToEdit.location || ""); // Set location from edit data

      // Set session type based on existing appointment
      if (appointmentToEdit.isPackage) {
        setSessionType("package");
        setSelectedPackage(appointmentToEdit.packageId || "");
        setPackageName(appointmentToEdit.packageName || "");
      } else {
        setSessionType("single");
      }
    } else if (selectedClient) {
      setClientId(selectedClient.id);
      setTitle("Nutrition");
      setNotes("");
      setStartDateTime(initialStart ? formatDateForInput(initialStart) : "");
      setEndDateTime(initialEnd ? formatDateForInput(initialEnd) : "");

      // Reset to defaults
      setSessionType("package");
      setSelectedPackage("");
      setPackageName("");
    } else {
      setClientId("");
      setTitle("Nutrition");
      setNotes("");
      setStartDateTime(initialStart ? formatDateForInput(initialStart) : "");
      setEndDateTime(initialEnd ? formatDateForInput(initialEnd) : "");

      // Reset to defaults
      setSessionType("package");
      setSelectedPackage("");
      setPackageName("");
    }
  }, [
    appointmentToEdit,
    selectedClient,
    initialStart,
    initialEnd,
    isClientLoading,
  ]);

  // --- CALCULATE AMOUNT USING LOCATION-SPECIFIC PRICING ---
  const calculateAmount = () => {
    if (sessionType === "package" && selectedPackage) {
      const pkg = (locationSpecificPricing?.packages || []).find(
        (p) => p.id === selectedPackage
      );
      return pkg ? pkg.price : 0;
    }
    return 0;
  };

  // Get package sessions
  const getPackageSessions = () => {
    if (sessionType === "package" && selectedPackage) {
      const pkg = (locationSpecificPricing?.packages || []).find(
        (p) => p.id === selectedPackage
      );
      return pkg ? pkg.sessions : 1;
    }
    return 1;
  };

  // Get package name
  const getPackageName = () => {
    if (sessionType === "package" && selectedPackage) {
      const pkg = (locationSpecificPricing?.packages || []).find(
        (p) => p.id === selectedPackage
      );
      return pkg ? pkg.name : "";
    }
    return packageName;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Please select a client.", variant: "destructive" });
      return;
    }

    if (!selectedAppointmentLocation) {
      toast({
        title: "Please select a location for the appointment.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // --- Define if using a centralized remaining session ---
    const isUsingCentralRemaining = usePaidSession && sessionType === "package";
    if (isUsingCentralRemaining) {
      // Verify client's centralized remainingSessions is > 0 before proceeding.
      try {
        const clientRefCheck = doc(db, "clients", clientId);
        const clientSnapCheck = await getDoc(clientRefCheck);
        const clientDataCheck = clientSnapCheck.exists()
          ? clientSnapCheck.data()
          : null;
        const clientRemainingCheck = clientDataCheck?.remainingSessions || 0;
        if (clientRemainingCheck <= 0) {
          setLoading(false);
          toast({
            title: "No Remaining Sessions",
            description:
              "This client has no remaining prepaid sessions. Please process a package payment first.",
            variant: "destructive",
          });
          return;
        }
      } catch (error_) {
        console.error(
          "Error checking client remainingSessions before booking:",
          error_
        );
        setLoading(false);
        return; // Exit if check fails
      }
    }

    try {
      const startDateObj = new Date(startDateTime);
      const endDateObj = new Date(endDateTime);
      const clientName =
        allClients.find((c) => c.id === clientId)?.name || "Unknown Client";

      const amount = calculateAmount();

      // Determine payment status and session count
      // --- UPDATE: Initialize from appointmentToEdit or defaults ---
      let finalPaymentStatus = appointmentToEdit?.paymentStatus || "unpaid";
      let finalSessionsPaid = appointmentToEdit?.sessionsPaid || 0;
      let finalAmountPaid = appointmentToEdit?.amountPaid || 0;

      // If using a paid session, mark this appointment as paid and update counts
      if (isUsingCentralRemaining) {
        finalPaymentStatus = "paid";
        // Increment sessionsPaid by 1 if using a remaining session during edit
        // For a *new* appointment created with a remaining session, sessionsPaid would be set to 1
        finalSessionsPaid = appointmentToEdit ? finalSessionsPaid + 1 : 1; // If editing, add 1; if new, set to 1
        finalAmountPaid = finalAmountPaid + amount; // Add the new amount to any existing amount paid
      }
      // If NOT using a remaining session, preserve the original values (handled by initialization above)

      const appointmentData = {
        clientId,
        clientName,
        title,
        start: startDateObj,
        end: endDateObj,
        notes,
        amount: parseFloat(amount),
        paymentStatus: finalPaymentStatus, // Use the determined status
        isPackage: sessionType === "package",
        packageSessions: getPackageSessions(),
        sessionsPaid: finalSessionsPaid, // Use the determined sessionsPaid
        packageName: getPackageName(),
        packageId: sessionType === "package" ? selectedPackage : null,
        amountPaid: finalAmountPaid, // Use the determined amountPaid
        lastPaymentUpdate: new Date(),
        location: selectedAppointmentLocation, // Location for appointment
        // Indicate that the session was consumed from the client's centralized pool (only if applicable)
        ...(isUsingCentralRemaining && { usedCentralRemaining: true }),
      };

      if (appointmentToEdit) {
        // For edits, perform a simple update (payment status/session counts handled by logic above)
        await updateDoc(
          doc(db, "appointments", appointmentToEdit.id),
          appointmentData
        );
        toast({ title: "Success", description: "Appointment updated!" });
      } else {
        // Use the transactional helper to create appointment and consume session atomically
        // Pass null for packageAppointmentToDeduct since we're using centralized sessions
        const result = await PaymentService.createAppointmentAndConsumeSession(
          appointmentData,
          null // No specific package appointment to deduct from
        );
        if (!result.success)
          throw new Error(result.error || "Failed to create appointment");
        toast({ title: "Success", description: "Appointment added!" });
      }

      // session consumption handled transactionally by PaymentService.createAppointmentAndConsumeSession

      if (onAppointmentAdded) onAppointmentAdded();
    } catch (err) {
      console.error("Error saving appointment: ", err);
      toast({
        title: "Error",
        description: "Failed to save appointment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!appointmentToEdit) return;

    setLoading(true);
    setIsConfirmDeleteDialogOpen(false);

    try {
      // Use PaymentService to delete appointment and return sessions transactionally
      const result = await PaymentService.deleteAppointmentAndReturnSession(
        appointmentToEdit.id,
        appointmentToEdit
      );
      if (!result.success)
        throw new Error(result.error || "Failed to delete appointment");

      toast({
        title: "Success",
        description: "Appointment deleted successfully!",
      });
      if (onAppointmentDeleted) onAppointmentDeleted();
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectPlaceholder = isClientLoading
    ? "Loading clients..."
    : "Select a client...";

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="clientSelect">Client:</Label>
          {appointmentToEdit ? (
            <Input
              id="clientSelect"
              value={
                allClients.find((c) => c.id === appointmentToEdit.clientId)
                  ?.name || "Unknown Client"
              }
              disabled
              readOnly
            />
          ) : (
            <Select
              value={clientId}
              onValueChange={(value) => setClientId(value)}
              required
              disabled={isClientLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="appointmentTitle">Title:</Label>
          <Select
            value={title}
            onValueChange={(value) => setTitle(value)}
            required
          >
            <SelectTrigger id="appointmentTitle">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nutrition">Nutrition</SelectItem>
              <SelectItem value="Mental">Mental</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* --- APPOINTMENT LOCATION SELECTION --- */}
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="locationSelect">Location:</Label>
          <Select
            value={selectedAppointmentLocation}
            onValueChange={setSelectedAppointmentLocation}
            required
          >
            <SelectTrigger id="locationSelect">
              <SelectValue placeholder="Select a location..." />
            </SelectTrigger>
            <SelectContent>
              {allLocations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="startDateTime">Start Time:</Label>
            <Input
              type="datetime-local"
              id="startDateTime"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              required
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="endDateTime">End Time:</Label>
            <Input
              type="datetime-local"
              id="endDateTime"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Simplified Session Type Selection */}
        <div className="space-y-4 p-4 bg-white rounded-lg border">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Session Type
          </Label>

          <div className="space-y-2">
            {pricingLoading && <p>Loading packages...</p>}
            {pricingError && (
              <p className="text-destructive">
                Error loading packages: {pricingError.message}
              </p>
            )}
            {/* Show Select Package only if NOT using paid session OR no remaining sessions */}
            {(!usePaidSession || clientRemainingSessions <= 0) && (
              <Select
                value={selectedPackage}
                onValueChange={setSelectedPackage}
                disabled={
                  pricingLoading || !locationSpecificPricing?.packages?.length
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      pricingLoading ? "Loading..." : "Select a package"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(locationSpecificPricing?.packages || []).map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.sessions} sessions (${pkg.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Show Available Paid Sessions section only if using paid session AND sessions exist */}
          {usePaidSession && clientRemainingSessions > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <Label className="font-medium text-green-800 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Available Paid Sessions (Centralized)
              </Label>
              <p className="mt-1 text-sm text-green-700">
                Client has <strong>{clientRemainingSessions}</strong> remaining
                session{clientRemainingSessions !== 1 ? "s" : ""}.
              </p>
              <p className="mt-1 text-xs text-green-600 italic">
                This appointment will be marked as 'Paid'. One session will be
                deducted from the client's centralized pool.
              </p>
            </div>
          )}

          {/* Checkbox to toggle between using paid sessions and selecting a new package */}
          {sessionType === "package" && (
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="use-paid-session-toggle"
                checked={usePaidSession}
                onChange={(e) => setUsePaidSession(e.target.checked)}
                className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                disabled={clientRemainingSessions <= 0} // Disable if no sessions
              />
              <Label
                htmlFor="use-paid-session-toggle"
                className="ml-2 text-sm text-green-700"
              >
                Use existing paid session(s) from centralized pool
              </Label>
            </div>
          )}

          {/* Display calculated amount */}
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <Label>Appointment Amount:</Label>
            <p className="text-xl font-bold">${calculateAmount().toFixed(2)}</p>
            {sessionType === "package" && selectedPackage && (
              <p className="text-sm text-muted-foreground">
                Package: {getPackageSessions()} sessions
              </p>
            )}
          </div>
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="appointmentNotes">Notes (Optional):</Label>
          <Textarea
            id="appointmentNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2">
          {appointmentToEdit && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Deleting..." : "Delete Appointment"}
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {loading
              ? "Saving..."
              : appointmentToEdit
              ? "Save Changes"
              : "Schedule Appointment"}
          </Button>
        </div>
      </form>

      {appointmentToEdit && (
        <ConfirmationDialog
          isOpen={isConfirmDeleteDialogOpen}
          onOpenChange={setIsConfirmDeleteDialogOpen}
          title="Delete Appointment?"
          description={`Are you sure you want to delete the appointment with ${appointmentToEdit.clientName}?`}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export default AppointmentForm;
