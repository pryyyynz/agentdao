"use client";

import { AgentPerformance } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { TrendingUp, Award, Target, Activity } from "lucide-react";

interface AgentComparisonProps {
  performances: AgentPerformance[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AgentComparison({ performances }: AgentComparisonProps) {
  // Prepare data for bar chart
  const barChartData = [
    {
      metric: "Reputation",
      ...performances.reduce((acc, p, i) => ({
        ...acc,
        [p.agent_type]: p.reputation_score,
      }), {}),
    },
    {
      metric: "Accuracy %",
      ...performances.reduce((acc, p, i) => ({
        ...acc,
        [p.agent_type]: p.accuracy_rate,
      }), {}),
    },
    {
      metric: "Avg Score",
      ...performances.reduce((acc, p, i) => ({
        ...acc,
        [p.agent_type]: p.average_score * 10, // Scale to 0-100
      }), {}),
    },
    {
      metric: "Evaluations",
      ...performances.reduce((acc, p, i) => ({
        ...acc,
        [p.agent_type]: p.total_evaluations,
      }), {}),
    },
  ];

  // Prepare data for radar chart
  const radarData = [
    {
      metric: "Reputation",
      ...performances.reduce((acc, p) => ({
        ...acc,
        [p.agent_type]: p.reputation_score,
      }), {}),
      fullMark: 100,
    },
    {
      metric: "Accuracy",
      ...performances.reduce((acc, p) => ({
        ...acc,
        [p.agent_type]: p.accuracy_rate,
      }), {}),
      fullMark: 100,
    },
    {
      metric: "Avg Score",
      ...performances.reduce((acc, p) => ({
        ...acc,
        [p.agent_type]: p.average_score * 10,
      }), {}),
      fullMark: 100,
    },
    {
      metric: "Experience",
      ...performances.reduce((acc, p) => ({
        ...acc,
        [p.agent_type]: Math.min(100, p.total_evaluations * 2), // Scale evaluations to 0-100
      }), {}),
      fullMark: 100,
    },
    {
      metric: "Weight",
      ...performances.reduce((acc, p) => ({
        ...acc,
        [p.agent_type]: (p.voting_weight - 1) * 50 + 50, // Scale weight to 0-100
      }), {}),
      fullMark: 100,
    },
  ];

  // Comparison table data
  const comparisonRows = [
    {
      metric: "Reputation Score",
      icon: Award,
      format: (v: number) => `${v}/100`,
      values: performances.map((p) => p.reputation_score),
    },
    {
      metric: "Accuracy Rate",
      icon: Target,
      format: (v: number) => `${v}%`,
      values: performances.map((p) => p.accuracy_rate),
    },
    {
      metric: "Total Evaluations",
      icon: Activity,
      format: (v: number) => v.toString(),
      values: performances.map((p) => p.total_evaluations),
    },
    {
      metric: "Average Score",
      icon: TrendingUp,
      format: (v: number) => `${v}/10`,
      values: performances.map((p) => p.average_score),
    },
    {
      metric: "Voting Weight",
      icon: Award,
      format: (v: number) => `${v}x`,
      values: performances.map((p) => p.voting_weight),
    },
  ];

  // Find best/worst for highlighting
  const getBestWorst = (values: number[]) => {
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { max, min };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Agent Comparison
      </h2>

      {/* Comparison Table */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Metric
              </th>
              {performances.map((p, i) => (
                <th
                  key={p.agent_type}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-900 capitalize"
                >
                  {p.agent_type.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => {
              const { max, min } = getBestWorst(row.values);
              const Icon = row.icon;

              return (
                <tr
                  key={row.metric}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {row.metric}
                      </span>
                    </div>
                  </td>
                  {row.values.map((value, i) => {
                    const isBest = value === max && max !== min;
                    const isWorst = value === min && max !== min;

                    return (
                      <td key={i} className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[80px] px-3 py-1 rounded-lg text-sm font-semibold ${
                            isBest
                              ? "bg-green-100 text-green-800"
                              : isWorst
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {row.format(value)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Metric Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="metric"
                fontSize={12}
                stroke="#9ca3af"
                tickMargin={10}
              />
              <YAxis fontSize={12} stroke="#9ca3af" tickMargin={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              {performances.map((p, i) => (
                <Bar
                  key={p.agent_type}
                  dataKey={p.agent_type}
                  fill={COLORS[i % COLORS.length]}
                  name={p.agent_type.replace("_", " ")}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Overall Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="metric"
                fontSize={12}
                stroke="#9ca3af"
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              {performances.map((p, i) => (
                <Radar
                  key={p.agent_type}
                  name={p.agent_type.replace("_", " ")}
                  dataKey={p.agent_type}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>How to read:</strong> Green highlights indicate the best performance in each
          category, while red indicates areas for improvement. The radar chart shows overall
          balance across all metrics.
        </p>
      </div>
    </div>
  );
}
