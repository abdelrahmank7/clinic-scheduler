// src/pages/ReportsPage.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Users, BarChart3 } from "lucide-react"; // Import icons
import { useNavigate } from "react-router-dom";

function ReportsPageContent() {
  // Renamed to distinguish from the exported default
  const navigate = useNavigate();

  const handleNavigateToAttendance = () => {
    navigate("/reports/attendance"); // Navigate to the specific attendance report page
  };

  return (
    <div className="w-full gradient-background min-h-screen p-2">
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-4 min-h-[calc(100vh-48px)] flex flex-col">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b pb-2 gap-2">
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Client Attendance Report Card */}
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col" // Make card fill height and flex column
            onClick={handleNavigateToAttendance} // Navigate on card click
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> {/* Use Users icon */}
                Client Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              {" "}
              {/* Allow content to grow */}
              <p className="text-sm text-muted-foreground mb-3">
                View daily attendance summary for clients.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                View Report
              </Button>
            </CardContent>
          </Card>

          {/* Add more report cards here as needed */}
          {/* Example: Payment Reports Card */}
          {/* <Card className="hover:shadow-md transition-shadow h-full flex flex-col"> {/* Make card fill height */}
          {/*   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> */}
          {/*     <CardTitle className="text-sm font-medium flex items-center gap-2"> */}
          {/*       <BarChart3 className="h-4 w-4" /> {/* Use BarChart3 icon */}
          {/*       Payment Reports */}
          {/*     </CardTitle> */}
          {/*   </CardHeader> */}
          {/*   <CardContent className="flex-grow"> {/* Allow content to grow */}
          {/*     <p className="text-sm text-muted-foreground mb-3"> */}
          {/*       View revenue, methods, and clients. */}
          {/*     </p> */}
          {/*     <Button variant="outline" size="sm" className="w-full"> */}
          {/*       Generate Report */}
          {/*     </Button> */}
          {/*   </CardContent> */}
          {/* </Card> */}

          {/* Example: Appointment Summary Card */}
          <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
            {" "}
            {/* Make card fill height */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {/* Use Calendar icon */}
                Appointment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              {" "}
              {/* Allow content to grow */}
              <p className="text-sm text-muted-foreground mb-3">
                View appointment trends and stats.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Detailed View for Client Attendance Report (Initially hidden or on a sub-route) */}
        {/* This part is now handled by the dedicated /reports/attendance page. */}
        {/* The main Reports page just lists available reports. */}
      </div>
    </div>
  );
}

// --- Wrap the content with MainLayout ---
function ReportsPage() {
  return (
    <MainLayout>
      <ReportsPageContent />
    </MainLayout>
  );
}

export default ReportsPage;
