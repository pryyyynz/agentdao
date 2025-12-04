"use client";

import { Evaluation, AgentType } from "@/types";
import { Brain, CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";

interface EvaluationResultsProps {
  evaluations: Evaluation[];
}

const AGENT_CONFIG: Record<
  AgentType,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  intake: {
    label: "Intake Agent",
    icon: CheckCircle2,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  coordinator: {
    label: "Coordinator Agent",
    icon: Brain,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  technical: {
    label: "Technical Agent",
    icon: Brain,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  impact: {
    label: "Impact Agent",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  due_diligence: {
    label: "Due Diligence Agent",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  budget: {
    label: "Budget Agent",
    icon: TrendingDown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  community: {
    label: "Community Agent",
    icon: Brain,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
  },
  executor: {
    label: "Executor Agent",
    icon: CheckCircle2,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
};

export default function EvaluationResults({ evaluations }: EvaluationResultsProps) {
  const stats = useMemo(() => {
    if (evaluations.length === 0) {
      return {
        averageScore: 0,
        totalEvaluations: 0,
        passed: 0,
        failed: 0,
      };
    }

    const total = evaluations.length;
    const sum = evaluations.reduce((acc, e) => acc + e.score, 0);
    const passed = evaluations.filter((e) => e.score >= 60).length;

    return {
      averageScore: sum / total,
      totalEvaluations: total,
      passed,
      failed: total - passed,
    };
  }, [evaluations]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return "bg-green-100";
    if (score >= 50) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Evaluation Results
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 mb-1">Average Score</p>
          <p className="text-3xl font-bold text-blue-700">
            {stats.averageScore.toFixed(1)}
            <span className="text-lg text-blue-500">/100</span>
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-600 mb-1">Total Evaluations</p>
          <p className="text-3xl font-bold text-purple-700">
            {stats.totalEvaluations}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600 mb-1">Passed (≥60)</p>
          <p className="text-3xl font-bold text-green-700">
            {stats.passed}
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600 mb-1">Failed (&lt;60)</p>
          <p className="text-3xl font-bold text-red-700">
            {stats.failed}
          </p>
        </div>
      </div>

      {/* Individual Evaluations */}
      <div className="space-y-4">
        {evaluations.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No evaluations yet. Agents are still processing this grant.
            </p>
          </div>
        ) : (
          evaluations.map((evaluation) => {
            const config = AGENT_CONFIG[evaluation.agent_type];
            const Icon = config.icon;

            return (
              <div
                key={evaluation.id}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {config.label}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(evaluation.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-4 py-2 rounded-lg ${getScoreBgColor(
                        evaluation.score
                      )}`}
                    >
                      <p className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}>
                        {evaluation.score.toFixed(1)}
                        <span className="text-sm">/100</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Evaluation Reasoning:
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {evaluation.reasoning}
                  </p>
                </div>

                {evaluation.vote_tx_hash && (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Vote recorded on-chain
                    </span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${evaluation.vote_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Transaction →
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
