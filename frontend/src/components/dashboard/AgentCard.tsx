"use client";

import { Evaluation, AgentActivity, AgentType } from "@/types";
import {
  Brain,
  Code,
  Target,
  Shield,
  DollarSign,
  Users,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";

interface AgentCardProps {
  agentType: AgentType;
  evaluation?: Evaluation;
  activities: AgentActivity[];
  grantId: number;
}

const AGENT_CONFIG: Record<
  AgentType,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  intake: {
    name: "Intake Agent",
    icon: Brain,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Initial proposal validation",
  },
  technical: {
    name: "Technical Analyst",
    icon: Code,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Code quality & architecture review",
  },
  impact: {
    name: "Impact Analyst",
    icon: Target,
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "Potential impact assessment",
  },
  due_diligence: {
    name: "Due Diligence Agent",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-100",
    description: "Risk & compliance analysis",
  },
  budget: {
    name: "Budget Analyst",
    icon: DollarSign,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    description: "Financial viability review",
  },
  community: {
    name: "Community Sentiment",
    icon: Users,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    description: "Community feedback analysis",
  },
  coordinator: {
    name: "Coordinator",
    icon: Brain,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    description: "Orchestrates agent workflow",
  },
  executor: {
    name: "Executor",
    icon: Check,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    description: "Executes approved grants",
  },
};

export default function AgentCard({
  agentType,
  evaluation,
  activities,
}: AgentCardProps) {
  const config = AGENT_CONFIG[agentType];
  const Icon = config.icon;

  const hasEvaluation = evaluation !== undefined;
  const latestActivity = activities[0];

  const getStatusIcon = () => {
    if (hasEvaluation) {
      return <Check className="h-5 w-5 text-green-600" />;
    }
    if (latestActivity) {
      return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (hasEvaluation) return "Completed";
    if (latestActivity) return "In Progress";
    return "Pending";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {config.name}
            </h3>
            <p className="text-xs text-gray-500">
              {config.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
        </div>
      </div>

      {/* Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Status</span>
          <span className="text-sm font-medium text-gray-900">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Evaluation Score */}
      {hasEvaluation ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Score</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}
              >
                {evaluation.score.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">/ 10</span>
            </div>
          </div>

          {/* Score Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                evaluation.score >= 8
                  ? "bg-green-600"
                  : evaluation.score >= 6
                  ? "bg-yellow-600"
                  : "bg-red-600"
              }`}
              style={{ width: `${(evaluation.score / 10) * 100}%` }}
            />
          </div>

          {/* Reasoning */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2 font-medium">
              Reasoning:
            </p>
            <p className="text-sm text-gray-700 line-clamp-4">
              {evaluation.reasoning}
            </p>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 mt-2">
            Evaluated {new Date(evaluation.created_at).toLocaleString()}
          </div>

          {/* Transaction Hash */}
          {evaluation.vote_tx_hash && (
            <div className="mt-2">
              <a
                href={`https://sepolia.etherscan.io/tx/${evaluation.vote_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                View on Etherscan →
              </a>
            </div>
          )}
        </div>
      ) : latestActivity ? (
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{latestActivity.action}</span>
            </p>
            {latestActivity.message && (
              <p className="text-xs text-gray-600 mt-1">
                {latestActivity.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {new Date(latestActivity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            Waiting to start evaluation
          </p>
        </div>
      )}

      {/* Activity Count */}
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Activity Log</span>
            <span className="font-medium">{activities.length} events</span>
          </div>
        </div>
      )}
    </div>
  );
}
