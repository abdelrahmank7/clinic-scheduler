// src/pages/EntryPage.jsx (NEW FILE)
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";

function EntryPage() {
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    navigate("/login"); // Navigate to the admin login page
  };

  const handleClientLogin = () => {
    navigate("/client/login"); // Navigate to the new client login page
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Client Card */}
        <Card className="shadow-lg">
          {" "}
          {/* Removed onClick from Card */}
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <User className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-xl font-semibold">
              Client Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Log in to view your requests and manage your appointments.
            </p>
            {/* Button is the primary interactive element */}
            <Button
              variant="default"
              className="w-full"
              onClick={handleClientLogin}
            >
              Access Client Portal
            </Button>
          </CardContent>
        </Card>

        {/* Admin Card */}
        <Card className="shadow-lg">
          {" "}
          {/* Removed onClick from Card */}
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Calendar className="h-12 w-12 text-indigo-500" />
            </div>
            <CardTitle className="text-xl font-semibold">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Log in to manage appointments, clients, and requests.
            </p>
            {/* Button is the primary interactive element */}
            <Button
              variant="default"
              className="w-full"
              onClick={handleAdminLogin}
            >
              Access Admin Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default EntryPage;
