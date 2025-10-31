// src/pages/PaymentsPage.jsx

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentStatusBadge from "@/components/Payment/PaymentStatusBadge";
import PaymentReportGenerator from "@/components/Payment/reports/PaymentReportGenerator";
import { format } from "date-fns";
import { useClinic } from "@/contexts/ClinicContext";

const formatCurrency = (value) =>
  value == null || isNaN(value)
    ? "$0.00"
    : value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM-dd"
    ),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedClinic } = useClinic();

  useEffect(() => {
    if (!selectedClinic) {
      setPayments([]);
      setFilteredPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const paymentsQuery = query(
      collection(db, "payments"),
      where("clinicId", "==", selectedClinic),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (querySnapshot) => {
        const paymentsData = querySnapshot.docs.map((d) => {
          const data = d.data();
          const createdAtRaw = data.createdAt;
          // parenthesize the nullish coalescing when mixing with || to satisfy the parser
          const sessionDateRaw = (data.sessionDate ?? data.session) || null;

          const createdAt =
            createdAtRaw instanceof Timestamp
              ? createdAtRaw.toDate()
              : createdAtRaw
              ? new Date(createdAtRaw)
              : new Date();

          const sessionDate =
            sessionDateRaw instanceof Timestamp
              ? sessionDateRaw.toDate()
              : sessionDateRaw
              ? new Date(sessionDateRaw)
              : new Date();

          return {
            id: d.id,
            ...data,
            createdAt,
            sessionDate,
          };
        });
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching payments: ", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedClinic]);

  useEffect(() => {
    let result = payments;

    // Apply status filter
    if (filter !== "all") {
      result = result.filter((payment) => {
        if (filter === "package") return payment.isPackage;
        return payment.paymentStatus === filter;
      });
    }

    // Apply date filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of the day

      result = result.filter((payment) => {
        const paymentDate = payment.sessionDate;
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (payment) =>
          payment.clientName.toLowerCase().includes(term) ||
          payment.paymentMethod.toLowerCase().includes(term)
      );
    }

    setFilteredPayments(result);
  }, [payments, filter, dateRange, searchTerm]);

  const totalRevenue = filteredPayments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );

  const paymentMethods = filteredPayments.reduce((acc, payment) => {
    acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <div className="p-6">Loading payments...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments Management</h1>
      </div>

      {!selectedClinic ? (
        <div className="p-4 bg-yellow-50 rounded-md">
          <p className="text-yellow-800">
            Please select a clinic first to view payments.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    From {filteredPayments.length} payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Object.entries(paymentMethods).map(([method, count]) => (
                      <div
                        key={method}
                        className="flex justify-between text-sm"
                      >
                        <span className="capitalize">{method}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger id="status-filter">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="package">Packages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search by client or method"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
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
                    <div className="space-y-1">
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
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  All payments recorded in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <div className="max-h-96 overflow-y-auto">
                    <Table className="text-xs sm:text-sm">
                      <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                          <TableHead className="p-2 sm:p-3">Date</TableHead>
                          <TableHead className="p-2 sm:p-3">Client</TableHead>
                          <TableHead className="p-2 sm:p-3">Amount</TableHead>
                          <TableHead className="p-2 sm:p-3">Method</TableHead>
                          <TableHead className="p-2 sm:p-3">Status</TableHead>
                          <TableHead className="p-2 sm:p-3">
                            Session Date
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-4 text-muted-foreground"
                            >
                              No payments found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPayments.map((payment) => (
                            <TableRow
                              key={payment.id}
                              className="border-t hover:bg-muted/50"
                            >
                              <TableCell className="p-2 sm:p-3">
                                {format(
                                  payment.createdAt,
                                  "MMM dd, yyyy HH:mm"
                                )}
                              </TableCell>
                              <TableCell className="p-2 sm:p-3 truncate max-w-[80px] sm:max-w-none">
                                {payment.clientName}
                              </TableCell>
                              <TableCell className="p-2 sm:p-3">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell className="p-2 sm:p-3 capitalize">
                                {payment.paymentMethod}
                              </TableCell>
                              <TableCell className="p-2 sm:p-3">
                                <PaymentStatusBadge
                                  status={payment.paymentStatus}
                                  amount={payment.amount}
                                />
                              </TableCell>
                              <TableCell className="p-2 sm:p-3">
                                {format(payment.sessionDate, "MMM dd, yyyy")}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PaymentReportGenerator
              payments={payments}
              revenueSharing={{ clinicPercentage: 60, physicianPercentage: 40 }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PaymentsPage;
