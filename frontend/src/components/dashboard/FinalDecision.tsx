"use client";

import { Evaluation, GrantStatus } from "@/types";
import { CheckCircle2, XCircle, TrendingUp, Award } from "lucide-react";

interface FinalDecisionProps {
  grantStatus: GrantStatus;
  evaluations: Evaluation[];
  averageScore: number;
}

export default function FinalDecision({
  grantStatus,
  evaluations,
  averageScore,
}: FinalDecisionProps) {
  const isApproved = grantStatus === "approved";
  const approvalVotes = evaluations.filter((e) => e.score >= 6).length;
  const totalVotes = evaluations.length;
  const approvalRate = (approvalVotes / totalVotes) * 100;

  // Get top and bottom evaluations
  const sortedEvaluations = [...evaluations].sort((a, b) => b.score - a.score);
  const topEvaluations = sortedEvaluations.slice(0, 3);
  const concerningEvaluations = sortedEvaluations.slice(-2);

  return (
    <div
      className={`rounded-lg shadow-lg border-2 overflow-hidden ${
        isApproved
          ? "border-green-500 bg-gradient-to-br from-green-50 to-green-100"
          : "border-red-500 bg-gradient-to-br from-red-50 to-red-100"
      }`}
    >
      {/* Header */}
      <div className="p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          {isApproved ? (
            <div className="p-4 bg-green-500 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          ) : (
            <div className="p-4 bg-red-500 rounded-full">
              <XCircle className="h-12 w-12 text-white" />
            </div>
          )}
        </div>
        <h2
          className={`text-3xl font-bold mb-2 ${
            isApproved
              ? "text-green-900"
              : "text-red-900"
          }`}
        >
          Grant {isApproved ? "APPROVED" : "REJECTED"}
        </h2>
        <p
          className={`text-lg ${
            isApproved
              ? "text-green-700"
              : "text-red-700"
          }`}
        >
          {isApproved
            ? "Congratulations! Your grant has been approved by the AI agent committee."
            : "Unfortunately, your grant did not meet the approval threshold."}
        </p>
      </div>

      {/* Statistics */}
      <div className="bg-white p-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div
              className={`text-3xl font-bold ${
                averageScore >= 8
                  ? "text-green-600"
                  : averageScore >= 6
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {averageScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Average Score
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {approvalVotes}/{totalVotes}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Approval Votes
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {approvalRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Approval Rate
            </div>
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="space-y-6">
          {/* Strengths */}
          {topEvaluations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Strengths
              </h3>
              <div className="space-y-3">
                {topEvaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-green-900 capitalize">
                        {evaluation.agent_type.replace("_", " ")} Agent
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {evaluation.score.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {evaluation.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas for Improvement */}
          {concerningEvaluations.length > 0 && !isApproved && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Areas for Improvement
              </h3>
              <div className="space-y-3">
                {concerningEvaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="p-4 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-red-900 capitalize">
                        {evaluation.agent_type.replace("_", " ")} Agent
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        {evaluation.score.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {evaluation.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            {isApproved ? "Next Steps:" : "What's Next?"}
          </h4>
          <p className="text-sm text-blue-800">
            {isApproved
              ? "Your grant will be processed and funds will be released according to your milestone schedule. You'll receive a notification once the first milestone is activated."
              : "You can revise your proposal addressing the concerns mentioned above and resubmit for evaluation. Our agents are here to help you improve!"}
          </p>
        </div>
      </div>
    </div>
  );
}
