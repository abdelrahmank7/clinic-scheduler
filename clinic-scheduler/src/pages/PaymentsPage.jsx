// src/pages/PaymentsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
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
import {
  AlertTriangle,
  Edit3,
  DollarSign,
  Save,
  X,
  ArrowLeft,
  Home,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

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
  const [activeTab, setActiveTab] = useState("payments");
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Get clinic context for locations
  const { selectedLocations, loading: clinicContextLoading } = useClinic();

  useEffect(() => {
    setLoading(true);

    // Build base query for payments - Filter by location
    let paymentsQuery = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc")
    );

    // Add location filter if specific locations are selected
    if (selectedLocations.length > 0) {
      // Use 'in' query for multiple locations
      // selectedLocations is an array of strings like ['Cairo', 'Alexandria']
      paymentsQuery = query(
        paymentsQuery,
        where("location", "in", selectedLocations)
      );
    }
    // If selectedLocations is empty, the query fetches all locations for the clinic

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (querySnapshot) => {
        const paymentsData = querySnapshot.docs.map((d) => {
          const data = d.data();
          const createdAtRaw = data.createdAt;
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
  }, [selectedLocations]); // Only depend on selectedLocations

  // --- Filtering Logic (remains mostly the same, applied to the fetched data) ---
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
          (payment.paymentMethod &&
            payment.paymentMethod.toLowerCase().includes(term)) ||
          (payment.packageName &&
            payment.packageName.toLowerCase().includes(term))
      );
    }

    setFilteredPayments(result);
  }, [payments, filter, dateRange, searchTerm]);

  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );
  }, [filteredPayments]);

  const paymentMethods = useMemo(() => {
    return filteredPayments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1;
      return acc;
    }, {});
  }, [filteredPayments]);

  // Handle payment editing
  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount != null ? payment.amount.toString() : "");
    setEditStatus(payment.paymentStatus || "unpaid");
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid, non-negative amount.",
        variant: "destructive",
      });
      return;
    }

    setEditLoading(true);

    try {
      // Show warning for paid payments
      if (editingPayment.paymentStatus === "paid" && editStatus !== "paid") {
        if (
          !window.confirm(
            "This payment was previously marked as PAID. Are you sure you want to change this status? Please ensure you have refunded the money to the client."
          )
        ) {
          setEditLoading(false);
          return;
        }
      }

      // Update payment record
      const paymentRef = doc(db, "payments", editingPayment.id);
      await updateDoc(paymentRef, {
        amount: newAmount,
        paymentStatus: editStatus,
        lastModified: Timestamp.now(),
        modifiedBy: "user", // You might want to get actual user
      });

      // Update related appointment if needed
      if (editingPayment.appointmentId) {
        const appointmentRef = doc(
          db,
          "appointments",
          editingPayment.appointmentId
        );
        await updateDoc(appointmentRef, {
          amount: newAmount,
          paymentStatus: editStatus,
          lastPaymentUpdate: Timestamp.now(),
        });
      }

      toast({
        title: "Payment Updated",
        description: "Payment information has been updated successfully.",
      });

      setEditingPayment(null);
      setEditAmount("");
      setEditStatus("");
    } catch (err) {
      console.error("Error updating payment:", err);
      toast({
        title: "Update Failed",
        description: "Failed to update payment information.",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
    setEditAmount("");
    setEditStatus("");
  };

  if (clinicContextLoading || loading) {
    // Use clinicContextLoading as well
    return <div className="p-6">Loading payments...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments Management</h1>
      </div>

      {/* Remove the 'No Clinic Selected' check */}
      {/* {!SINGLE_CLINIC_ID ? ( ... ) : ( ... )} -> Just render the content */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                    <div key={method} className="flex justify-between text-sm">
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

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All payments recorded in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table className="text-xs sm:text-sm">
                    <TableHeader className="sticky top-0 bg-muted z-10">
                      <TableRow>
                        <TableHead className="p-2 sm:p-3">Date</TableHead>
                        <TableHead className="p-2 sm:p-3">Client</TableHead>
                        <TableHead className="p-2 sm:p-3">Amount</TableHead>
                        <TableHead className="p-2 sm:p-3">Method</TableHead>
                        <TableHead className="p-2 sm:p-3">Status</TableHead>
                        <TableHead className="p-2 sm:p-3">
                          Session Date
                        </TableHead>
                        <TableHead className="p-2 sm:p-3">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
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
                              {format(payment.createdAt, "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="p-2 sm:p-3 truncate max-w-[80px] sm:max-w-none">
                              {payment.clientName}
                            </TableCell>
                            <TableCell className="p-2 sm:p-3">
                              {editingPayment?.id === payment.id ? (
                                <Input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) =>
                                    setEditAmount(e.target.value)
                                  }
                                  className="w-20 text-xs"
                                  step="0.01"
                                />
                              ) : (
                                formatCurrency(payment.amount)
                              )}
                            </TableCell>
                            <TableCell className="p-2 sm:p-3 capitalize">
                              {payment.paymentMethod}
                            </TableCell>
                            <TableCell className="p-2 sm:p-3">
                              {editingPayment?.id === payment.id ? (
                                <Select
                                  value={editStatus}
                                  onValueChange={setEditStatus}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">
                                      Unpaid
                                    </SelectItem>
                                    <SelectItem value="partial">
                                      Partial
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <PaymentStatusBadge
                                  status={payment.paymentStatus}
                                  amount={payment.amount}
                                />
                              )}
                            </TableCell>
                            <TableCell className="p-2 sm:p-3">
                              {format(payment.sessionDate, "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="p-2 sm:p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditPayment(payment)}
                                  className="h-8 w-8 p-0"
                                  title="Edit Payment"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
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

          {/* Edit Payment Dialog */}
          {editingPayment && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Edit Payment
                </CardTitle>
                <CardDescription>
                  {editingPayment.paymentStatus === "paid" && (
                    <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-md mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        This payment was previously marked as PAID. Please
                        ensure you have refunded the money to the client before
                        changing this status.
                      </span>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm">
                      Client: {editingPayment.clientName}
                    </Label>
                  </div>
                  <div>
                    <Label className="text-sm">
                      Original Status: {editingPayment.paymentStatus}
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="edit-amount">Amount ($)</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger id="edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <PaymentReportGenerator
            payments={payments}
            revenueSharing={{ clinicPercentage: 60, physicianPercentage: 40 }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsPage;
