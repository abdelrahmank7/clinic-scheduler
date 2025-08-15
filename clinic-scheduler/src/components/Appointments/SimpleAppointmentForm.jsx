// src/components/Appointments/SimpleAppointmentForm.jsx
import React, { useState } from "react";
import { db } from "../../firebase";
import { addDoc, collection } from "firebase/firestore";
import { toast } from "../hooks/use-toast";
import { formatDateTime, formatTime } from "../../utils/date-helpers";

// Shadcn UI components
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

function SimpleAppointmentForm({ onSave, initialData, onCancel }) {
  const [title, setTitle] = useState(initialData.title || "nutrition");
  const [notes, setNotes] = useState(initialData.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!title) {
      toast({
        title: "Title is required",
        description: "Please enter a title for the appointment.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const appointmentData = {
      clientId: initialData.clientId,
      clientName: initialData.clientName,
      start: initialData.start,
      end: initialData.end,
      title: title,
      notes: notes,
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "appointments"), appointmentData);
      toast({
        title: "Appointment created",
        description: `Appointment for ${initialData.clientName} has been scheduled.`,
      });
      onSave(); // Close the form
    } catch (err) {
      console.error("Error adding appointment:", err);
      toast({
        title: "Scheduling failed",
        description: "Failed to schedule the appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label>Client:</Label>
          <Input type="text" value={initialData.clientName} disabled />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label>Time:</Label>
          <Input
            type="text"
            value={`${formatDateTime(initialData.start)} - ${formatTime(
              initialData.end
            )}`}
            disabled
          />
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
          <Label htmlFor="appointmentNotes">Notes (Optional):</Label>
          <Textarea
            id="appointmentNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Schedule Appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SimpleAppointmentForm;
