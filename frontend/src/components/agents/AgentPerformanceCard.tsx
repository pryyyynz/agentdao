"use client";

import { AgentPerformance, AgentActivity } from "@/types";
import {
  Brain,
  TrendingUp,
  Target,
  Award,
  Activity as ActivityIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

interface AgentPerformanceCardProps {
  performance: AgentPerformance;
  activities: AgentActivity[];
  isSelected: boolean;
  onSelect: () => void;
}

const AGENT_CONFIG: Record<string, { color: string; bgColor: string; icon: any }> = {
  intake: { color: "text-purple-600", bgColor: "bg-purple-100", icon: Target },
  technical: { color: "text-blue-600", bgColor: "bg-blue-100", icon: Brain },
  impact: { color: "text-green-600", bgColor: "bg-green-100", icon: TrendingUp },
  due_diligence: { color: "text-red-600", bgColor: "bg-red-100", icon: Target },
  budget: { color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Award },
  community: { color: "text-pink-600", bgColor: "bg-pink-100", icon: Brain },
};

export default function AgentPerformanceCard({
  performance,
  activities,
  isSelected,
  onSelect,
}: AgentPerformanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const config = AGENT_CONFIG[performance.agent_type];
  const Icon = config.icon;

  // Prepare chart data
  const chartData = useMemo(() => {
    return performance.reputation_trend.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      reputation: point.score,
    }));
  }, [performance.reputation_trend]);

  // Recent activities (last 5)
  const recentActivities = useMemo(() => {
    return activities.slice(-5).reverse();
  }, [activities]);

  // Get reputation badge
  const getReputationBadge = (score: number) => {
    if (score >= 85) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (score >= 70) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { label: "Average", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Needs Improvement", color: "bg-red-100 text-red-800" };
  };

  const reputationBadge = getReputationBadge(performance.reputation_score);

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
        isSelected
          ? "border-blue-500 shadow-lg"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 capitalize">
                {performance.agent_type.replace("_", " ")} Agent
              </h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${reputationBadge.color} mt-1`}>
                {reputationBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={onSelect}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelected
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isSelected ? "Selected" : "Compare"}
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Reputation</p>
            <p className="text-2xl font-bold text-gray-900">
              {performance.reputation_score}
              <span className="text-sm text-gray-500">/100</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Voting Weight</p>
            <p className="text-2xl font-bold text-gray-900">
              {performance.voting_weight}x
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Evaluations</p>
            <p className="text-2xl font-bold text-gray-900">
              {performance.total_evaluations}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Accuracy</p>
            <p className="text-2xl font-bold text-gray-900">
              {performance.accuracy_rate}%
            </p>
          </div>
        </div>
      </div>

      {/* Reputation Trend Chart */}
      {chartData.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            Reputation Trend (Last 30 Days)
          </h4>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                fontSize={12}
                stroke="#9ca3af"
                tickMargin={10}
              />
              <YAxis
                fontSize={12}
                stroke="#9ca3af"
                domain={[0, 100]}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="reputation"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statistics */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Performance Statistics
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Average Score Given
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {performance.average_score.toFixed(1)}/100
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Accurate Predictions
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {Math.round((performance.accuracy_rate / 100) * performance.total_evaluations)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Recent Activity
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {activities.length} actions
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activities (Expandable) */}
      {recentActivities.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ActivityIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                Recent Activity
              </span>
              <span className="text-xs text-gray-500">
                ({recentActivities.length})
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expanded && (
            <div className="px-6 pb-4 space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
