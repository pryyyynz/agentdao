"use client";

import { Evaluation } from "@/types";
import { CheckCircle2, XCircle, Vote, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface VotingBreakdownProps {
  evaluations: Evaluation[];
}

export default function VotingBreakdown({ evaluations }: VotingBreakdownProps) {
  const votingStats = useMemo(() => {
    const withTx = evaluations.filter((e) => e.vote_tx_hash);
    const approved = evaluations.filter((e) => e.score >= 70).length;
    const rejected = evaluations.filter((e) => e.score < 50).length;
    const total = evaluations.length;
    
    // Calculate average score as approval rate (0-100 scale)
    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    const approvalRate = total > 0 ? totalScore / total : 0;
    
    // Calculate weighted average (votes with transactions count double)
    const weightedSum = evaluations.reduce((sum, e) => {
      const weight = e.vote_tx_hash ? 2 : 1;
      return sum + e.score * weight;
    }, 0);
    
    const totalWeight = evaluations.reduce((sum, e) => {
      return sum + (e.vote_tx_hash ? 2 : 1);
    }, 0);
    
    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      totalVotes: total,
      onChainVotes: withTx.length,
      approved,
      rejected,
      approvalRate,
      weightedAverage,
    };
  }, [evaluations]);

  const getQuorumStatus = () => {
    // Assume quorum is 5 evaluations
    const quorum = 5;
    if (votingStats.totalVotes >= quorum) {
      return {
        met: true,
        text: "Quorum Met",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    }
    return {
      met: false,
      text: `${votingStats.totalVotes}/${quorum} Votes`,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    };
  };

  const quorumStatus = getQuorumStatus();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Vote className="h-6 w-6 mr-2" />
          Voting Breakdown
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${quorumStatus.bgColor} ${quorumStatus.color}`}>
          {quorumStatus.text}
        </span>
      </div>

      {/* Approval Rate Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Average Score
          </span>
          <span className="text-sm font-bold text-gray-900">
            {votingStats.approvalRate.toFixed(1)}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 ${
              votingStats.approvalRate >= 70 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : votingStats.approvalRate >= 50 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}
            style={{ width: `${votingStats.approvalRate}%` }}
          >
            {votingStats.approvalRate > 15 && (
              <span className="text-xs font-bold text-white">
                {votingStats.approvalRate.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vote Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Vote className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700">
            {votingStats.totalVotes}
          </p>
          <p className="text-xs text-blue-600">Total Votes</p>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-700">
            {votingStats.onChainVotes}
          </p>
          <p className="text-xs text-purple-600">On-Chain</p>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700">
            {votingStats.approved}
          </p>
          <p className="text-xs text-green-600">Approved</p>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-700">
            {votingStats.rejected}
          </p>
          <p className="text-xs text-red-600">Rejected</p>
        </div>
      </div>

      {/* Weighted Average */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Weighted Average Score
            </p>
            <p className="text-xs text-gray-500">
              On-chain votes count double
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {votingStats.weightedAverage.toFixed(1)}
              <span className="text-lg text-gray-500">/100</span>
            </p>
          </div>
        </div>
      </div>

      {/* Individual Vote Breakdown */}
      {evaluations.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Vote Distribution
          </h3>
          <div className="space-y-2">
            {evaluations.map((evaluation) => {
              const isApproved = evaluation.score >= 70;
              return (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-2">
                    {isApproved ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm text-gray-700">
                      {evaluation.agent_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {evaluation.vote_tx_hash && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded">
                        On-Chain
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${isApproved ? 'text-green-600' : 'text-red-600'}`}>
                    {evaluation.score.toFixed(1)}/100
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
