"use client";

import { GrantStatus } from "@/types";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface EvaluationProgressProps {
  completed: number;
  total: number;
  averageScore: number;
  status: GrantStatus;
}

export default function EvaluationProgress({
  completed,
  total,
  averageScore,
  status,
}: EvaluationProgressProps) {
  const progress = (completed / total) * 100;
  const isComplete = completed === total;

  const getStatusConfig = () => {
    switch (status) {
      case "approved":
        return {
          color: "bg-green-600",
          text: "Approved",
          icon: CheckCircle2,
          iconColor: "text-green-600",
        };
      case "rejected":
        return {
          color: "bg-red-600",
          text: "Rejected",
          icon: CheckCircle2,
          iconColor: "text-red-600",
        };
      case "evaluating":
        return {
          color: "bg-blue-600",
          text: "In Progress",
          icon: Clock,
          iconColor: "text-blue-600",
        };
      default:
        return {
          color: "bg-gray-600",
          text: "Pending",
          icon: Clock,
          iconColor: "text-gray-600",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    if (score > 0) return "text-red-600";
    return "text-gray-400";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Evaluation Progress
        </h3>
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${statusConfig.iconColor}`} />
          <span className="text-sm font-medium text-gray-700">
            {statusConfig.text}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            Agent Evaluations
          </span>
          <span className="text-sm font-medium text-gray-900">
            {completed} / {total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              isComplete ? "bg-green-600" : statusConfig.color
            } ${!isComplete && "animate-pulse"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {progress.toFixed(0)}% Complete
          </span>
          {!isComplete && (
            <span className="text-xs text-blue-600 animate-pulse">
              Evaluating...
            </span>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Average Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
            {averageScore > 0 ? averageScore.toFixed(1) : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Average Score
          </div>
        </div>

        {/* Completed */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {completed}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Completed
          </div>
        </div>

        {/* Pending */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-5 w-5 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {total - completed}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Pending
          </div>
        </div>
      </div>

      {/* Status Message */}
      {isComplete && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 text-center">
            ✅ All agent evaluations complete! Voting process initiated.
          </p>
        </div>
      )}
    </div>
  );
}
