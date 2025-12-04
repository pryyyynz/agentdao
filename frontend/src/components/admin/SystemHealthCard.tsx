"use client";

import { SystemHealth } from "@/types";
import { Activity, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface SystemHealthCardProps {
  health: SystemHealth;
}

export default function SystemHealthCard({ health }: SystemHealthCardProps) {
  // Format uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Get status color and icon
  const getStatusInfo = () => {
    switch (health.status) {
      case 'healthy':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: CheckCircle2,
          label: 'Healthy',
        };
      case 'degraded':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: AlertCircle,
          label: 'Degraded',
        };
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: AlertCircle,
          label: 'Critical',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Calculate agent health percentage
  const agentHealthPercentage = (health.active_agents / health.total_agents) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                System Health
              </h2>
              <p className="text-sm text-gray-500">
                Real-time system metrics
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${statusInfo.bgColor}`}>
            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Uptime */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">System Age</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatUptime(health.uptime_seconds)}
            </p>
            <p className="text-xs text-gray-500">
              Since first grant
            </p>
          </div>

          {/* Total Grants */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Total Grants</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {health.total_grants}
            </p>
            <p className="text-xs text-gray-500">
              Lifetime processed
            </p>
          </div>

          {/* Active Evaluations */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-500">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Active Evaluations</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {health.active_evaluations}
            </p>
            <p className="text-xs text-gray-500">
              Currently processing
            </p>
          </div>

          {/* Pending Actions */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Pending Actions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {health.pending_actions}
            </p>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Treasury Balance */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Treasury Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {health.treasury_balance} ETH
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>

            {/* Active Agents */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Active Agents</p>
                <p className="text-lg font-semibold text-gray-900">
                  {health.active_agents} / {health.total_agents}
                </p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="transform -rotate-90 w-12 h-12">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - agentHealthPercentage / 100)}`}
                    className="text-blue-600"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                  {Math.round(agentHealthPercentage)}%
                </span>
              </div>
            </div>

            {/* Last Check */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Last Health Check</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(health.last_check).toLocaleTimeString()}
                </p>
              </div>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
