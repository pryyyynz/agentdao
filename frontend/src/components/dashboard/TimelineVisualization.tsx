"use client";

import { Evaluation, AgentActivity, GrantStatus } from "@/types";
import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface TimelineVisualizationProps {
  evaluations: Evaluation[];
  activities: AgentActivity[];
  grantStatus: GrantStatus;
}

interface TimelineEvent {
  id: string;
  type: "evaluation" | "activity" | "status";
  timestamp: Date;
  title: string;
  description: string;
  agent?: string;
  status?: "completed" | "in-progress" | "pending";
  score?: number;
}

export default function TimelineVisualization({
  evaluations,
  activities,
  grantStatus,
}: TimelineVisualizationProps) {
  // Convert evaluations and activities to timeline events
  const events: TimelineEvent[] = [
    // Add evaluation events
    ...evaluations.map((e) => ({
      id: `eval-${e.id}`,
      type: "evaluation" as const,
      timestamp: new Date(e.created_at),
      title: `${e.agent_type.charAt(0).toUpperCase() + e.agent_type.slice(1)} Evaluation Complete`,
      description: `Score: ${e.score.toFixed(1)}/100`,
      agent: e.agent_type,
      status: "completed" as const,
      score: e.score,
    })),
    // Add activity events
    ...activities.slice(0, 10).map((a) => ({
      id: a.id,
      type: "activity" as const,
      timestamp: new Date(a.timestamp),
      title: `${a.agent_type.charAt(0).toUpperCase() + a.agent_type.slice(1)}: ${a.action}`,
      description: a.message || "",
      agent: a.agent_type,
      status: "completed" as const,
    })),
  ];

  // Sort by timestamp (most recent first)
  const sortedEvents = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getEventIcon = (event: TimelineEvent) => {
    if (event.type === "evaluation") {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (event.status === "in-progress") {
      return <Clock className="h-5 w-5 text-blue-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Evaluation Timeline
        </h3>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            No events recorded yet
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Timeline will populate as agents begin evaluation
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Timeline Events */}
          <div className="space-y-6">
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0 w-12 h-12 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                  {getEventIcon(event)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                      )}
                      {event.score !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Score:
                          </span>
                          <span
                            className={`text-sm font-bold ${getScoreColor(event.score)}`}
                          >
                            {event.score.toFixed(1)}/100
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>

                  {/* Agent Badge */}
                  {event.agent && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {event.agent.replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status Footer */}
          {grantStatus !== "pending" && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div
                className={`flex items-center justify-center gap-3 p-4 rounded-lg ${
                  grantStatus === "approved"
                    ? "bg-green-50"
                    : grantStatus === "rejected"
                    ? "bg-red-50"
                    : grantStatus === "evaluating"
                    ? "bg-blue-50"
                    : "bg-gray-50"
                }`}
              >
                {grantStatus === "approved" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : grantStatus === "rejected" ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                )}
                <span
                  className={`text-sm font-medium ${
                    grantStatus === "approved"
                      ? "text-green-900"
                      : grantStatus === "rejected"
                      ? "text-red-900"
                      : "text-blue-900"
                  }`}
                >
                  Current Status:{" "}
                  <span className="uppercase">
                    {grantStatus === "evaluating" ? "In Progress" : grantStatus}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
