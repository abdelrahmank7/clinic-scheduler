// src/components/Appointments/AppointmentForm.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "../hooks/use-toast";
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
import { usePricing } from "@/contexts/PricingContext";

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
  const [sessionType, setSessionType] = useState("single"); // single, package, custom
  const [selectedPackage, setSelectedPackage] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [packageName, setPackageName] = useState("");

  const { selectedClinic } = useClinic();
  const { pricing } = usePricing();

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
        setIsClientLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isClientLoading) return;

    if (appointmentToEdit) {
      setClientId(appointmentToEdit.clientId);
      setTitle(appointmentToEdit.title);
      setStartDateTime(formatDateForInput(appointmentToEdit.start));
      setEndDateTime(formatDateForInput(appointmentToEdit.end));
      setNotes(appointmentToEdit.notes || "");

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
      setSessionType("single");
      setSelectedPackage("");
      setCustomAmount(0);
      setPackageName("");
    } else {
      setClientId("");
      setTitle("Nutrition");
      setNotes("");
      setStartDateTime(initialStart ? formatDateForInput(initialStart) : "");
      setEndDateTime(initialEnd ? formatDateForInput(initialEnd) : "");

      // Reset to defaults
      setSessionType("single");
      setSelectedPackage("");
      setCustomAmount(0);
      setPackageName("");
    }
  }, [
    appointmentToEdit,
    selectedClient,
    initialStart,
    initialEnd,
    isClientLoading,
  ]);

  // Calculate amount based on session type
  const calculateAmount = () => {
    if (sessionType === "single") {
      return pricing?.singleSession || 100;
    } else if (sessionType === "package" && selectedPackage) {
      const pkg = (pricing?.packages || []).find(
        (p) => p.id === selectedPackage
      );
      return pkg ? pkg.price : 0;
    } else if (sessionType === "custom") {
      return customAmount || 0;
    }
    return 0;
  };

  // Get package sessions
  const getPackageSessions = () => {
    if (sessionType === "package" && selectedPackage) {
      const pkg = (pricing?.packages || []).find(
        (p) => p.id === selectedPackage
      );
      return pkg ? pkg.sessions : 1;
    }
    return 1;
  };

  // Get package name
  const getPackageName = () => {
    if (sessionType === "package" && selectedPackage) {
      const pkg = (pricing?.packages || []).find(
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

    if (!selectedClinic) {
      toast({ title: "Please select a clinic first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const startDateObj = new Date(startDateTime);
      const endDateObj = new Date(endDateTime);
      const clientName =
        allClients.find((c) => c.id === clientId)?.name || "Unknown Client";

      const amount = calculateAmount();

      const appointmentData = {
        clientId,
        clientName,
        title,
        start: startDateObj,
        end: endDateObj,
        notes,
        amount: parseFloat(amount),
        paymentStatus: "unpaid", // Always start as unpaid
        isPackage: sessionType === "package",
        packageSessions: sessionType === "package" ? getPackageSessions() : 1,
        sessionsPaid: 0, // Always start with 0 sessions paid
        packageName: getPackageName(),
        packageId: sessionType === "package" ? selectedPackage : null,
        lastPaymentUpdate: new Date(),
        clinicId: selectedClinic,
        createdAt: new Date(),
      };

      if (appointmentToEdit) {
        await updateDoc(
          doc(db, "appointments", appointmentToEdit.id),
          appointmentData
        );
        toast({ title: "Success", description: "Appointment updated!" });
      } else {
        await addDoc(collection(db, "appointments"), appointmentData);
        toast({ title: "Success", description: "Appointment added!" });
      }

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
      await deleteDoc(doc(db, "appointments", appointmentToEdit.id));
      toast({
        title: "Success",
        description: "Appointment deleted successfully!",
      });
      if (onAppointmentDeleted) {
        onAppointmentDeleted();
      }
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
          <Label className="text-lg font-semibold">Session Type</Label>

          <RadioGroup
            value={sessionType}
            onValueChange={(value) => setSessionType(value)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Single Session</Label>
              <span className="text-muted-foreground ml-2">
                (${pricing?.singleSession || 100})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="package" id="package" />
              <Label htmlFor="package">Package</Label>
            </div>

            {sessionType === "package" && (
              <div className="ml-6 space-y-2">
                <Select
                  value={selectedPackage}
                  onValueChange={setSelectedPackage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {(pricing?.packages || []).map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.sessions} sessions (${pkg.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Custom Amount</Label>
            </div>

            {sessionType === "custom" && (
              <div className="ml-6 space-y-2">
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) =>
                    setCustomAmount(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                  placeholder="Enter custom amount"
                />
              </div>
            )}
          </RadioGroup>

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
