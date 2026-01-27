"use client";

import { Card } from "@heroui/react";

import {
  DashboardSidebar,
  DashboardHeader,
  RecentTransactionsTable,
} from "./mock-dashboard-parts";
import { StatCard } from "./stat-card";

export const MockDashboard = () => {
  return (
    <Card
      className="w-full max-w-[1000px] mx-auto border-default-200/50 bg-background/60 backdrop-blur-xl shadow-2xl relative z-10"
      isBlurred
    >
      <div className="flex h-[500px]">
        <DashboardSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          {/* Dashboard Content */}
          <div className="p-6 overflow-hidden">
            <h2 className="text-xl font-bold mb-6">Overview</h2>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Total Revenue"
                value="$45,231.89"
                trend="+20.1%"
              />
              <StatCard label="Active Orders" value="+356" trend="+12.5%" />
              <StatCard
                label="Customers"
                value="2,450"
                trend="-1.2%"
                trendType="danger"
              />
            </div>

            <RecentTransactionsTable />
          </div>
        </div>
      </div>
    </Card>
  );
};
