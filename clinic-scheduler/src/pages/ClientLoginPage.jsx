// src/pages/ClientLoginPage.jsx (Updated to check session internally)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientSession } from "@/contexts/ClientSessionContext"; // Import the new context

function ClientLoginPage() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    clientSession,
    loginClient,
    loading: sessionLoading,
  } = useClientSession(); // Use the context

  // Check if already logged in as a client and redirect
  useEffect(() => {
    if (!sessionLoading && clientSession) {
      navigate("/client/portal"); // Redirect if already logged in
    }
  }, [clientSession, sessionLoading, navigate]);

  // If session is loading or user is already logged in, don't show the form yet
  if (sessionLoading || clientSession) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <p>Loading...</p>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both your name and phone number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Query the clients collection by name and phone number
      const clientsQuery = query(
        collection(db, "clients"),
        where("name", "==", name.trim()),
        where("phoneNumber", "==", phoneNumber.trim())
      );

      const querySnapshot = await getDocs(clientsQuery);

      if (querySnapshot.empty) {
        toast({
          title: "Login Failed",
          description:
            "No client found with the provided name and phone number.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Assuming name + phone is unique, take the first match
      const clientDoc = querySnapshot.docs[0];
      const clientData = clientDoc.data();

      // Store client session using the context
      loginClient({
        id: clientDoc.id, // Firestore document ID
        name: clientData.name,
        phoneNumber: clientData.phoneNumber,
        email: clientData.email, // Optional: store email if needed later
      });

      toast({
        title: "Login Successful",
        description: `Welcome back, ${clientData.name}!`,
      });

      // Navigate to the client portal
      navigate("/client/portal");
    } catch (error) {
      console.error("Error logging in client:", error);
      toast({
        title: "Login Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Client Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ClientLoginPage;
