"use client";

import { useState } from "react";
import { PendingAction } from "@/types";
import { useApproveAction, useRejectAction } from "@/hooks/useAdminData";
import { useGrant } from "@/hooks/useApi";
import { Clock, TrendingUp, CheckCircle, XCircle, AlertTriangle, ExternalLink, ArrowLeft, FileText } from "lucide-react";
import GrantDetailModal from "./GrantDetailModal";

interface PendingActionsQueueProps {
  actions: PendingAction[];
}

export default function PendingActionsQueue({ actions }: PendingActionsQueueProps) {
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();
  const [selectedGrantId, setSelectedGrantId] = useState<number | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const getPriorityColor = (priority: PendingAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Sort by priority (critical > high > medium > low)
  const sortedActions = [...actions].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const handleViewDetails = (action: PendingAction) => {
    const grantId = action.metadata?.grant_id;
    if (grantId) {
      setSelectedGrantId(parseInt(grantId));
      setSelectedActionId(action.action_id);
    }
  };

  const handleApprove = (actionId: string) => {
    approveAction.mutate(actionId);
    setSelectedGrantId(null);
    setSelectedActionId(null);
  };

  const handleReject = (actionId: string) => {
    rejectAction.mutate(actionId);
    setSelectedGrantId(null);
    setSelectedActionId(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Actions ({actions.length})
            </h2>
            <p className="text-sm text-gray-500">
              Actions awaiting admin approval
            </p>
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="divide-y divide-gray-200">
        {sortedActions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending actions</p>
          </div>
        ) : (
          sortedActions.map((action) => {
            const votesPercentage = (action.current_votes / action.requires_votes) * 100;
            const timeRemaining = new Date(action.deadline).getTime() - Date.now();
            const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
            
            return (
              <div key={action.action_id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(action.priority)}`}>
                        {action.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {action.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">
                      {action.description}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Proposed by: {action.proposed_by.slice(0, 6)}...{action.proposed_by.slice(-4)}</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{hoursRemaining}h remaining</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vote Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Approval Progress
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {action.current_votes} / {action.requires_votes} votes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(votesPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleViewDetails(action)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                  <button
                    onClick={() => handleApprove(action.action_id)}
                    disabled={approveAction.isPending}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(action.action_id)}
                    disabled={rejectAction.isPending}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Grant Detail Modal */}
      {selectedGrantId && selectedActionId && (
        <GrantDetailModal
          grantId={selectedGrantId}
          actionId={selectedActionId}
          onClose={() => {
            setSelectedGrantId(null);
            setSelectedActionId(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          isApproving={approveAction.isPending}
          isRejecting={rejectAction.isPending}
        />
      )}
    </div>
  );
}
