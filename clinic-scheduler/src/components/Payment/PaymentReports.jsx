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
  const { selectedClinic } = useClinic();

  useEffect(() => {
    if (!isOpen || !selectedClinic) return;

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    // Fetch revenue sharing settings
    const fetchRevenueSharing = async () => {
      try {
        const revenueDoc = doc(db, "settings", `revenue_${selectedClinic}`);
        const docSnap = await getDoc(revenueDoc);
        if (docSnap.exists()) {
          setRevenueSharing(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching revenue sharing settings:", error);
      }
    };

    fetchRevenueSharing();

    const paymentsQuery = query(
      collection(db, "payments"),
      where("clinicId", "==", selectedClinic),
      where("sessionDate", ">=", startDate),
      where("sessionDate", "<=", endDate),
      orderBy("sessionDate", "asc")
    );

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
  }, [isOpen, dateRange, selectedClinic]);

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
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-row { font-weight: bold; }
          .revenue-split { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .revenue-box { border: 1px solid #ddd; padding: 15px; width: 48%; }
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
              <p>$${clinicRevenue.toFixed(2)} (${
      revenueSharing.clinicPercentage
    }%)</p>
            </div>
            <div class="revenue-box">
              <h3>Physician Revenue</h3>
              <p>$${physicianRevenue.toFixed(2)} (${
      revenueSharing.physicianPercentage
    }%)</p>
            </div>
          </div>
          <p><strong>Total Revenue: $${totalRevenue.toFixed(2)}</strong></p>
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
          <h2>Revenue by Client</h2>
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
        <Button variant="outline">Payment Reports</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Reports</DialogTitle>
        </DialogHeader>

        {!selectedClinic ? (
          <div className="p-4 bg-yellow-50 rounded-md">
            <p className="text-yellow-800">
              Please select a clinic first to view reports.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  type="date"
                  id="start-date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
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
                />
              </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {Object.keys(quickDateRanges).map((range) => (
                <Button
                  key={range}
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
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
                  <div className="text-2xl font-bold">
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
                  <div className="text-2xl font-bold">
                    {formatCurrency(physicianRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {revenueSharing.physicianPercentage}% of total
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2 mb-4">
              <Button onClick={exportToHTML}>Export to HTML</Button>
              <Button onClick={printHTMLReport} variant="outline">
                Print Report
              </Button>
            </div>

            <div className="border rounded-md">
              <div className="p-4 font-semibold bg-muted">Payment Details</div>
              <div className="max-h-60 overflow-y-auto">
                {payments.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No payments found in the selected date range
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Client</th>
                        <th className="p-2 text-left">Amount</th>
                        <th className="p-2 text-left">Method</th>
                        <th className="p-2 text-left">Session Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="p-2">
                            {format(payment.createdAt, "MMM dd, yyyy")}
                          </td>
                          <td className="p-2">{payment.clientName}</td>
                          <td className="p-2">${payment.amount.toFixed(2)}</td>
                          <td className="p-2 capitalize">
                            {payment.paymentMethod}
                          </td>
                          <td className="p-2">
                            {format(payment.sessionDate, "MMM dd, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReports;
