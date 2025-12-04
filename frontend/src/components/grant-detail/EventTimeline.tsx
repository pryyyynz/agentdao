"use client";

import { AgentActivity, Evaluation } from "@/types";
import { useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  Vote,
  FileText,
  Clock,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EventTimelineProps {
  activities: AgentActivity[];
  evaluations: Evaluation[];
  grantCreatedAt: string;
}

type TimelineEvent = {
  id: string;
  type: "activity" | "evaluation" | "created";
  timestamp: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  metadata?: any;
};

export default function EventTimeline({
  activities,
  evaluations,
  grantCreatedAt,
}: EventTimelineProps) {
  const timeline = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add grant creation
    events.push({
      id: "created",
      type: "created",
      timestamp: grantCreatedAt,
      title: "Grant Submitted",
      description: "Application submitted and entered the evaluation pipeline",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    });

    // Add activities
    activities.forEach((activity) => {
      events.push({
        id: `activity-${activity.id}`,
        type: "activity",
        timestamp: activity.timestamp,
        title: activity.action,
        description: activity.message,
        icon: Activity,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        metadata: activity.metadata,
      });
    });

    // Add evaluations
    evaluations.forEach((evaluation) => {
      events.push({
        id: `evaluation-${evaluation.id}`,
        type: "evaluation",
        timestamp: evaluation.created_at,
        title: `${evaluation.agent_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Evaluation`,
        description: `Scored ${evaluation.score.toFixed(1)}/100${
          evaluation.vote_tx_hash ? " • Voted on-chain" : ""
        }`,
        icon: evaluation.vote_tx_hash ? Vote : CheckCircle2,
        color:
          evaluation.score >= 8
            ? "text-green-600"
            : evaluation.score >= 6
            ? "text-yellow-600"
            : "text-red-600",
        bgColor:
          evaluation.score >= 8
            ? "bg-green-100"
            : evaluation.score >= 6
            ? "bg-yellow-100"
            : "bg-red-100",
        metadata: evaluation,
      });
    });

    // Sort by timestamp (newest first)
    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activities, evaluations, grantCreatedAt]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Clock className="h-6 w-6 mr-2" />
          Timeline
        </h2>
        <span className="text-sm text-gray-500">
          {timeline.length} events
        </span>
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No events yet. Timeline will update as agents process the grant.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Events */}
          <div className="space-y-6">
            {timeline.map((event, index) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex items-start space-x-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${event.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${event.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-8">
                    <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {event.title}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                          {formatDistanceToNow(new Date(event.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {event.description}
                      </p>

                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>

                      {/* Evaluation Details */}
                      {event.type === "evaluation" && event.metadata && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              Score: {event.metadata.score.toFixed(1)}/100
                            </span>
                            {event.metadata.vote_tx_hash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${event.metadata.vote_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                View Transaction →
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activity Metadata */}
                      {event.type === "activity" && event.metadata && (
                        <div className="mt-2">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-block text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded mr-2 mb-1"
                            >
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
