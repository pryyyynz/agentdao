"use client";

import { useState } from "react";
import { useSubmitMilestone } from "@/hooks/useApi";
import { Milestone } from "@/types";
import { X, Upload, Loader2 } from "lucide-react";

interface SubmitProofOfWorkFormProps {
  milestone: Milestone;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SubmitProofOfWorkForm({
  milestone,
  onClose,
  onSuccess,
}: SubmitProofOfWorkFormProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const submitMutation = useSubmitMilestone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofUrl.trim()) {
      alert("Please provide a proof of work URL");
      return;
    }

    if (submissionNotes.trim().length < 50) {
      alert("Submission notes must be at least 50 characters. Please provide more details about your work.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        milestoneId: milestone.milestone_id,
        proofOfWorkUrl: proofUrl.trim(),
        submissionNotes: submissionNotes.trim(),
      });

      // Only call success handlers after mutation succeeds
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      // Show more detailed error message
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to submit proof of work";
      alert(`Submission failed: ${errorMessage}`);
      console.error("Submission error:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Submit Proof of Work
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Milestone {milestone.milestone_number}: {milestone.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Milestone Details */}
        <div className="p-6 bg-blue-50 border-b border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Amount</p>
              <p className="font-semibold text-gray-900 mt-1">
                {parseFloat(milestone.amount).toFixed(4)} {milestone.currency}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Estimated Completion</p>
              <p className="font-semibold text-gray-900 mt-1">
                {milestone.estimated_completion_date
                  ? new Date(milestone.estimated_completion_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
          </div>

          {milestone.deliverables && milestone.deliverables.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-600 text-sm mb-2">
                Expected Deliverables:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {milestone.deliverables.map((deliverable, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    {deliverable}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Proof of Work URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proof of Work URL <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Provide a link to your completed work (GitHub repo, IPFS link, documentation, etc.)
            </p>
            <div className="relative">
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://github.com/username/repo or ipfs://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <Upload className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Submission Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submission Notes <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({submissionNotes.trim().length}/50 characters minimum)
              </span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Describe what you accomplished, challenges faced, and how deliverables were met (minimum 50 characters)
            </p>
            <textarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Example: Completed all deliverables for this milestone. Implemented the core authentication system with JWT tokens, added user registration and login endpoints, created comprehensive unit tests achieving 95% coverage, and deployed to staging environment for testing..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          {/* Info Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Once submitted, your proof of work will be reviewed by agents. 
              You'll be notified when the review is complete. Payment will be released automatically 
              upon approval.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={submitMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending || !proofUrl.trim() || submissionNotes.trim().length < 50}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Proof of Work"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
