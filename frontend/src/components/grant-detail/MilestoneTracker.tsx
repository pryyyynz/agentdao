"use client";

import { useState } from "react";
import { Milestone } from "@/types";
import { CheckCircle2, Circle, Clock, ExternalLink, AlertCircle, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SubmitProofOfWorkForm from "./SubmitProofOfWorkForm";

interface MilestoneTrackerProps {
  milestones: Milestone[];
  onRefetch?: () => void;
}

export default function MilestoneTracker({ milestones, onRefetch }: MilestoneTrackerProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "submitted":
      case "under_review":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "in_progress":
        return <Circle className="h-5 w-5 text-blue-600" />;
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "submitted":
      case "under_review":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "revision_requested":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalAmount = milestones.reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const approvedAmount = milestones
    .filter((m) => m.status === "approved")
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const progressPercentage = totalAmount > 0 ? (approvedAmount / totalAmount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Milestone Progress
      </h2>

      {milestones.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No milestones defined yet. Milestones will be created after grant approval.
          </p>
        </div>
      ) : (
        <>
          {/* Progress Overview */}
          <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Total Progress
              </span>
              <span className="text-sm font-bold text-gray-900">
                {approvedAmount.toFixed(2)} / {totalAmount.toFixed(2)} ETH
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <span>{milestones.filter((m) => m.status === "approved").length} of {milestones.length} approved</span>
              <span>{progressPercentage.toFixed(1)}% complete</span>
            </div>
          </div>

          {/* Milestone List */}
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="relative border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* Connector Line */}
                {index < milestones.length - 1 && (
                  <div className="absolute left-6 top-14 w-0.5 h-8 bg-gray-200" />
                )}

                <div className="flex items-start space-x-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {milestone.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {milestone.description}
                        </p>
                      </div>
                      <span
                        className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
                          milestone.status
                        )}`}
                      >
                        {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                      </span>
                    </div>

                    {/* Milestone Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Amount:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {milestone.amount} ETH
                        </span>
                      </div>

                      {milestone.estimated_completion_date && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Target Date:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(milestone.estimated_completion_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {(milestone.completed_at || milestone.actual_completion_date) && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-gray-500">Completed:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDistanceToNow(new Date(milestone.completed_at || milestone.actual_completion_date!), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Submit Button for In Progress/Revision Requested Milestones */}
                    {(milestone.status === "in_progress" || milestone.status === "revision_requested") && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedMilestone(milestone)}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Submit Proof of Work</span>
                        </button>
                      </div>
                    )}

                    {/* Transaction Link */}
                    {(milestone.release_tx_hash || milestone.payment_tx_hash) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${milestone.release_tx_hash || milestone.payment_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <span>View Release Transaction</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter((m) => m.status === "pending").length}
              </p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter((m) => m.status === "in_progress").length}
              </p>
              <p className="text-xs text-gray-600">In Progress</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter((m) => m.status === "submitted" || m.status === "under_review").length}
              </p>
              <p className="text-xs text-gray-600">In Review</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter((m) => m.status === "approved").length}
              </p>
              <p className="text-xs text-gray-600">Approved</p>
            </div>
          </div>
        </>
      )}

      {/* Proof of Work Submission Modal */}
      {selectedMilestone && (
        <SubmitProofOfWorkForm
          milestone={selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          onSuccess={() => {
            setSelectedMilestone(null);
            onRefetch?.();
          }}
        />
      )}
    </div>
  );
}
