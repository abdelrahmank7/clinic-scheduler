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
import PaymentStatusBadge from "../Payment/PaymentStatusBadge";
import { useClinic } from "@/contexts/ClinicContext";

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
  const [amount, setAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [isPackage, setIsPackage] = useState(false);
  const [packageSessions, setPackageSessions] = useState(1);
  const [sessionsPaid, setSessionsPaid] = useState(0);

  const { selectedClinic } = useClinic();

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

      // Add these lines for payment fields
      setAmount(appointmentToEdit.amount || 0);
      setPaymentStatus(appointmentToEdit.paymentStatus || "unpaid");
      setIsPackage(appointmentToEdit.isPackage || false);
      setPackageSessions(appointmentToEdit.packageSessions || 1);
      setSessionsPaid(appointmentToEdit.sessionsPaid || 0);
    } else if (selectedClient) {
      setClientId(selectedClient.id);
      setTitle("Nutrition");
      setNotes("");
      setStartDateTime(initialStart ? formatDateForInput(initialStart) : "");
      setEndDateTime(initialEnd ? formatDateForInput(initialEnd) : "");

      // Reset payment fields for new appointments
      setAmount(0);
      setPaymentStatus("unpaid");
      setIsPackage(false);
      setPackageSessions(1);
      setSessionsPaid(0);
    } else {
      setClientId("");
      setTitle("Nutrition");
      setNotes("");
      setStartDateTime(initialStart ? formatDateForInput(initialStart) : "");
      setEndDateTime(initialEnd ? formatDateForInput(initialEnd) : "");

      // Reset payment fields for new appointments
      setAmount(0);
      setPaymentStatus("unpaid");
      setIsPackage(false);
      setPackageSessions(1);
      setSessionsPaid(0);
    }
  }, [
    appointmentToEdit,
    selectedClient,
    initialStart,
    initialEnd,
    isClientLoading,
  ]);

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
      const appointmentData = {
        clientId,
        clientName,
        title,
        start: startDateObj,
        end: endDateObj,
        notes,
        amount: parseFloat(amount),
        paymentStatus,
        isPackage,
        packageSessions: isPackage ? parseInt(packageSessions) : 1,
        sessionsPaid: isPackage
          ? parseInt(sessionsPaid)
          : paymentStatus === "paid"
          ? 1
          : 0,
        lastPaymentUpdate: new Date(),
        clinicId: selectedClinic, // Add clinic ID
      };

      if (appointmentToEdit) {
        await updateDoc(
          doc(db, "appointments", appointmentToEdit.id),
          appointmentData
        );
        toast({ title: "Success", description: "Appointment updated!" });
      } else {
        await addDoc(collection(db, "appointments"), {
          ...appointmentData,
          createdAt: new Date(),
        });
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
        variant: "destructive",
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
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="amount">Amount ($)</Label>
          <Input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select
            value={paymentStatus}
            onValueChange={(value) => setPaymentStatus(value)}
            required
          >
            <SelectTrigger id="paymentStatus">
              <SelectValue placeholder="Select payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label>Payment Type</Label>
          <RadioGroup
            value={isPackage ? "package" : "single"}
            onValueChange={(value) => setIsPackage(value === "package")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Single Session</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="package" id="package" />
              <Label htmlFor="package">Package</Label>
            </div>
          </RadioGroup>
        </div>
        {isPackage && (
          <>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="packageSessions">Total Sessions in Package</Label>
              <Input
                type="number"
                id="packageSessions"
                value={packageSessions}
                onChange={(e) => setPackageSessions(e.target.value)}
                min="1"
                required
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="sessionsPaid">Sessions Paid For</Label>
              <Input
                type="number"
                id="sessionsPaid"
                value={sessionsPaid}
                onChange={(e) => setSessionsPaid(e.target.value)}
                min="0"
                max={packageSessions}
                required
              />
            </div>
          </>
        )}{" "}
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
