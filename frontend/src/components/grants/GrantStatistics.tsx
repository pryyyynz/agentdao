"use client";

import { DashboardStats } from "@/types";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface GrantStatisticsProps {
  stats?: DashboardStats;
  totalShown: number;
  totalGrants: number;
}

export default function GrantStatistics({
  stats,
  totalShown,
  totalGrants,
}: GrantStatisticsProps) {
  const statCards = [
    {
      title: "Total Grants",
      value: stats?.total_grants || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Pending Review",
      value: stats?.pending_grants || 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Approved",
      value: stats?.approved_grants || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Rejected",
      value: stats?.rejected_grants || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Total Funded",
      value: `${stats?.total_funded || "0"} ETH`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Active Agents",
      value: stats?.active_agents || 0,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ];

  return (
    <div className="mb-8">
      {/* Filter Results Info */}
      {totalShown !== totalGrants && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            Showing <span className="font-semibold">{totalShown}</span> of{" "}
            <span className="font-semibold">{totalGrants}</span> grants
          </p>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
