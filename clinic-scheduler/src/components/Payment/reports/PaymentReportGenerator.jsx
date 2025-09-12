// src/components/Payment/reports/PaymentReportGenerator.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Download, Calendar, TrendingUp, Users } from "lucide-react";
import { ReportService } from "@/services/report-service";
import ExportManager from "./ExportManager";

const PaymentReportGenerator = ({
  payments = [],
  revenueSharing = { clinicPercentage: 60, physicianPercentage: 40 },
  clinicName = "Clinic",
}) => {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const [reportType, setReportType] = useState("summary");
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [reportData, setReportData] = useState({});

  const quickDateRanges = {
    "This Month": {
      start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
    "Last Month": {
      start: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      end: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    },
    "Last 30 Days": {
      start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd"),
    },
    "Last 90 Days": {
      start: format(subDays(new Date(), 90), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd"),
    },
  };

  useEffect(() => {
    const filtered = payments.filter((payment) => {
      const paymentDate = new Date(payment.sessionDate);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      return paymentDate >= startDate && paymentDate <= endDate;
    });

    setFilteredPayments(filtered);

    // Generate report data
    const data = ReportService.generatePaymentReportData(
      filtered,
      revenueSharing
    );
    setReportData(data);
  }, [payments, dateRange, revenueSharing]);

  const applyQuickRange = (rangeKey) => {
    setDateRange(quickDateRanges[rangeKey]);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const methodData = Object.entries(reportData.revenueByMethod || {}).map(
    ([method, amount]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: amount,
    })
  );

  const clientData = Object.entries(reportData.revenueByClient || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([client, amount]) => ({
      name: client,
      value: amount,
    }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Payment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Revenue
                    </p>
                    <p className="text-xl font-bold">
                      ${reportData.totalRevenue?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Payments
                    </p>
                    <p className="text-xl font-bold">
                      {filteredPayments.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Avg. Payment
                    </p>
                    <p className="text-xl font-bold">
                      {filteredPayments.length > 0
                        ? `$${(
                            reportData.totalRevenue / filteredPayments.length
                          ).toFixed(2)}`
                        : "$0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Users className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Clients
                    </p>
                    <p className="text-xl font-bold">
                      {Object.keys(reportData.revenueByClient || {}).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          `$${value.toFixed(2)}`,
                          "Amount",
                        ]}
                      />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {clientData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `$${value.toFixed(2)}`,
                          "Amount",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(
                                new Date(payment.createdAt),
                                "MMM dd, yyyy"
                              )}
                            </TableCell>
                            <TableCell>{payment.clientName}</TableCell>
                            <TableCell className="font-medium">
                              ${payment.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {payment.paymentMethod}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.paymentStatus === "paid"
                                    ? "default"
                                    : payment.paymentStatus === "partial"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {payment.paymentStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredPayments.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground"
                            >
                              No payments found for the selected date range
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <ExportManager
        payments={payments}
        revenueSharing={revenueSharing}
        clinicName={clinicName}
      />
    </div>
  );
};

export default PaymentReportGenerator;
