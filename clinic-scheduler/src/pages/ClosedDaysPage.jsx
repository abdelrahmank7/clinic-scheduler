import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"; // Keep Button if needed for other actions
import { Input } from "@/components/ui/input"; // Keep Input if needed for other filters
import { Label } from "@/components/ui/label"; // Import Label for date inputs
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Import Dialog components if needed for detailed view
import { getDailyClosures } from "@/services/closed-day-service"; // Import the updated service function
import { format } from "date-fns"; // Import format for consistent date display
import { useToast } from "@/components/ui/use-toast"; // Import toast hook for errors
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Use Card for consistent UI
import ClosedDaysManager from "@/components/ClosedDaysManager"; // Import the updated manager

function ClosedDaysPage() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" }); // State for date filter
  const [openManager, setOpenManager] = useState(false); // State to control the manager dialog
  const { toast } = useToast(); // Use toast hook for potential errors

  const fetch = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const d = await getDailyClosures({
        start: dateFilter.start ? new Date(dateFilter.start) : undefined,
        end: dateFilter.end ? new Date(dateFilter.end) : undefined,
      });
      setDays(d);
    } catch (err) {
      // Catch potential errors from the service
      console.error("Error fetching closed days:", err);
      setError("Failed to load closed day records.");
      toast({
        title: "Load Error",
        description: "Could not retrieve closed day data. Please try again.",
        variant: "destructive",
      });
      setDays([]); // Clear list on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch on initial load and when date filter changes
    fetch();
  }, [dateFilter]); // Depend on dateFilter

  const handleRefresh = () => {
    // Reset filters to see the latest
    setDateFilter({ start: "", end: "" });
    // fetch() is already called when dateFilter changes
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Closed Days & Revenue</h2>
        <div className="flex gap-2">
          {/* Button to open the updated manager dialog */}
          <Button onClick={() => setOpenManager(true)}>
            Close Current Day
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        View and manage days when the clinic closed for the day, along with
        recorded revenue.
      </p>

      {/* Date Filter Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Filter Closed Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="filter-start">From Date</Label>
              <Input
                id="filter-start"
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-end">To Date</Label>
              <Input
                id="filter-end"
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
              />
            </div>
            <Button onClick={fetch} variant="outline">
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Closed Days List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Closed Day Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-4 text-center">Loading closed day records...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : days.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No closed day records found for the selected period.
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="max-h-96 overflow-y-auto">
                {" "}
                {/* Add scroll if list gets long */}
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    {" "}
                    {/* Sticky header */}
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Expected ($)</th>
                      <th className="p-2 text-left">Collected ($)</th>
                      <th className="p-2 text-left">Difference ($)</th>
                      <th className="p-2 text-left">Notes</th>
                      {/* Add more columns if needed, e.g., closedAt, closedBy */}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d) => {
                      const difference = d.confirmedRevenue - d.expectedRevenue;
                      return (
                        <tr key={d.id} className="border-t hover:bg-muted/50">
                          <td className="p-2">
                            {format(d.date, "MMM dd, yyyy")}
                          </td>
                          <td className="p-2 font-medium">
                            ${d.expectedRevenue.toFixed(2)}
                          </td>
                          <td className="p-2 font-medium">
                            ${d.confirmedRevenue.toFixed(2)}
                          </td>
                          <td
                            className={`p-2 font-medium ${
                              difference >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${difference.toFixed(2)}
                          </td>
                          <td className="p-2 max-w-xs truncate">
                            {d.notes || "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Closing the Day - Uses the updated ClosedDaysManager */}
      <ClosedDaysManager
        open={openManager}
        onOpenChange={setOpenManager}
        onRefresh={handleRefresh} // Pass the refresh handler
      />
    </div>
  );
}

export default ClosedDaysPage;
