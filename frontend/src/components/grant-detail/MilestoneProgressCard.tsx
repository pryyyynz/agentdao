"use client";

import { Milestone, MilestoneStatus } from "@/types";
import { CheckCircle2, Clock, XCircle, AlertCircle, PlayCircle, Eye, Upload } from "lucide-react";
import { useState } from "react";
import SubmitProofOfWorkForm from "./SubmitProofOfWorkForm";

interface MilestoneProgressCardProps {
  milestones: Milestone[];
  grantId: string;
  completionPercentage: string;
  paidAmount: string;
  totalAmount: string;
}

const getStatusIcon = (status: MilestoneStatus) => {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "in_progress":
      return <PlayCircle className="w-4 h-4 text-blue-600" />;
    case "submitted":
    case "under_review":
      return <Eye className="w-4 h-4 text-yellow-600" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "revision_requested":
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status: MilestoneStatus) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "submitted":
    case "under_review":
      return "bg-yellow-100 text-yellow-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "revision_requested":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function MilestoneProgressCard({
  milestones,
  grantId,
  completionPercentage,
  paidAmount,
  totalAmount,
}: MilestoneProgressCardProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  console.log('MilestoneProgressCard render:', {
    milestonesCount: milestones?.length,
    milestones: milestones,
    grantId,
    completionPercentage,
    paidAmount,
    totalAmount
  });

  if (!milestones || milestones.length === 0) {
    console.log('MilestoneProgressCard: No milestones, returning null');
    return null;
  }

  const completionPercent = parseFloat(completionPercentage);
  
  // Find milestones that need revision (have feedback from admin)
  const milestonesNeedingRevision = milestones.filter(m => 
    m.status === 'in_progress' && 
    m.reviewer_feedback && 
    m.reviewer_feedback.trim().length > 0
  );
  
  // Find milestones actively being worked on (no feedback yet)
  const activeMilestonesInProgress = milestones.filter(m => 
    m.status === 'in_progress' && 
    (!m.reviewer_feedback || m.reviewer_feedback.trim().length === 0)
  );
  
  const revisionRequestedMilestone = milestonesNeedingRevision[0];
  const activeMilestone = activeMilestonesInProgress[0];
  
  console.log('🔍 Milestone Analysis:');
  console.log('  Milestones needing revision:', milestonesNeedingRevision.length, milestonesNeedingRevision.map(m => ({
    number: m.milestone_number,
    feedback: m.reviewer_feedback?.substring(0, 50)
  })));
  console.log('  Active milestones (no revision):', activeMilestonesInProgress.length, activeMilestonesInProgress.map(m => m.milestone_number));
  console.log('  Selected revision milestone:', revisionRequestedMilestone?.milestone_number);
  console.log('  Selected active milestone:', activeMilestone?.milestone_number);

  return (
    <>
      <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900">
            Milestone Progress
          </h4>
          <span className="text-sm text-gray-600">
            {milestones.filter(m => m.status === 'approved').length} / {milestones.length} Completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Overall Progress</span>
            <span className="font-medium">{completionPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Payment Info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Paid Out</p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {parseFloat(paidAmount).toFixed(4)} ETH
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Remaining</p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {(parseFloat(totalAmount) - parseFloat(paidAmount)).toFixed(4)} ETH
            </p>
          </div>
        </div>

        {/* Action Banner for Active Milestone */}
        {(activeMilestone || revisionRequestedMilestone) && (
          <div className={`mb-4 rounded-lg p-4 ${
            revisionRequestedMilestone 
              ? 'bg-gradient-to-r from-orange-500 to-red-500' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          } text-white`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className={`w-5 h-5 ${revisionRequestedMilestone ? 'animate-pulse' : ''}`} />
                  <p className="font-semibold text-sm">
                    {revisionRequestedMilestone ? 'Revision Requested by Admin' : 'Ready to Submit'}
                  </p>
                </div>
                <p className="text-xs opacity-90 mb-2">
                  {revisionRequestedMilestone 
                    ? `Milestone ${revisionRequestedMilestone.milestone_number}: ${revisionRequestedMilestone.title}`
                    : `Milestone ${activeMilestone?.milestone_number}: ${activeMilestone?.title}`
                  }
                </p>
                {revisionRequestedMilestone?.reviewer_feedback && (
                  <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Admin Feedback:
                    </p>
                    <p className="text-xs opacity-95 leading-relaxed whitespace-pre-line">
                      {revisionRequestedMilestone.reviewer_feedback}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedMilestone(revisionRequestedMilestone || activeMilestone!)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap ${
                  revisionRequestedMilestone
                    ? 'bg-white text-orange-600 hover:bg-gray-100'
                    : 'bg-white text-blue-600 hover:bg-gray-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                {revisionRequestedMilestone ? 'Resubmit' : 'Submit Proof'}
              </button>
            </div>
          </div>
        )}

        {/* Milestone List */}
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`bg-white rounded-lg p-3 border ${
                milestone.status === 'in_progress' && milestone.reviewer_feedback
                  ? 'border-orange-300 bg-orange-50/50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {getStatusIcon(milestone.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {milestone.milestone_number}. {milestone.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {parseFloat(milestone.amount).toFixed(4)} {milestone.currency}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusColor(milestone.status)}`}>
                  {milestone.status.replace('_', ' ')}
                </span>
              </div>
              
              {/* Show feedback for in_progress milestones that had revision requested */}
              {milestone.status === 'in_progress' && milestone.reviewer_feedback && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-orange-800 mb-1">Admin Feedback:</p>
                      <p className="text-xs text-orange-700 line-clamp-2">
                        {milestone.reviewer_feedback}
                      </p>
                      <button
                        onClick={() => setSelectedMilestone(milestone)}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium mt-1"
                      >
                        View full feedback & resubmit →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View Details Link */}
        <div className="mt-4 text-center">
          <a
            href={`/grant/${grantId}/milestones`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Detailed Milestone Tracker →
          </a>
        </div>
      </div>

      {/* Submit Proof Modal */}
      {selectedMilestone && (
        <SubmitProofOfWorkForm
          milestone={selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          onSuccess={() => {
            // Optionally refresh milestone data
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
