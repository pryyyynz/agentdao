"use client";

import { Evaluation, GrantStatus } from "@/types";
import { Vote, CheckCircle2, XCircle, Clock } from "lucide-react";

interface VotingStatusProps {
  evaluations: Evaluation[];
  grantStatus: GrantStatus;
}

export default function VotingStatus({
  evaluations,
  grantStatus,
}: VotingStatusProps) {
  const votesWithTx = evaluations.filter((e) => e.vote_tx_hash).length;
  const totalVotes = evaluations.length;
  const votingProgress = (votesWithTx / totalVotes) * 100;

  const isVotingComplete = grantStatus === "approved" || grantStatus === "rejected";

  const approvalVotes = evaluations.filter((e) => e.score >= 6).length;
  const rejectionVotes = evaluations.filter((e) => e.score < 6).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Vote className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Voting Status
        </h3>
      </div>

      {/* Voting Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            On-chain Votes Recorded
          </span>
          <span className="text-sm font-medium text-gray-900">
            {votesWithTx} / {totalVotes}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              isVotingComplete ? "bg-purple-600" : "bg-purple-600 animate-pulse"
            }`}
            style={{ width: `${votingProgress}%` }}
          />
        </div>
      </div>

      {/* Vote Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Approval
            </span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {approvalVotes}
          </div>
          <div className="text-xs text-green-700 mt-1">
            Score ≥ 6.0
          </div>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-900">
              Rejection
            </span>
          </div>
          <div className="text-3xl font-bold text-red-600">
            {rejectionVotes}
          </div>
          <div className="text-xs text-red-700 mt-1">
            Score &lt; 6.0
          </div>
        </div>
      </div>

      {/* Voting Status Message */}
      {isVotingComplete ? (
        <div
          className={`p-4 rounded-lg ${
            grantStatus === "approved"
              ? "bg-green-50"
              : "bg-red-50"
          }`}
        >
          <p
            className={`text-sm text-center font-medium ${
              grantStatus === "approved"
                ? "text-green-900"
                : "text-red-900"
            }`}
          >
            {grantStatus === "approved" ? (
              <>
                ✅ Voting Complete - Grant{" "}
                <span className="uppercase font-bold">APPROVED</span>
              </>
            ) : (
              <>
                ❌ Voting Complete - Grant{" "}
                <span className="uppercase font-bold">REJECTED</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 justify-center">
            <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
            <p className="text-sm text-blue-900">
              Waiting for votes to be recorded on-chain...
            </p>
          </div>
        </div>
      )}

      {/* Transaction Links */}
      {votesWithTx > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            On-chain Vote Transactions:
          </p>
          <div className="space-y-2">
            {evaluations
              .filter((e) => e.vote_tx_hash)
              .map((evaluation) => (
                <a
                  key={evaluation.id}
                  href={`https://sepolia.etherscan.io/tx/${evaluation.vote_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {evaluation.agent_type} Agent
                  </span>
                  <span className="text-xs text-blue-600 hover:underline">
                    View on Etherscan →
                  </span>
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
