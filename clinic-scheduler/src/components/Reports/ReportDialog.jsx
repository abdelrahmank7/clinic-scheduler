// src/components/Reports/ReportDialog.jsx

import React, { useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
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
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getAppointments = async () => {
    setLoading(true);
    let constraints = [];

    // The start and end date filters are a range filter on the 'start' field.
    // If we use a range filter, we must also order the results by that same field.
    if (startDate) {
      constraints.push(
        where("start", ">=", moment(startDate).startOf("day").toDate())
      );
    }
    if (endDate) {
      constraints.push(
        where("start", "<=", moment(endDate).endOf("day").toDate())
      );
    }

    // Now, add the orderBy clause for the 'start' field, which is required
    // when using a range filter on it.
    constraints.push(orderBy("start", "asc"));

    // If the status is not 'all', add the equality filter.
    // This will work correctly with the range filter and orderBy clause.
    if (status !== "all") {
      constraints.push(where("status", "==", status));
    }

    // Construct the final query
    const q = query(collection(db, "appointments"), ...constraints);

    try {
      const querySnapshot = await getDocs(q);
      const appointments = querySnapshot.docs.map((doc) => {
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
      });

      if (appointments.length === 0) {
        toast({
          title: "No appointments found",
          description:
            "No appointments matched the selected criteria for the report.",
          variant: "default",
        });
        setLoading(false);
        return;
      }

      exportToHtml(appointments);
      toast({
        title: "Report generated",
        description:
          "Your appointment report has been downloaded as an HTML file.",
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error fetching appointments for report:", error);
      toast({
        title: "Export failed",
        description: `Failed to generate the report. Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToHtml = (appointments) => {
    const getRowColor = (status) => {
      switch (status) {
        case "done":
          return "background-color: #d1fae5;"; // green-100
        case "missed":
          return "background-color: #fee2e2;"; // red-100
        case "postponed":
          return "background-color: #fffbe6;"; // yellow-100
        default:
          return "";
      }
    };

    const tableRows = appointments
      .map(
        (app) => `
      <tr style="${getRowColor(app.status)}">
        <td>${app.clientName}</td>
        <td>${app.title}</td>
        <td>${app.status}</td>
        <td>${app.start}</td>
        <td>${app.end}</td>
        <td>${app.notes}</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Appointment Report</title>
          <style>
              body { font-family: sans-serif; margin: 2rem; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
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
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `appointments_report_${moment().format("YYYY-MM-DD")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Filter appointments by a date range and status, then export as an
            HTML file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">From Date:</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">To Date:</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status:</Label>
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
