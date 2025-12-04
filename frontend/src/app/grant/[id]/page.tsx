"use client";

import { useParams, useRouter } from "next/navigation";
import { useGrant, useEvaluations, useMilestones, useAgentActivities } from "@/hooks/useApi";
import { PageLayout } from "@/components/PageLayout";
import GrantOverview from "@/components/grant-detail/GrantOverview";
import EvaluationResults from "@/components/grant-detail/EvaluationResults";
import VotingBreakdown from "@/components/grant-detail/VotingBreakdown";
import MilestoneTracker from "@/components/grant-detail/MilestoneTracker";
import EventTimeline from "@/components/grant-detail/EventTimeline";
import ExportActions from "@/components/grant-detail/ExportActions";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function GrantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grantId = parseInt(params?.id as string);

  const { data: grant, isLoading: loadingGrant, error: grantError } = useGrant(grantId);
  const { data: evaluations, isLoading: loadingEvaluations } = useEvaluations(grantId);
  // Use grant_id (UUID) for milestone fetching if available, fallback to integer ID
  const { data: milestones, isLoading: loadingMilestones, refetch: refetchMilestones } = useMilestones(
    grant?.grant_id || grantId,
    { enabled: !!grant }
  );
  const { data: allActivities } = useAgentActivities();

  // Debug logging
  console.log('Grant Detail Page:', {
    grantId,
    grantUuid: grant?.grant_id,
    grantStatus: grant?.status,
    milestones,
    milestonesArray: milestones?.milestones,
    milestonesCount: milestones?.milestones?.length,
    loadingMilestones
  });

  // Filter activities for this grant
  const activities = useMemo(() => {
    if (!allActivities) return [];
    return allActivities.filter((a) => a.grant_id === grantId);
  }, [allActivities, grantId]);

  if (isNaN(grantId)) {
    return (
      <PageLayout title="Invalid Grant">
        <div className="text-center py-12">
          <p className="text-gray-600 ">Invalid grant ID</p>
          <Link
            href="/grants"
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700 "
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grants
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (loadingGrant) {
    return (
      <PageLayout title="Loading Grant...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 ">
            Loading grant details...
          </span>
        </div>
      </PageLayout>
    );
  }

  if (grantError || !grant) {
    return (
      <PageLayout title="Grant Not Found">
        <div className="text-center py-12">
          <p className="text-gray-600  mb-4">
            Grant not found or error loading data
          </p>
          <Link
            href="/grants"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 "
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grants
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Grant #${grant.id}`}
      description="Complete grant details, evaluations, and progress tracking"
    >
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/pipeline"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900  :text-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Link>
      </div>

      {/* Grant Overview */}
      <div className="mb-8">
        <GrantOverview grant={grant} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column - Evaluations & Voting */}
        <div className="lg:col-span-2 space-y-8">
          <EvaluationResults evaluations={evaluations || []} />
          <VotingBreakdown evaluations={evaluations || []} />
        </div>

        {/* Right Column - Timeline */}
        <div className="space-y-8">
          <EventTimeline
            activities={activities}
            evaluations={evaluations || []}
            grantCreatedAt={grant.created_at}
          />
        </div>
      </div>

      {/* Milestones Section */}
      {(grant.status === "approved" || grant.status === "active" || grant.status === "completed") && (
        <div className="mb-8">
          {loadingMilestones ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading milestones...</span>
              </div>
            </div>
          ) : (
            <MilestoneTracker 
              milestones={milestones?.milestones || []} 
              onRefetch={() => refetchMilestones()}
            />
          )}
        </div>
      )}

      {/* Export Actions */}
      <div className="mb-8">
        <ExportActions
          grant={grant}
          evaluations={evaluations || []}
          activities={activities}
        />
      </div>
    </PageLayout>
  );
}
