// clinic-scheduler/src/components/ClosedDaysManager.jsx
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { db } from "../firebase"; // Ensure db import is present
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore"; // Firestore imports
import {
  recordDailyClosure,
  getDailyClosures,
} from "@/services/closed-day-service"; // Import new service functions
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea for notes
import { useToast } from "@/components/ui/use-toast"; // Import toast hook

// Define the date range for "today" in a way Firestore can query
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Function to calculate expected revenue for a given date range
const calculateExpectedRevenue = async (dateStart, dateEnd) => {
  // Query for appointments within the date range
  const q = query(
    collection(db, "appointments"),
    where("start", ">=", dateStart),
    where("start", "<=", dateEnd),
    where("paymentStatus", "==", "paid") // Only consider appointments marked as paid
    // Add location filter here if needed, similar to other components
    // where("location", "in", selectedLocations)
  );

  try {
    const querySnapshot = await getDocs(q);
    let totalExpected = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Add the amount of each paid appointment to the total
      // Ensure amount is a number
      totalExpected += Number(data.amount) || 0;
    });

    return totalExpected;
  } catch (error) {
    console.error("Error calculating expected revenue:", error);
    throw error; // Re-throw to handle in the calling function
  }
};

function ClosedDaysManager({ open, onOpenChange, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [closedDaysList, setClosedDaysList] = useState([]);
  const [expectedRevenue, setExpectedRevenue] = useState(0);
  const [confirmedRevenue, setConfirmedRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculatedToday, setHasCalculatedToday] = useState(false);
  const { toast } = useToast();

  const fetchClosedDays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = await getDailyClosures({
        start: dateFilter.start ? new Date(dateFilter.start) : undefined,
        end: dateFilter.end ? new Date(dateFilter.end) : undefined,
      });
      setClosedDaysList(days);
    } catch (err) {
      console.error("Failed to fetch closed days:", err);
      setError("Failed to load closed day records.");
      setClosedDaysList([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter.start, dateFilter.end]);

  React.useEffect(() => {
    if (open) {
      fetchClosedDays();
      // Reset state when dialog opens
      setExpectedRevenue(0);
      setConfirmedRevenue("");
      setNotes("");
      setHasCalculatedToday(false);
    }
  }, [open, fetchClosedDays]);

  const handleCalculateExpected = async () => {
    setIsCalculating(true);
    setError(null);
    const { start, end } = getTodayRange();

    try {
      const revenue = await calculateExpectedRevenue(start, end);
      setExpectedRevenue(revenue);
      // Pre-fill confirmed amount with expected amount
      setConfirmedRevenue(revenue.toFixed(2));
      setHasCalculatedToday(true);
      toast({
        title: "Calculation Complete",
        description: `Expected revenue for today calculated as $${revenue.toFixed(
          2
        )}.`,
      });
    } catch (err) {
      console.error("Error calculating expected revenue:", err);
      setError("Failed to calculate expected revenue for today.");
      toast({
        title: "Calculation Error",
        description:
          "Could not calculate expected revenue. Please check console.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCloseDay = async () => {
    if (!hasCalculatedToday) {
      toast({
        title: "Action Required",
        description: "Please calculate the expected revenue first.",
        variant: "destructive",
      });
      return;
    }

    const confirmedAmount = parseFloat(confirmedRevenue);
    if (isNaN(confirmedAmount) || confirmedAmount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid, non-negative confirmed amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date(); // Use today's date for the closure record
      const result = await recordDailyClosure(
        today,
        expectedRevenue,
        confirmedAmount,
        notes
      );

      if (result.success) {
        toast({
          title: "Day Closed Successfully",
          description: `Recorded $${confirmedAmount.toFixed(
            2
          )} for ${today.toDateString()}.`,
        });
        onOpenChange(false); // Close the dialog after successful closure
        onRefresh?.(); // Trigger any parent refresh if needed
        // Optionally, refetch the list to show the new entry
        fetchClosedDays();
      } else {
        throw new Error(result.error || "Unknown error during closure.");
      }
    } catch (err) {
      console.error("Error closing day:", err);
      setError("Failed to record the day's closure.");
      toast({
        title: "Closure Error",
        description: err.message || "An error occurred while closing the day.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {" "}
        {/* Increased width and added scroll */}
        <DialogHeader>
          <DialogTitle>Close Day & Record Revenue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Calculate Expected Revenue Section */}
          <div className="p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">
              Step 1: Calculate Expected Revenue
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              This calculates the total amount expected from paid appointments
              scheduled for <strong>today</strong>.
            </p>
            <Button
              onClick={handleCalculateExpected}
              disabled={isCalculating || hasCalculatedToday}
              variant="outline"
            >
              {isCalculating
                ? "Calculating..."
                : hasCalculatedToday
                ? "Calculated for Today"
                : "Calculate Expected for Today"}
            </Button>
            {hasCalculatedToday && (
              <div className="mt-3">
                <p className="text-sm">
                  <span className="font-medium">Expected Revenue:</span>{" "}
                  <span className="font-semibold">
                    ${expectedRevenue.toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Revenue and Notes Section */}
          {hasCalculatedToday && (
            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">
                Step 2: Confirm Actual Revenue & Close Day
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Enter the actual amount collected today. Notes are optional.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="confirmed-amount">
                    Confirmed Amount Collected ($)
                  </Label>
                  <Input
                    id="confirmed-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={confirmedRevenue}
                    onChange={(e) => setConfirmedRevenue(e.target.value)}
                    placeholder={`e.g., ${expectedRevenue.toFixed(2)}`}
                  />
                </div>
                <div>
                  <Label htmlFor="closure-notes">Notes (Optional)</Label>
                  <Textarea
                    id="closure-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about today's closure..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCloseDay}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Recording Closure..." : "Confirm & Close Day"}
                </Button>
              </div>
            </div>
          )}

          {/* Date Filter for History */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Closed Day History</h3>
            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <Label htmlFor="history-start">From Date</Label>
                <Input
                  type="date"
                  id="history-start"
                  value={dateFilter.start}
                  onChange={(e) =>
                    setDateFilter((f) => ({ ...f, start: e.target.value }))
                  }
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="history-end">To Date</Label>
                <Input
                  type="date"
                  id="history-end"
                  value={dateFilter.end}
                  onChange={(e) =>
                    setDateFilter((f) => ({ ...f, end: e.target.value }))
                  }
                />
              </div>
              <Button
                className="self-end"
                onClick={fetchClosedDays}
                variant="outline"
              >
                Filter
              </Button>
            </div>

            {/* History List */}
            <div className="max-h-40 overflow-y-auto border rounded">
              {error && <div className="text-red-500 p-2 text-sm">{error}</div>}
              {loading ? (
                <div className="p-2 text-center text-sm">Loading...</div>
              ) : closedDaysList.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  No closed days found for the selected period.
                </div>
              ) : (
                <ul className="divide-y">
                  {closedDaysList.map((cd) => (
                    <li key={cd.id} className="p-2 text-sm">
                      <span className="font-medium">
                        {cd.date.toDateString()}
                      </span>{" "}
                      - Expected: ${cd.expectedRevenue.toFixed(2)}, Collected: $
                      {cd.confirmedRevenue.toFixed(2)}
                      {cd.notes && (
                        <div className="text-xs text-muted-foreground">
                          Note: {cd.notes}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClosedDaysManager;

ClosedDaysManager.propTypes = {
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  onRefresh: PropTypes.func,
};
