// src/pages/ClientAttendanceReportPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion"; // Import framer-motion for animations
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
// --- CORRECTLY IMPORT format from date-fns ---
import { format } from "date-fns";
import {
  Download,
  Printer,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { db } from "../firebase"; // Import Firebase DB instance
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore"; // Import Firestore functions
// --- Import MainLayout ---
import MainLayout from "@/components/layout/MainLayout"; // Import the MainLayout component
// --- Import Clinic Context if needed for location filtering ---
// import { useClinic } from "@/contexts/ClinicContext";

function ClientAttendanceReportPageContent() {
  // Renamed to distinguish from the exported default
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd")); // Default to today's date
  const { toast } = useToast();
  // const { selectedLocations } = useClinic(); // Get selected locations if needed for filtering

  // --- ANIMATION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Delay each child animation
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Function to fetch and generate the client attendance report data for a specific date
  const generateAttendanceReportData = async (dateStr) => {
    setLoading(true);
    setReportData(null); // Clear previous data
    try {
      // --- FETCH LOGIC ---
      // Query the 'appointments' collection
      // Filter by start date (convert dateStr to start and end of day timestamps)
      const startDate = new Date(dateStr);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateStr);
      endDate.setHours(23, 59, 59, 999);

      let appointmentsQuery = query(
        collection(db, "appointments"),
        where("start", ">=", Timestamp.fromDate(startDate)),
        where("start", "<=", Timestamp.fromDate(endDate)),
        orderBy("start", "asc") // Order by start time for better presentation
      );

      // Add location filter if specific locations are selected via context
      // if (selectedLocations && selectedLocations.length > 0) {
      //    // Assuming appointments have a 'location' field stored as a string matching location IDs/names
      //    // This requires the 'appointments' collection to have a 'location' field.
      //    appointmentsQuery = query(
      //      appointmentsQuery,
      //      where("location", "in", selectedLocations)
      //    );
      // }

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start?.toDate
          ? doc.data().start.toDate()
          : doc.data().start,
        end: doc.data().end?.toDate ? doc.data().end.toDate() : doc.data().end,
      }));

      // Group appointments by status
      const doneAppointments = appointmentsList.filter(
        (appt) => appt.status === "done"
      );
      const missedAppointments = appointmentsList.filter(
        (appt) => appt.status === "missed"
      );
      const postponedAppointments = appointmentsList.filter(
        (appt) => appt.status === "postponed"
      );

      // Determine payment type for each appointment (example logic)
      // You might need to fetch associated payment records or check the appointment data itself.
      const annotatePaymentType = (appt) => {
        // Example: Check appointment fields or linked payment ID
        // This is highly dependent on your data structure.
        // Common approaches:
        // 1. Check `appt.paymentStatus` directly if stored in appointment (e.g., 'paid', 'package_used', 'not_collected')
        // 2. Check `appt.packageId` and if it exists, assume package was used.
        // 3. Check `appt.paymentId` and fetch the payment record to determine status/method.
        // Let's assume a simple field `paymentStatus` exists in the appointment doc for now.
        // If not, you need to implement the logic based on your schema.
        const paymentStatus = appt.paymentStatus || "unknown"; // Default if field doesn't exist
        let paymentType = "Not Collected"; // Default assumption
        let packageName = null;

        if (paymentStatus === "paid") {
          paymentType = "Paid";
        } else if (paymentStatus === "package_used" || appt.packageId) {
          // Check for package usage flag or ID
          paymentType = "Package";
          // Optionally fetch package name if needed for display
          // packageName = await getPackageName(appt.packageId); // Requires another fetch
          packageName = appt.packageName || "Package Used"; // Use stored name if available
        } else if (paymentStatus === "not_collected") {
          paymentType = "Not Collected";
        }
        // Add more conditions if you have other payment types like 'partially_paid', etc.

        return { ...appt, paymentType, packageName };
      };

      const annotatedDone = doneAppointments.map(annotatePaymentType);
      const annotatedMissed = missedAppointments.map(annotatePaymentType);
      const annotatedPostponed = postponedAppointments.map(annotatePaymentType);

      const data = {
        date: dateStr,
        summary: {
          total: appointmentsList.length,
          done: annotatedDone.length,
          missed: annotatedMissed.length,
          postponed: annotatedPostponed.length,
        },
        details: {
          done: annotatedDone,
          missed: annotatedMissed,
          postponed: annotatedPostponed,
        },
      };

      setReportData(data);
      toast({
        title: "Report Data Loaded",
        description: `Data for ${dateStr} has been loaded.`,
      });
    } catch (error) {
      console.error("Error generating attendance report:", error);
      toast({
        title: "Report Generation Failed",
        description:
          "There was an error loading the report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to export the attendance report (HTML or PDF)
  const exportAttendanceReport = (format) => {
    // 'format' is the export type (html/pdf)
    if (!reportData) {
      console.warn("No attendance report data to export.");
      toast({
        title: "Export Failed",
        description:
          "No report data is available to export. Please load the data first.",
        variant: "destructive",
      });
      return;
    }

    const { date, summary, details } = reportData; // Destructure data

    // --- CORRECTED: Define generateAttendanceHTML INSIDE exportAttendanceReport ---
    const generateAttendanceHTML = (
      reportDate,
      reportSummary,
      reportDetails
    ) => {
      // Use passed parameters to avoid scope issues
      // Import format inside this function or ensure it's in scope (it is imported at the top of the file)
      return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Client Attendance Report - ${reportDate}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f9fafb; color: #1f2937; }
                .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
                h1 { font-size: 1.8rem; margin: 0; color: #111827; }
                h2, h3, h4 { margin: 10px 0; color: #374151; }
                h3 { font-size: 1.2rem; }
                h4 { font-size: 1.1rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
                th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
                th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
                /* Status-specific styling */
                tr.done { background-color: #ecfdf5; } /* Light green for done */
                tr.missed { background-color: #fef2f2; } /* Light red for missed */
                tr.postponed { background-color: #fffbeb; } /* Light yellow for postponed */
                /* Payment type badges */
                .badge-paid { background-color: #16a34a; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; }
                .badge-package { background-color: #d97706; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; }
                .badge-not-collected { background-color: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; }
                .summary-container { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 1rem; margin: 1rem 0; padding: 1rem; background-color: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
                .summary-item { text-align: center; }
                .summary-value { font-size: 1.5rem; font-weight: bold; }
                .summary-label { font-size: 0.9rem; color: #6b7280; }
                .done-summary { color: #059669; } /* Green for done */
                .missed-summary { color: #dc2626; } /* Red for missed */
                .postponed-summary { color: #d97706; } /* Yellow for postponed */
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Client Attendance Report</h1>
                <h2>Date: ${reportDate}</h2>
            </div>
            <div class="summary-container">
                <div class="summary-item">
                    <div class="summary-value">${reportSummary.total}</div>
                    <div class="summary-label">Total Appointments</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value done-summary">${
                      reportSummary.done
                    }</div>
                    <div class="summary-label">Done</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value missed-summary">${
                      reportSummary.missed
                    }</div>
                    <div class="summary-label">Missed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value postponed-summary">${
                      reportSummary.postponed
                    }</div>
                    <div class="summary-label">Postponed</div>
                </div>
            </div>

            <h3>Details</h3>
            <h4>Done (${reportSummary.done})</h4>
            <table>
                <thead>
                    <tr><th>Client</th><th>Status</th><th>Payment Type</th><th>Package</th><th>Amount</th><th>Start Time</th><th>End Time</th></tr>
                </thead>
                <tbody>
                    ${reportDetails.done
                      .map(
                        (appt) => `
                        <tr class="done">
                            <td>${appt.clientName || "N/A"}</td>
                            <td><CheckCircle class="h-4 w-4 inline mr-1 text-green-600" /> ${
                              appt.status
                            }</td>
                            <td><span class="badge-${
                              appt.paymentType
                                .toLowerCase()
                                .replace(/\s+/g, "-") || "default"
                            }">${appt.paymentType}</span></td>
                            <td>${appt.packageName || "N/A"}</td>
                            <td>$${appt.amount?.toFixed(2) || "0.00"}</td>
                            <td>${
                              appt.start ? format(appt.start, "HH:mm") : "N/A"
                            }</td> <!-- CORRECTED: Use imported format -->
                            <td>${
                              appt.end ? format(appt.end, "HH:mm") : "N/A"
                            }</td>   <!-- CORRECTED: Use imported format -->
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>

            <h4>Missed (${reportSummary.missed})</h4>
            <table>
                <thead><tr><th>Client</th><th>Status</th><th>Payment Type</th><th>Package</th><th>Amount</th><th>Start Time</th><th>End Time</th></tr></thead>
                <tbody>
                    ${reportDetails.missed
                      .map(
                        (appt) => `
                        <tr class="missed">
                            <td>${appt.clientName || "N/A"}</td>
                            <td><XCircle class="h-4 w-4 inline mr-1 text-red-600" /> ${
                              appt.status
                            }</td>
                            <td><span class="badge-${
                              appt.paymentType
                                .toLowerCase()
                                .replace(/\s+/g, "-") || "default"
                            }">${appt.paymentType}</span></td>
                            <td>${appt.packageName || "N/A"}</td>
                            <td>$${appt.amount?.toFixed(2) || "0.00"}</td>
                            <td>${
                              appt.start ? format(appt.start, "HH:mm") : "N/A"
                            }</td> <!-- CORRECTED: Use imported format -->
                            <td>${
                              appt.end ? format(appt.end, "HH:mm") : "N/A"
                            }</td>   <!-- CORRECTED: Use imported format -->
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>

            <h4>Postponed (${reportSummary.postponed})</h4>
            <table>
                <thead><tr><th>Client</th><th>Status</th><th>Payment Type</th><th>Package</th><th>Amount</th><th>Start Time</th><th>End Time</th></tr></thead>
                <tbody>
                    ${reportDetails.postponed
                      .map(
                        (appt) => `
                        <tr class="postponed">
                            <td>${appt.clientName || "N/A"}</td>
                            <td><Clock class="h-4 w-4 inline mr-1 text-yellow-600" /> ${
                              appt.status
                            }</td>
                            <td><span class="badge-${
                              appt.paymentType
                                .toLowerCase()
                                .replace(/\s+/g, "-") || "default"
                            }">${appt.paymentType}</span></td>
                            <td>${appt.packageName || "N/A"}</td>
                            <td>$${appt.amount?.toFixed(2) || "0.00"}</td>
                            <td>${
                              appt.start ? format(appt.start, "HH:mm") : "N/A"
                            }</td> <!-- CORRECTED: Use imported format -->
                            <td>${
                              appt.end ? format(appt.end, "HH:mm") : "N/A"
                            }</td>   <!-- CORRECTED: Use imported format -->
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </body>
        </html>
      `;
    };

    const htmlContent = generateAttendanceHTML(date, summary, details); // Pass the specific values

    if (format === "html") {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `client-attendance-report-${date}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: `Report exported as HTML.`,
      });
    } else if (format === "pdf") {
      // For PDF, open the HTML in a new window and trigger print
      const printWindow = window.open("", "_blank");
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      // Optional: Add a slight delay before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close(); // Close after printing
      }, 250); // Adjust delay if needed
      toast({
        title: "Print Initiated",
        description: `PDF report opened in a new window for printing.`,
      });
    }
  };

  // Load data for the default date (today) on initial render
  useEffect(() => {
    generateAttendanceReportData(date);
  }, []);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
    generateAttendanceReportData(newDate);
  };

  const handleReloadData = () => {
    generateAttendanceReportData(date); // Reload data for the currently selected date
  };

  // --- Status Badge Component (for internal use within this page) ---
  const StatusBadge = ({ status }) => {
    let variant = "default";
    let icon = null;
    if (status === "done") {
      variant = "success"; // Assuming you have a 'success' variant for Badge
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
    } else if (status === "missed") {
      variant = "destructive";
      icon = <XCircle className="h-3 w-3 mr-1" />;
    } else if (status === "postponed") {
      variant = "secondary"; // Or another appropriate variant
      icon = <Clock className="h-3 w-3 mr-1" />;
    }
    return (
      <Badge variant={variant} className="inline-flex items-center gap-1">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // --- Payment Type Badge Component ---
  const PaymentTypeBadge = ({ type }) => {
    let variant = "default";
    if (type === "Paid") variant = "secondary"; // Example: grey for paid
    if (type === "Package") variant = "outline"; // Example: outline for package
    if (type === "Not Collected") variant = "destructive"; // Example: red for not collected
    return <Badge variant={variant}>{type}</Badge>;
  };

  return (
    <div className="w-full gradient-background min-h-screen p-2">
      <div className="container mx-auto bg-card rounded-xl shadow-lg p-4 min-h-[calc(100vh-48px)] flex flex-col">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b pb-2 gap-2"
        >
          <motion.h1 variants={itemVariants} className="text-2xl font-bold">
            Client Attendance Report
          </motion.h1>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex-grow space-y-4" // Add vertical spacing
        >
          {/* Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Report for Date</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 items-center" // Align items nicely
              >
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  {" "}
                  {/* Flexible container for date input */}
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    className="w-full sm:w-[180px]" // Responsive width
                  />
                </div>
                <Button
                  onClick={handleReloadData}
                  disabled={loading}
                  variant="secondary" // Use secondary for reload
                  className="w-full sm:w-auto" // Responsive width
                >
                  {loading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />{" "}
                      {/* Add spin animation */}
                      Reloading...
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Reload Data
                    </>
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          {reportData && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }} // Slight delay after controls
            >
              <Card>
                <CardHeader>
                  <CardTitle>Report Summary for {reportData.date}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {" "}
                    {/* Responsive grid for summary items */}
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-800">
                        {reportData.summary.total}
                      </p>
                      <p className="text-sm text-blue-600">
                        Total Appointments
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-800">
                        {reportData.summary.done}
                      </p>
                      <p className="text-sm text-green-600">Done</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-2xl font-bold text-red-800">
                        {reportData.summary.missed}
                      </p>
                      <p className="text-sm text-red-600">Missed</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-800">
                        {reportData.summary.postponed}
                      </p>
                      <p className="text-sm text-yellow-600">Postponed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Export Buttons Card */}
          {reportData && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }} // Slight delay after summary
            >
              <Card>
                <CardHeader>
                  <CardTitle>Export Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {" "}
                    {/* Allow buttons to wrap on small screens */}
                    <Button
                      onClick={() => exportAttendanceReport("html")}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export HTML
                    </Button>
                    <Button
                      onClick={() => exportAttendanceReport("pdf")}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print/PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Details Table Card */}
          {reportData && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }} // Slight delay after export buttons
            >
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* --- DONE APPOINTMENTS TABLE --- */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Done ({reportData.summary.done})
                    </h3>
                    {reportData.details.done.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Client
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Status
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Payment Type
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Package
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Amount ($)
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Start Time
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                End Time
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.details.done.map((appt) => (
                              <tr
                                key={appt.id}
                                className="bg-green-50 hover:bg-green-100"
                              >
                                {" "}
                                {/* Highlight row */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {appt.clientName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <StatusBadge status={appt.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <PaymentTypeBadge type={appt.paymentType} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.packageName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ${appt.amount?.toFixed(2) || "0.00"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.start
                                    ? format(appt.start, "HH:mm")
                                    : "N/A"}
                                </td>{" "}
                                {/* Use imported format */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.end ? format(appt.end, "HH:mm") : "N/A"}
                                </td>{" "}
                                {/* Use imported format */}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No done appointments for this date.
                      </p>
                    )}
                  </div>

                  {/* --- MISSED APPOINTMENTS TABLE --- */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      Missed ({reportData.summary.missed})
                    </h3>
                    {reportData.details.missed.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Client
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Status
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Payment Type
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Package
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Amount ($)
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Start Time
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                End Time
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.details.missed.map((appt) => (
                              <tr
                                key={appt.id}
                                className="bg-red-50 hover:bg-red-100"
                              >
                                {" "}
                                {/* Highlight row */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {appt.clientName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <StatusBadge status={appt.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <PaymentTypeBadge type={appt.paymentType} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.packageName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ${appt.amount?.toFixed(2) || "0.00"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.start
                                    ? format(appt.start, "HH:mm")
                                    : "N/A"}
                                </td>{" "}
                                {/* Use imported format */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.end ? format(appt.end, "HH:mm") : "N/A"}
                                </td>{" "}
                                {/* Use imported format */}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No missed appointments for this date.
                      </p>
                    )}
                  </div>

                  {/* --- POSTPONED APPOINTMENTS TABLE --- */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      Postponed ({reportData.summary.postponed})
                    </h3>
                    {reportData.details.postponed.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Client
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Status
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Payment Type
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Package
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Amount ($)
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Start Time
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                End Time
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.details.postponed.map((appt) => (
                              <tr
                                key={appt.id}
                                className="bg-yellow-50 hover:bg-yellow-100"
                              >
                                {" "}
                                {/* Highlight row */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {appt.clientName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <StatusBadge status={appt.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <PaymentTypeBadge type={appt.paymentType} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.packageName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ${appt.amount?.toFixed(2) || "0.00"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.start
                                    ? format(appt.start, "HH:mm")
                                    : "N/A"}
                                </td>{" "}
                                {/* Use imported format */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {appt.end ? format(appt.end, "HH:mm") : "N/A"}
                                </td>{" "}
                                {/* Use imported format */}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No postponed appointments for this date.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center h-32"
            >
              <p>Loading report data...</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// --- Wrap the content with MainLayout ---
function ClientAttendanceReportPage() {
  return (
    <MainLayout>
      <ClientAttendanceReportPageContent />
    </MainLayout>
  );
}

export default ClientAttendanceReportPage;
