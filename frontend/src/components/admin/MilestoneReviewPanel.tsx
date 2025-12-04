"use client";

import { useState } from "react";
import { usePendingReviews, useAdminDecision, useAgentReviews } from "@/hooks/useApi";
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Bot } from "lucide-react";

interface PendingReview {
  milestone_id: string;
  grant_id: string;
  milestone_number: number;
  milestone_title: string;
  status: string;
  amount: string;
  proof_of_work_url: string | null;
  submission_notes: string | null;
  submitted_at: string;
  agent_review_count: number;
  agent_approvals: number;
  agent_rejections: number;
  agent_revisions: number;
  avg_review_score: number | null;
  grant_title: string;
  grantee_id: string;
  total_grant_amount: string;
  hours_waiting: number;
}

export default function AdminMilestoneReviewPanel() {
  const { data: pendingReviews, isLoading, error } = usePendingReviews();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const adminDecision = useAdminDecision();

  const [decision, setDecision] = useState<"approved" | "rejected" | "revision_requested">("approved");
  const [feedback, setFeedback] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDecision = async (milestoneId: string) => {
    if (!feedback.trim()) {
      alert("Please provide feedback for the grantee");
      return;
    }

    if (feedback.trim().length < 20) {
      alert("Admin feedback must be at least 20 characters long");
      return;
    }

    console.log("Submitting decision:", { milestoneId, decision, feedback });

    try {
      const result = await adminDecision.mutateAsync({
        milestoneId,
        decision: {
          decision,
          admin_feedback: feedback,
          override_agents: false,
          payment_authorized: decision === "approved",
        },
      });

      console.log("Decision submitted successfully:", result);

      // Show success message
      const decisionText = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "marked for revision";
      setSuccessMessage(`Decision submitted successfully! Milestone ${decisionText}.`);
      
      // Reset form
      setReviewingId(null);
      setFeedback("");
      setDecision("approved");
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      console.error("Error submitting decision - Full error:", error);
      console.error("Error response:", error?.response);
      console.error("Error message:", error?.message);
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to submit decision";
      alert(`Error: ${errorMessage}`);
    }
  };

  const getAgentConsensus = (review: PendingReview) => {
    if (review.agent_review_count === 0) return { text: "No reviews yet", color: "text-gray-500", icon: AlertTriangle };
    
    const total = review.agent_review_count;
    const approvalRate = (review.agent_approvals / total) * 100;
    
    if (approvalRate >= 67) return { text: "Approve", color: "text-green-600", icon: CheckCircle };
    if (approvalRate <= 33) return { text: "Reject", color: "text-red-600", icon: XCircle };
    return { text: "Revise", color: "text-orange-600", icon: AlertTriangle };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Milestone Reviews
        </h3>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">
            Failed to load pending reviews. Please try refreshing the page.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  if (!pendingReviews || pendingReviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Milestone Reviews
        </h3>
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">
            All milestones reviewed! No pending reviews at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Milestone Reviews
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {pendingReviews.length} milestone{pendingReviews.length !== 1 ? "s" : ""} awaiting admin decision
            </p>
          </div>
          <div className="px-4 py-2 bg-orange-100 rounded-lg">
            <span className="text-2xl font-bold text-orange-600">
              {pendingReviews.length}
            </span>
          </div>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-900">
                {successMessage}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {pendingReviews.map((review: PendingReview) => {
          const consensus = getAgentConsensus(review);
          const ConsensusIcon = consensus.icon;
          const isExpanded = expandedId === review.milestone_id;
          const isReviewing = reviewingId === review.milestone_id;

          return (
            <div key={review.milestone_id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-base font-semibold text-gray-900">
                      {review.grant_title}
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Milestone {review.milestone_number}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {review.milestone_title}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {parseFloat(review.amount).toFixed(4)} ETH
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Waiting</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {Math.floor(review.hours_waiting)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Agent Score</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {review.avg_review_score !== null ? `${Number(review.avg_review_score).toFixed(0)}%` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Consensus</p>
                      <p className={`text-sm font-semibold flex items-center gap-1 ${consensus.color}`}>
                        <ConsensusIcon className="w-4 h-4" />
                        {consensus.text}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {review.proof_of_work_url && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            Proof of Work
                          </p>
                          <a
                            href={review.proof_of_work_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {review.proof_of_work_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {review.submission_notes && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            Submission Notes
                          </p>
                          <p className="text-sm text-gray-600 whitespace-pre-line">
                            {review.submission_notes}
                          </p>
                        </div>
                      )}

                      {!isReviewing && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => setReviewingId(review.milestone_id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Make Decision
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isReviewing && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Decision
                        </label>
                        <div className="flex gap-2">
                          {[
                            { value: "approved", label: "Approve", color: "bg-green-600" },
                            { value: "revision_requested", label: "Request Revision", color: "bg-orange-600" },
                            { value: "rejected", label: "Reject", color: "bg-red-600" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setDecision(option.value as any)}
                              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                                decision === option.value
                                  ? option.color
                                  : "bg-gray-400 hover:bg-gray-500"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Feedback to Grantee * (minimum 20 characters)
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${
                            feedback.length > 0 && feedback.length < 20
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          }`}
                          placeholder="Provide detailed feedback about this milestone submission..."
                        />
                        <div className="flex justify-between items-center mt-1">
                          <p className={`text-xs ${
                            feedback.length < 20 ? "text-red-600" : "text-gray-500"
                          }`}>
                            {feedback.length} / 20 characters minimum
                          </p>
                        </div>
                      </div>

                      <AgentReviewNotes milestoneId={review.milestone_id} />

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(review.milestone_id)}
                          disabled={adminDecision.isPending}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          {adminDecision.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                          Submit Decision
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setFeedback("");
                            setDecision("approved");
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : review.milestone_id)}
                  className="ml-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AgentReviewNotesProps {
  milestoneId: string;
}

function AgentReviewNotes({ milestoneId }: AgentReviewNotesProps) {
  const { data: reviews, isLoading, error } = useAgentReviews(milestoneId);

  // Debug logging
  console.log('AgentReviewNotes - milestoneId:', milestoneId);
  console.log('AgentReviewNotes - isLoading:', isLoading);
  console.log('AgentReviewNotes - error:', error);
  console.log('AgentReviewNotes - reviews data:', reviews);
  console.log('AgentReviewNotes - reviews type:', typeof reviews);
  console.log('AgentReviewNotes - reviews isArray:', Array.isArray(reviews));

  if (isLoading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading agent review...</span>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Agent review fetch error:', error);
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Could not load agent review: {error?.message || 'Unknown error'}</span>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    console.warn('AgentReviewNotes - No reviews found. Reviews:', reviews);
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <Bot className="w-4 h-4" />
          <span className="text-sm">No agent review available yet</span>
        </div>
      </div>
    );
  }

  const review = reviews[0]; // Most recent review

  const recommendationColors = {
    approve: "bg-green-50 border-green-200 text-green-800",
    revise: "bg-yellow-50 border-yellow-200 text-yellow-800",
    reject: "bg-red-50 border-red-200 text-red-800",
  };

  const recommendationIcons = {
    approve: <CheckCircle className="w-5 h-5" />,
    revise: <AlertTriangle className="w-5 h-5" />,
    reject: <XCircle className="w-5 h-5" />,
  };

  // Normalize recommendation to lowercase
  const recommendation = (review.recommendation || 'approve').toLowerCase();
  const colorClass = recommendationColors[recommendation as keyof typeof recommendationColors] || "bg-gray-50 border-gray-200 text-gray-800";
  const icon = recommendationIcons[recommendation as keyof typeof recommendationIcons] || <Bot className="w-5 h-5" />;

  return (
    <div className={`rounded-lg p-4 border ${colorClass}`}>
      <div className="flex items-start gap-3 mb-3">
        {icon}
        <div className="flex-1">
          <h4 className="font-semibold mb-1">
            Agent Recommendation: {recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}
          </h4>
          <p className="text-sm opacity-90">
            Reviewed by {review.agent_name || 'Agent'} on {formatDate(review.reviewed_at)}
          </p>
        </div>
        <div className="text-sm font-medium">
          Score: {review.review_score || 0}/100
        </div>
      </div>

      <div className="space-y-3 text-sm">
        {review.feedback && (
          <div>
            <p className="font-medium mb-1">Summary:</p>
            <p className="opacity-90">{review.feedback}</p>
          </div>
        )}

        {review.strengths && Array.isArray(review.strengths) && review.strengths.length > 0 && (
          <div>
            <p className="font-medium mb-1">Strengths:</p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              {review.strengths.map((strength: string, idx: number) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {review.weaknesses && Array.isArray(review.weaknesses) && review.weaknesses.length > 0 && (
          <div>
            <p className="font-medium mb-1">Areas for Improvement:</p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              {review.weaknesses.map((weakness: string, idx: number) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        )}

        {review.suggestions && Array.isArray(review.suggestions) && review.suggestions.length > 0 && (
          <div>
            <p className="font-medium mb-1">Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              {review.suggestions.map((suggestion: string, idx: number) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {(review.quality_rating || review.documentation_rating || review.deliverables_met !== undefined) && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-current opacity-30">
            {review.deliverables_met !== undefined && (
              <div>
                <p className="font-medium">Deliverables</p>
                <p className="text-lg">{review.deliverables_met ? '✓' : '✗'}</p>
              </div>
            )}
            {review.quality_rating !== undefined && (
              <div>
                <p className="font-medium">Quality</p>
                <p className="text-lg">{review.quality_rating}/100</p>
              </div>
            )}
            {review.documentation_rating !== undefined && (
              <div>
                <p className="font-medium">Documentation</p>
                <p className="text-lg">{review.documentation_rating}/100</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
