// src/components/Clients/ClientForm.jsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "../hooks/use-toast";

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

function ClientForm({ clientToEdit, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    sport: "",
    club: "",
    birthDate: "",
    relativePhoneNumber: "",
    relativeName: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setFormData(clientToEdit);
    } else {
      setFormData({
        name: "",
        email: "",
        phoneNumber: "",
        sport: "",
        club: "",
        birthDate: "",
        relativePhoneNumber: "",
        relativeName: "",
      });
    }
  }, [clientToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Client Name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      toast({
        title: "Validation Error",
        description: "A valid Email is required.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone Number is required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Failed to save client:", error);
      toast({
        title: "Error",
        description: "There was an error saving the client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* <-- Grouping related inputs for better structure */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Client Name"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="client@example.com"
            required
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="e.g., 555-123-4567"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="birthDate">Birth Date</Label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sport">Sport</Label>
          <Input
            id="sport"
            name="sport"
            value={formData.sport}
            onChange={handleChange}
            placeholder="e.g., Football"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="club">Club</Label>
          <Input
            id="club"
            name="club"
            value={formData.club}
            onChange={handleChange}
            placeholder="e.g., Al-Ahly"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="relativeName">Relative's Name</Label>
          <Input
            id="relativeName"
            name="relativeName"
            value={formData.relativeName}
            onChange={handleChange}
            placeholder="Relative's Name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="relativePhoneNumber">Relative's Phone Number</Label>
          <Input
            id="relativePhoneNumber"
            name="relativePhoneNumber"
            type="tel"
            value={formData.relativePhoneNumber}
            onChange={handleChange}
            placeholder="Relative's Phone Number"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : clientToEdit ? "Save Changes" : "Add Client"}
      </Button>
    </form>
  );
}

export default ClientForm;
