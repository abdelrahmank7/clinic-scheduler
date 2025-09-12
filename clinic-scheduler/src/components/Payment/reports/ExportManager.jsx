// src/components/Payment/reports/ExportManager.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ReportService } from "@/services/report-service";
import { useToast } from "@/components/ui/use-toast";

const ExportManager = ({
  payments = [],
  revenueSharing = { clinicPercentage: 60, physicianPercentage: 40 },
  clinicName = "Clinic",
}) => {
  const [exportFormat, setExportFormat] = useState("html");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const applyQuickRange = (rangeKey) => {
    setDateRange(quickDateRanges[rangeKey]);
  };

  const filteredPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.sessionDate);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    return paymentDate >= startDate && paymentDate <= endDate;
  });

  const exportReport = async () => {
    setLoading(true);

    try {
      const reportData = ReportService.generatePaymentReportData(
        filteredPayments,
        revenueSharing
      );

      const reportDate = format(new Date(), "MMMM dd, yyyy");
      const reportRange = `${format(
        new Date(dateRange.start),
        "MMM dd, yyyy"
      )} - ${format(new Date(dateRange.end), "MMM dd, yyyy")}`;

      const fullReportData = {
        ...reportData,
        reportDate,
        reportRange,
        revenueSharing,
        payments: filteredPayments,
        clinicName,
      };

      switch (exportFormat) {
        case "html":
          exportToHTML(fullReportData);
          break;
        case "pdf":
          exportToPDF(fullReportData);
          break;
        case "excel":
          exportToExcel(fullReportData);
          break;
        default:
          exportToHTML(fullReportData);
      }

      toast({
        title: "Export Successful",
        description: `Report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the report.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToHTML = (reportData) => {
    const htmlContent = ReportService.generateHTMLReport(reportData);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-report-${dateRange.start}-to-${dateRange.end}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToPDF = (reportData) => {
    // For now, we'll generate HTML and let browser handle PDF
    // In production, you might want to use a library like jsPDF
    const htmlContent = ReportService.generateHTMLReport(reportData);
    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportToExcel = (reportData) => {
    // Simple CSV export for now
    let csvContent = "Date,Client,Amount,Method,Session Date\n";

    reportData.payments.forEach((payment) => {
      csvContent += `${format(new Date(payment.createdAt), "yyyy-MM-dd")},`;
      csvContent += `"${payment.clientName}",`;
      csvContent += `${payment.amount},`;
      csvContent += `"${payment.paymentMethod}",`;
      csvContent += `${format(new Date(payment.sessionDate), "yyyy-MM-dd")}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-report-${dateRange.start}-to-${dateRange.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const printReport = () => {
    const reportData = ReportService.generatePaymentReportData(
      filteredPayments,
      revenueSharing
    );
    const reportDate = format(new Date(), "MMMM dd, yyyy");
    const reportRange = `${format(
      new Date(dateRange.start),
      "MMM dd, yyyy"
    )} - ${format(new Date(dateRange.end), "MMM dd, yyyy")}`;

    const fullReportData = {
      ...reportData,
      reportDate,
      reportRange,
      revenueSharing,
      payments: filteredPayments,
      clinicName,
    };

    const htmlContent = ReportService.generateHTMLReport(fullReportData);
    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger id="export-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    HTML
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (CSV)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(quickDateRanges).map((range) => (
                <Button
                  key={range}
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickRange(range)}
                  className="h-8 text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={exportReport}
            disabled={loading || filteredPayments.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {loading ? "Exporting..." : `Export ${exportFormat.toUpperCase()}`}
          </Button>

          <Button
            variant="outline"
            onClick={printReport}
            disabled={filteredPayments.length === 0}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Selected period: {filteredPayments.length} payments</p>
          <p>
            Total amount: $
            {filteredPayments
              .reduce((sum, p) => sum + (p.amount || 0), 0)
              .toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportManager;
