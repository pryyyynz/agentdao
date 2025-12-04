"use client";

import { PageLayout } from "@/components/PageLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useGrants, useMilestones } from "@/hooks/useApi";
import { FileText, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { getStatusColor, formatEther, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import MilestoneProgressCard from "@/components/grant-detail/MilestoneProgressCard";

export default function GrantsPage() {
  return (
    <ProtectedRoute>
      <GrantsPageContent />
    </ProtectedRoute>
  );
}

function GrantsPageContent() {
  const { isAuthenticated } = useAuth();
  const { data: grants, isLoading } = useGrants();
  const [expandedGrantId, setExpandedGrantId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return null; // ProtectedRoute handles redirect
  }

  return (
    <PageLayout
      title="My Grants"
      description="View and manage your submitted grant proposals"
    >
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : grants && grants.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {grants.map((grant) => (
              <GrantItem 
                key={grant.id} 
                grant={grant}
                isExpanded={expandedGrantId === grant.id}
                onToggleExpand={() => 
                  setExpandedGrantId(expandedGrantId === grant.id ? null : grant.id)
                }
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              You haven't submitted any grants yet.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

interface GrantItemProps {
  grant: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function GrantItem({ grant, isExpanded, onToggleExpand }: GrantItemProps) {
  const { data: milestoneData, isLoading: milestonesLoading } = useMilestones(
    grant.grant_id || grant.id, // Use grant_id (UUID) if available, fallback to id
    { enabled: isExpanded && grant.has_milestones }
  );

  // Debug logging
  if (isExpanded && grant.has_milestones) {
    console.log('Grant expanded:', {
      grantId: grant.grant_id || grant.id,
      hasMilestones: grant.has_milestones,
      milestoneData,
      milestonesLoading
    });
  }

  return (
    <div className="border-b border-gray-200">
      <div className="p-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {grant.title}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  grant.status
                )}`}
              >
                {grant.status}
              </span>
              {grant.has_milestones && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Milestone-based
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {grant.description}
            </p>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div>
                <span className="text-gray-500">
                  Requested:
                </span>
                <span className="ml-2 font-semibold text-gray-900">
                  {parseFloat(grant.requested_amount).toFixed(2)} ETH
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  Submitted:
                </span>
                <span className="ml-2 text-gray-700">
                  {formatDate(grant.created_at)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="ml-4 flex items-center gap-3">
            <Link
              href={`/grant/${grant.id}`}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <span className="text-sm mr-2">View Details</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            
            {grant.has_milestones && (
              <button
                onClick={onToggleExpand}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label={isExpanded ? "Collapse milestones" : "Expand milestones"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expanded Milestone View */}
        {isExpanded && grant.has_milestones && (
          <>
            {milestonesLoading && (
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}
            {milestoneData && (
              <MilestoneProgressCard
                milestones={milestoneData.milestones}
                grantId={grant.id}
                completionPercentage={milestoneData.completion_percentage}
                paidAmount={milestoneData.paid_amount}
                totalAmount={milestoneData.total_amount}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
