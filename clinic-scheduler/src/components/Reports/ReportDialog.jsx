// src/components/Reports/ReportDialog.jsx

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "../hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import moment from "moment";

function ReportDialog() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [reportType, setReportType] = useState("time");
  const [clientFilterBy, setClientFilterBy] = useState("name");
  const [clientFilterValue, setClientFilterValue] = useState("");
  const [allClients, setAllClients] = useState([]);
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "clients"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllClients(clientsData);
      setIsClientsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getAppointments = async () => {
    setLoading(true);
    try {
      let appointments = [];
      if (reportType === "time") {
        appointments = await getAppointmentsByTime();
      } else {
        appointments = await getAppointmentsByClient();
      }

      if (!appointments || appointments.length === 0) {
        toast({
          title: "No appointments found",
          description: "No appointments matched your selected criteria.",
        });
        setLoading(false);
        return;
      }

      exportToHtml(appointments);
      toast({
        title: "Report generated",
        description: "Your report has been downloaded as an HTML file.",
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Export failed",
        description: `Failed to generate the report. Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsByTime = async () => {
    let constraints = [];
    if (startDate)
      constraints.push(
        where("start", ">=", moment(startDate).startOf("day").toDate())
      );
    if (endDate)
      constraints.push(
        where("start", "<=", moment(endDate).endOf("day").toDate())
      );
    if (status !== "all") constraints.push(where("status", "==", status));
    constraints.push(orderBy("start", "asc"));
    const q = query(collection(db, "appointments"), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapAppointmentDoc);
  };

  const getAppointmentsByClient = async () => {
    if (!clientFilterValue.trim()) {
      toast({
        title: "Please enter a value to search for.",
        variant: "destructive",
      });
      return [];
    }
    let matchingClientIds = [];
    if (clientFilterBy === "club" || clientFilterBy === "sport") {
      const clientQuery = query(
        collection(db, "clients"),
        where(clientFilterBy, "==", clientFilterValue)
      );
      const clientSnapshot = await getDocs(clientQuery);
      matchingClientIds = clientSnapshot.docs.map((doc) => doc.id);
    } else if (clientFilterBy === "name") {
      matchingClientIds = allClients
        .filter((client) =>
          client.name.toLowerCase().includes(clientFilterValue.toLowerCase())
        )
        .map((client) => client.id);
    }

    if (matchingClientIds.length === 0) {
      toast({
        title: "No clients found",
        description: `No clients matched your search.`,
      });
      return [];
    }
    if (matchingClientIds.length > 30) {
      toast({
        title: "Too many clients",
        description: "Report limited to the first 30 matching clients.",
        variant: "destructive",
      });
    }

    let appointmentConstraints = [
      where("clientId", "in", matchingClientIds.slice(0, 30)),
    ];
    if (startDate)
      appointmentConstraints.push(
        where("start", ">=", moment(startDate).startOf("day").toDate())
      );
    if (endDate)
      appointmentConstraints.push(
        where("start", "<=", moment(endDate).endOf("day").toDate())
      );
    if (status !== "all")
      appointmentConstraints.push(where("status", "==", status));
    appointmentConstraints.push(orderBy("start", "asc"));

    const appointmentsQuery = query(
      collection(db, "appointments"),
      ...appointmentConstraints
    );
    const appointmentSnapshot = await getDocs(appointmentsQuery);
    return appointmentSnapshot.docs.map(mapAppointmentDoc);
  };

  const mapAppointmentDoc = (doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      clientName: data.clientName,
      title: data.title,
      status: data.status || "N/A",
      start: moment(data.start.toDate()).format("YYYY-MM-DD HH:mm"),
      end: moment(data.end.toDate()).format("YYYY-MM-DD HH:mm"),
      notes: data.notes || "",
    };
  };

  // 👇 FIX: This function is updated for better browser compatibility.
  const exportToHtml = (appointments) => {
    const getRowColor = (status) => {
      switch (status) {
        case "done":
          return "background-color: #d1fae5;";
        case "missed":
          return "background-color: #fee2e2;";
        case "postponed":
          return "background-color: #fffbe6;";
        default:
          return "";
      }
    };

    const tableRows = appointments
      .map(
        (app) => `
      <tr style="${getRowColor(app.status)}">
        <td>${app.clientName || "N/A"}</td>
        <td>${app.title || "N/A"}</td>
        <td>${app.status || "N/A"}</td>
        <td>${app.start || "N/A"}</td>
        <td>${app.end || "N/A"}</td>
        <td>${app.notes || ""}</td>
      </tr>`
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>Appointment Report</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 2rem; }
              h1 { color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f7f7f7; font-weight: 600; }
              tr:nth-child(even) { background-color: #fcfcfc; }
          </style>
      </head>
      <body>
          <h1>Appointment Report</h1>
          <p>Generated on: ${moment().format("YYYY-MM-DD HH:mm")}</p>
          <table>
              <thead>
                  <tr>
                      <th>Client Name</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Notes</th>
                  </tr>
              </thead>
              <tbody>
                  ${tableRows}
              </tbody>
          </table>
      </body>
      </html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments_report_${moment().format("YYYY-MM-DD")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Appointment Report</DialogTitle>
          <DialogDescription>
            Choose your report type and filters, then export as an HTML file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reportType">Report Type:</Label>
            <Select onValueChange={setReportType} value={reportType}>
              <SelectTrigger id="reportType">
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">By Time & Status</SelectItem>
                <SelectItem value="client">By Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reportType === "client" && (
            <div className="p-4 border rounded-md space-y-4 bg-muted/50">
              <Label>Client Filters</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={setClientFilterBy}
                  value={clientFilterBy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (partial)</SelectItem>
                    <SelectItem value="club">Club (exact)</SelectItem>
                    <SelectItem value="sport">Sport (exact)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={`Enter client ${clientFilterBy}...`}
                  value={clientFilterValue}
                  onChange={(e) => setClientFilterValue(e.target.value)}
                  disabled={isClientsLoading && clientFilterBy === "name"}
                />
              </div>
            </div>
          )}
          <div className="p-4 border rounded-md space-y-4">
            <Label className="text-sm font-medium">
              Optional Date & Status Filters
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-xs">
                  From Date:
                </Label>
                <Input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs">
                  To Date:
                </Label>
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="text-xs">
                Status:
              </Label>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={getAppointments}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Generating..." : "Export to HTML"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReportDialog;
