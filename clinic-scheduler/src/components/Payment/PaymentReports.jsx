// src/components/Payment/PaymentReports.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useClinic } from "@/contexts/ClinicContext";
import { toast } from "@/components/hooks/use-toast";

const formatCurrency = (v) =>
  v == null || isNaN(v)
    ? "$0.00"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD" });

const PaymentReports = () => {
  const [payments, setPayments] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [isOpen, setIsOpen] = useState(false);
  const [revenueSharing, setRevenueSharing] = useState({
    clinicPercentage: 60,
    physicianPercentage: 40,
  });
  const { selectedLocations } = useClinic();

  useEffect(() => {
    if (!isOpen) return;

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    // Fetch revenue sharing settings
    const fetchRevenueSharing = async () => {
      try {
        const revenueDoc = doc(db, "settings", "revenue_sharing");
        const docSnap = await getDoc(revenueDoc);
        if (docSnap.exists()) {
          setRevenueSharing(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching revenue sharing settings:", error);
      }
    };

    fetchRevenueSharing();

    // Build query with location filtering if locations are selected
    let paymentsQuery = query(
      collection(db, "payments"),
      where("sessionDate", ">=", startDate),
      where("sessionDate", "<=", endDate),
      orderBy("sessionDate", "asc")
    );

    if (selectedLocations.length > 0) {
      paymentsQuery = query(
        collection(db, "payments"),
        where("location", "in", selectedLocations),
        where("sessionDate", ">=", startDate),
        where("sessionDate", "<=", endDate),
        orderBy("sessionDate", "asc")
      );
    }

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (querySnapshot) => {
        const paymentsData = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt.toDate(),
          sessionDate: d.data().sessionDate.toDate(),
        }));
        setPayments(paymentsData);
      },
      (err) => {
        console.error("Error fetching payments for report: ", err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, dateRange, selectedLocations]);

  const totalRevenue = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );
  const clinicRevenue =
    totalRevenue * (revenueSharing.clinicPercentage / 100 || 0);
  const physicianRevenue =
    totalRevenue * (revenueSharing.physicianPercentage / 100 || 0);

  const revenueByMethod = payments.reduce((acc, payment) => {
    acc[payment.paymentMethod] =
      (acc[payment.paymentMethod] || 0) + (Number(payment.amount) || 0);
    return acc;
  }, {});

  const revenueByClient = payments.reduce((acc, payment) => {
    acc[payment.clientName] =
      (acc[payment.clientName] || 0) + (Number(payment.amount) || 0);
    return acc;
  }, {});

  const quickDateRanges = {
    Today: {
      start: format(new Date(), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd"),
    },
    "Last 7 Days": {
      start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd"),
    },
    "This Month": {
      start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
    "Last Month": {
      start: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      end: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    },
  };

  const applyQuickRange = (rangeKey) => {
    setDateRange(quickDateRanges[rangeKey]);
  };

  const generateHTMLReport = () => {
    const reportDate = format(new Date(), "MMMM dd, yyyy");
    const reportRange = `${format(
      new Date(dateRange.start),
      "MMM dd, yyyy"
    )} - ${format(new Date(dateRange.end), "MMM dd, yyyy")}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Report - ${reportDate}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .summary { 
            margin-bottom: 30px; 
          }
          
          .section { 
            margin-bottom: 30px; 
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            font-size: 14px;
          }
          
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          
          th { 
            background-color: #f9fafb; 
            font-weight: 600;
          }
          
          .total-row { 
            font-weight: bold; 
          }
          
          .revenue-split { 
            display: flex; 
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 30px; 
          }
          
          .revenue-box { 
            border: 1px solid #ddd; 
            padding: 20px; 
            flex: 1;
            min-width: 250px;
            border-radius: 8px;
          }
          
          .revenue-box h3 {
            margin-top: 0;
            color: #374151;
          }
          
          /* Print styles */
          @media print {
            body {
              font-size: 12px;
              margin: 10px;
            }
            
            .no-print {
              display: none !important;
            }
            
            table {
              font-size: 11px;
            }
            
            th, td {
              padding: 6px 4px;
            }
            
            .revenue-box {
              padding: 10px;
              page-break-inside: avoid;
            }
          }
          
          /* Mobile styles */
          @media (max-width: 768px) {
            body {
              margin: 10px;
              font-size: 13px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .revenue-split {
              flex-direction: column;
              gap: 15px;
            }
            
            .revenue-box {
              min-width: auto;
              padding: 15px;
            }
            
            table {
              font-size: 12px;
            }
            
            th, td {
              padding: 8px 6px;
            }
            
            .section h2 {
              font-size: 18px;
            }
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #1f2937;
              color: #f9fafb;
            }
            
            th {
              background-color: #374151;
            }
            
            .revenue-box {
              border-color: #4b5563;
            }
            
            table, th, td {
              border-color: #4b5563;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Report</h1>
          <p>Generated on: ${reportDate}</p>
          <p>Date Range: ${reportRange}</p>
        </div>
        
        <div class="summary">
          <h2>Financial Summary</h2>
          <div class="revenue-split">
            <div class="revenue-box">
              <h3>Clinic Revenue</h3>
              <p style="font-size: 24px; font-weight: bold; color: #10b981;">
                $${clinicRevenue.toFixed(2)}
              </p>
              <p>${revenueSharing.clinicPercentage}% of total</p>
            </div>
            <div class="revenue-box">
              <h3>Physician Revenue</h3>
              <p style="font-size: 24px; font-weight: bold; color: #3b82f6;">
                $${physicianRevenue.toFixed(2)}
              </p>
              <p>${revenueSharing.physicianPercentage}% of total</p>
            </div>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">Total Revenue</h3>
            <p style="font-size: 28px; font-weight: bold; color: #8b5cf6; margin: 0;">
              $${totalRevenue.toFixed(2)}
            </p>
            <p style="margin: 5px 0 0 0;">From ${payments.length} payments</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Revenue by Payment Method</h2>
          <table>
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(revenueByMethod)
                .map(([method, amount]) => {
                  const pct = totalRevenue
                    ? ((amount / totalRevenue) * 100).toFixed(1)
                    : "0.0";
                  return `
                <tr>
                  <td>${method.charAt(0).toUpperCase() + method.slice(1)}</td>
                  <td>$${amount.toFixed(2)}</td>
                  <td>${pct}%</td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Top Clients by Revenue</h2>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(revenueByClient)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10) // Top 10 clients
                .map(([client, amount]) => {
                  const pct = totalRevenue
                    ? ((amount / totalRevenue) * 100).toFixed(1)
                    : "0.0";
                  return `
                  <tr>
                    <td>${client}</td>
                    <td>$${amount.toFixed(2)}</td>
                    <td>${pct}%</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Payment Details</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Session Date</th>
              </tr>
            </thead>
            <tbody>
              ${payments
                .map(
                  (payment) => `
                <tr>
                  <td>${format(payment.createdAt, "MMM dd, yyyy")}</td>
                  <td>${payment.clientName}</td>
                  <td>$${(Number(payment.amount) || 0).toFixed(2)}</td>
                  <td>${
                    payment.paymentMethod
                      ? payment.paymentMethod.charAt(0).toUpperCase() +
                        payment.paymentMethod.slice(1)
                      : ""
                  }</td>
                  <td>${format(payment.sessionDate, "MMM dd, yyyy")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;" class="no-print">
          <p>Generated by Clinic Management System</p>
          <p>This report contains confidential financial information</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  const exportToHTML = () => {
    const htmlContent = generateHTMLReport();
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-report-${dateRange.start}-to-${dateRange.end}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const printHTMLReport = () => {
    const htmlContent = generateHTMLReport();
    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 sm:h-9">
          Payment Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Payment Reports
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location filter status */}
          <div className="bg-yellow-50 rounded-md p-4">
            <p className="text-yellow-800">
              {selectedLocations.length === 0
                ? "Currently showing reports for all locations. Select specific locations to filter the data."
                : `Showing reports for selected locations: ${selectedLocations.join(
                    ", "
                  )}`}
            </p>
          </div>
          {/* Responsive date range inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                type="date"
                id="start-date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                type="date"
                id="end-date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Responsive quick date buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(quickDateRanges).map((range) => (
              <Button
                key={range}
                variant="outline"
                size="sm"
                onClick={() => applyQuickRange(range)}
                className="h-10 px-3 text-sm"
              >
                {range}
              </Button>
            ))}
          </div>

          {/* Responsive revenue cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {payments.length} payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Clinic Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {formatCurrency(clinicRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenueSharing.clinicPercentage}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Physician Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {formatCurrency(physicianRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenueSharing.physicianPercentage}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Responsive action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Button onClick={exportToHTML} className="h-12 sm:h-9">
              Export to HTML
            </Button>
            <Button
              onClick={printHTMLReport}
              variant="outline"
              className="h-12 sm:h-9"
            >
              Print Report
            </Button>
          </div>

          {/* Responsive payment details table */}
          <div className="border rounded-md">
            <div className="p-3 sm:p-4 font-semibold bg-muted text-sm sm:text-base">
              Payment Details
            </div>
            <div className="max-h-80 overflow-y-auto">
              {payments.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No payments found in the selected date range
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 sm:p-3 text-left">Date</th>
                      <th className="p-2 sm:p-3 text-left">Client</th>
                      <th className="p-2 sm:p-3 text-left">Amount</th>
                      <th className="p-2 sm:p-3 text-left">Method</th>
                      <th className="p-2 sm:p-3 text-left">Session Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-t hover:bg-muted/50"
                      >
                        <td className="p-2 sm:p-3">
                          {format(payment.createdAt, "MMM dd, yyyy")}
                        </td>
                        <td className="p-2 sm:p-3 truncate max-w-[80px] sm:max-w-none">
                          {payment.clientName}
                        </td>
                        <td className="p-2 sm:p-3">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="p-2 sm:p-3 capitalize">
                          {payment.paymentMethod}
                        </td>
                        <td className="p-2 sm:p-3">
                          {format(payment.sessionDate, "MMM dd, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReports;
