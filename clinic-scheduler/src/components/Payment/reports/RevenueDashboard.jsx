// src/components/Payment/reports/RevenueDashboard.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { format } from "date-fns";

const RevenueDashboard = ({ revenueData, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalRevenue,
    monthlyRevenue,
    pendingPayments,
    recentPayments,
    revenueByMethod,
    revenueByClient,
  } = revenueData;

  const stats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue?.toFixed(2) || "0.00"}`,
      description: "All time revenue",
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      title: "Monthly Revenue",
      value: `$${monthlyRevenue?.toFixed(2) || "0.00"}`,
      description: `For ${format(new Date(), "MMMM yyyy")}`,
      icon: TrendingUp,
      color: "text-blue-500",
    },
    {
      title: "Pending Payments",
      value: pendingPayments || 0,
      description: "Unpaid appointments",
      icon: CreditCard,
      color: "text-yellow-500",
    },
    {
      title: "Active Clients",
      value: Object.keys(revenueByClient || {}).length || 0,
      description: "Clients with payments",
      icon: Users,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(revenueByMethod || {}).map(([method, amount]) => {
                const total = Object.values(revenueByMethod || {}).reduce(
                  (sum, val) => sum + val,
                  0
                );
                const percentage =
                  total > 0 ? ((amount / total) * 100).toFixed(1) : 0;

                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium">{method}</span>
                      <span>${amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage}% of total revenue
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(revenueByClient || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([client, amount], index) => (
                  <div
                    key={client}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{client}</span>
                    </div>
                    <span className="font-semibold">${amount.toFixed(2)}</span>
                  </div>
                ))}

              {Object.keys(revenueByClient || {}).length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No client data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueDashboard;
