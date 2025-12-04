"use client";

import { Grant } from "@/types";
import GrantCard from "./GrantCard";
import { FileText } from "lucide-react";

interface GrantListProps {
  grants: Grant[];
}

export default function GrantList({ grants }: GrantListProps) {
  if (grants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No grants found
        </h3>
        <p className="text-gray-600">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grants.map((grant) => (
        <GrantCard key={grant.id} grant={grant} />
      ))}
    </div>
  );
}
