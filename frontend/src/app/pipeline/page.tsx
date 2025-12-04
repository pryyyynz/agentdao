"use client";

import { useState, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { useGrants, useDashboardStats } from "@/hooks/useApi";
import GrantList from "@/components/grants/GrantList";
import GrantFilters from "@/components/grants/GrantFilters";
import GrantStatistics from "@/components/grants/GrantStatistics";
import { Grant, GrantStatus } from "@/types";
import { Loader2 } from "lucide-react";

export type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "score-desc" | "score-asc";

export default function AllGrantsPage() {
  const { data: grants, isLoading } = useGrants();
  const { data: stats } = useDashboardStats();

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GrantStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  // Filter and sort grants
  const filteredGrants = useMemo(() => {
    if (!grants) return [];

    let filtered = [...grants];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (grant) =>
          grant.title.toLowerCase().includes(query) ||
          grant.description.toLowerCase().includes(query) ||
          grant.id.toString().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((grant) => grant.status === statusFilter);
    }

    // Amount filter
    if (minAmount) {
      filtered = filtered.filter(
        (grant) => parseFloat(grant.requested_amount) >= parseFloat(minAmount)
      );
    }
    if (maxAmount) {
      filtered = filtered.filter(
        (grant) => parseFloat(grant.requested_amount) <= parseFloat(maxAmount)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "amount-desc":
          return parseFloat(b.requested_amount) - parseFloat(a.requested_amount);
        case "amount-asc":
          return parseFloat(a.requested_amount) - parseFloat(b.requested_amount);
        default:
          return 0;
      }
    });

    return filtered;
  }, [grants, searchQuery, statusFilter, sortBy, minAmount, maxAmount]);

  return (
    <PageLayout
      title="Grant Pipeline"
      description="View and manage all grant applications"
    >
      {/* Statistics */}
      <GrantStatistics
        stats={stats}
        totalShown={filteredGrants.length}
        totalGrants={grants?.length || 0}
      />

      {/* Filters */}
      <GrantFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        maxAmount={maxAmount}
        setMaxAmount={setMaxAmount}
      />

      {/* Grant List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">
            Loading grants...
          </span>
        </div>
      ) : (
        <GrantList grants={filteredGrants} />
      )}
    </PageLayout>
  );
}
