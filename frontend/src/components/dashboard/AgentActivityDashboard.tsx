"use client";

import { useState, useEffect } from "react";
import { Evaluation, GrantStatus, AgentType } from "@/types";
import AgentCard from "./AgentCard";
import EvaluationProgress from "./EvaluationProgress";
import VotingStatus from "./VotingStatus";
import TimelineVisualization from "./TimelineVisualization";
import FinalDecision from "./FinalDecision";
import { Loader2, RefreshCw } from "lucide-react";
import { useAgentActivities } from "@/hooks/useApi";

interface AgentActivityDashboardProps {
  grantId: number;
  evaluations: Evaluation[];
  loadingEvaluations: boolean;
  grantStatus: GrantStatus;
}

const AGENT_TYPES: AgentType[] = [
  "intake",
  "technical",
  "impact",
  "due_diligence",
  "budget",
  "community",
];

export default function AgentActivityDashboard({
  grantId,
  evaluations,
  loadingEvaluations,
  grantStatus,
}: AgentActivityDashboardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch agent activities with auto-refresh
  const {
    data: activities,
    isLoading: loadingActivities,
    refetch,
  } = useAgentActivities(50);

  // Filter activities for this grant
  const grantActivities = activities?.filter((a) => a.grant_id === grantId) || [];

  // Update timestamp on data change
  useEffect(() => {
    setLastUpdate(new Date());
  }, [evaluations, activities]);

  // Manual refresh handler
  const handleRefresh = () => {
    refetch();
    setLastUpdate(new Date());
  };

  // Calculate evaluation statistics
  const completedEvaluations = evaluations.filter((e) => e.score !== null).length;
  const totalEvaluations = AGENT_TYPES.length;
  const averageScore =
    evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
      : 0;

  // Check if evaluation is complete
  const isEvaluationComplete = completedEvaluations === totalEvaluations;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Agent Activity
          </h2>
          <button
            onClick={handleRefresh}
            disabled={loadingActivities || loadingEvaluations}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw
              className={`h-4 w-4 text-gray-600 ${
                loadingActivities || loadingEvaluations ? "animate-spin" : ""
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="auto-refresh"
              className="text-sm text-gray-600"
            >
              Auto-refresh (5s)
            </label>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Evaluation Progress Overview */}
      <EvaluationProgress
        completed={completedEvaluations}
        total={totalEvaluations}
        averageScore={averageScore}
        status={grantStatus}
      />

      {/* Timeline Visualization */}
      <TimelineVisualization
        evaluations={evaluations}
        activities={grantActivities}
        grantStatus={grantStatus}
      />

      {/* Agent Cards Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Agent Evaluations
        </h3>
        {loadingEvaluations ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">
              Loading evaluations...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENT_TYPES.map((agentType) => {
              const evaluation = evaluations.find((e) => e.agent_type === agentType);
              const agentActivities = grantActivities.filter(
                (a) => a.agent_type === agentType
              );

              return (
                <AgentCard
                  key={agentType}
                  agentType={agentType}
                  evaluation={evaluation}
                  activities={agentActivities}
                  grantId={grantId}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Voting Status */}
      {isEvaluationComplete && (
        <VotingStatus evaluations={evaluations} grantStatus={grantStatus} />
      )}

      {/* Final Decision */}
      {(grantStatus === "approved" || grantStatus === "rejected") && (
        <FinalDecision
          grantStatus={grantStatus}
          evaluations={evaluations}
          averageScore={averageScore}
        />
      )}

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        {loadingActivities ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : grantActivities.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No activity recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {grantActivities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 capitalize">
                      {activity.agent_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{activity.action}</span>
                    {activity.message && ` - ${activity.message}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
