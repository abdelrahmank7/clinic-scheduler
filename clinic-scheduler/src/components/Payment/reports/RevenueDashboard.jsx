// src/components/Payment/reports/RevenueDashboard.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { format } from "date-fns";

const RevenueDashboard = ({ revenueData, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate today's collected revenue (sum of all payments where money was collected today)
  const today = new Date();
  const isToday = (date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  // Use createdAt for when the money was actually collected
  const todaysPayments = (revenueData.recentPayments || []).filter(
    (p) => p.createdAt && isToday(new Date(p.createdAt))
  );
  const todaysRevenue = todaysPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Expected Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${todaysRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total expected to be collected today
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueDashboard;
