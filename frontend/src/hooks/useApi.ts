import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Grant,
  GrantSubmission,
  Evaluation,
  AgentActivity,
  DashboardStats,
  Milestone,
  MilestoneList,
  ApiResponse,
  PaginatedResponse,
} from "@/types";

// Query Keys
export const QUERY_KEYS = {
  grants: "grants",
  grant: (id: number) => ["grant", id],
  evaluations: (grantId: number) => ["evaluations", grantId],
  milestones: (grantIdOrUuid: number | string) => ["milestones", String(grantIdOrUuid)],
  activities: "activities",
  stats: "stats",
};

// Fetch all grants (filtered by user if authenticated)
export function useGrants() {
  return useQuery<Grant[]>({
    queryKey: [QUERY_KEYS.grants],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Grant[]>>("/api/v1/grants");
      // Backend now filters by user automatically, but handle both response formats
      if (Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // Handle paginated response
      if (response.data.data?.data) {
        return response.data.data.data;
      }
      return [];
    },
  });
}

// Fetch single grant
export function useGrant(id: number) {
  return useQuery<Grant>({
    queryKey: QUERY_KEYS.grant(id),
    queryFn: async () => {
      const response = await api.get<ApiResponse<Grant>>(`/api/v1/grants/${id}`);
      if (!response.data.data) {
        throw new Error("Grant not found");
      }
      return response.data.data;
    },
    enabled: !!id,
  });
}

// Fetch grant evaluations
export function useEvaluations(grantId: number) {
  return useQuery<Evaluation[]>({
    queryKey: QUERY_KEYS.evaluations(grantId),
    queryFn: async () => {
      const response = await api.get<ApiResponse<Evaluation[]>>(
        `/api/v1/grants/${grantId}/evaluations`
      );
      return response.data.data || [];
    },
    enabled: !!grantId,
  });
}

// Fetch agent activities
export function useAgentActivities(limit: number = 50) {
  return useQuery<AgentActivity[]>({
    queryKey: [QUERY_KEYS.activities, limit],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AgentActivity[]>>(
        `/api/v1/grants/activities?limit=${limit}`
      );
      return response.data.data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
}

// Fetch dashboard stats
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: [QUERY_KEYS.stats],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DashboardStats>>("/api/v1/grants/stats/overview");
      return (
        response.data.data || {
          total_grants: 0,
          pending_grants: 0,
          approved_grants: 0,
          rejected_grants: 0,
          total_funded: "0",
          active_agents: 0,
        }
      );
    },
  });
}

// Submit grant mutation
export function useSubmitGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GrantSubmission) => {
      const response = await api.post<ApiResponse<Grant>>("/api/v1/grants", data);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate grants query to refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.grants] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stats] });
    },
  });
}

// Update grant status mutation
export function useUpdateGrantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await api.patch<ApiResponse<Grant>>(`/api/v1/grants/${id}`, {
        status,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate specific grant and list
      if (data) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.grant(data.id) });
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.grants] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stats] });
    },
  });
}

// Fetch grants by applicant
export function useMyGrants(applicantAddress: string) {
  return useQuery<Grant[]>({
    queryKey: ["my-grants", applicantAddress],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Grant[]>>(
        `/api/v1/grants?applicant=${applicantAddress}`
      );
      return response.data.data || [];
    },
    enabled: !!applicantAddress,
  });
}

// Fetch grant milestones
export function useMilestones(
  grantIdOrUuid: number | string,
  options?: { enabled?: boolean }
) {
  return useQuery<MilestoneList>({
    queryKey: QUERY_KEYS.milestones(grantIdOrUuid),
    queryFn: async () => {
      console.log('useMilestones: Fetching for grant:', grantIdOrUuid);
      // Use the provided ID/UUID directly - backend accepts both
      const response = await api.get<MilestoneList>(
        `/api/v1/milestones/grant/${grantIdOrUuid}`
      );
      console.log('useMilestones: Response received:', response.data);
      // Backend returns milestone data directly, not wrapped in ApiResponse
      return response.data || {
        milestones: [],
        grant_id: String(grantIdOrUuid),
        total_milestones: 0,
        completed_milestones: 0,
        total_amount: '0',
        paid_amount: '0',
        completion_percentage: '0'
      };
    },
    enabled: options?.enabled !== false && !!grantIdOrUuid,
  });
}

// Submit milestone proof of work
export function useSubmitMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      proofOfWorkUrl,
      submissionNotes,
    }: {
      milestoneId: string;
      proofOfWorkUrl: string;
      submissionNotes: string;
    }) => {
      const response = await api.post(
        `/api/v1/milestones/${milestoneId}/submit`,
        {
          proof_of_work_url: proofOfWorkUrl,
          submission_notes: submissionNotes,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate milestones queries to refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.milestones] });
    },
  });
}

// ============================================================================
// REVIEW SYSTEM HOOKS
// ============================================================================

export function usePendingReviews() {
  return useQuery({
    queryKey: ["pendingReviews"],
    queryFn: async () => {
      const response = await api.get("/api/v1/reviews/admin/pending");
      return response.data;
    },
  });
}

export function useAdminDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      decision,
    }: {
      milestoneId: string;
      decision: {
        decision: string;
        admin_feedback: string;
        override_agents: boolean;
        payment_authorized: boolean;
      };
    }) => {
      const response = await api.post(
        `/api/v1/reviews/admin/${milestoneId}`,
        decision
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["pendingReviews"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.milestones] });
    },
  });
}

export function useAgentReviews(milestoneId: string) {
  return useQuery({
    queryKey: ["agentReviews", milestoneId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/reviews/agent/milestone/${milestoneId}`);
      return response.data;
    },
    enabled: !!milestoneId,
  });
}
