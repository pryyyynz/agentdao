"use client";

import { Grant } from "@/types";
import Link from "next/link";
import {
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  ExternalLink,
  Github,
  Globe,
} from "lucide-react";
import { getStatusColor, formatEther, formatDate, shortenAddress } from "@/lib/utils";

interface GrantCardProps {
  grant: Grant;
}

export default function GrantCard({ grant }: GrantCardProps) {
  return (
    <Link href={`/grant/${grant.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {grant.title}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  grant.status
                )}`}
              >
                {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {grant.description}
            </p>
          </div>
          <div className="ml-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Requested</p>
              <p className="text-sm font-semibold text-gray-900">
                {parseFloat(grant.requested_amount).toFixed(2)} ETH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="text-sm font-medium text-gray-700">
                {formatDate(grant.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Applicant</p>
              <p className="text-sm font-mono text-gray-700">
                {shortenAddress(grant.applicant_address)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-gray-400 text-xs">ID</div>
            <div>
              <p className="text-xs text-gray-500">Grant ID</p>
              <p className="text-sm font-medium text-gray-700">
                #{grant.id}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Metadata */}
        {grant.metadata && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            {grant.metadata.category && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Category:</span>
                <span className="text-xs font-medium text-gray-900 capitalize">
                  {grant.metadata.category}
                </span>
              </div>
            )}
            {grant.metadata.duration_months && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Duration:</span>
                <span className="text-xs font-medium text-gray-900">
                  {grant.metadata.duration_months} months
                </span>
              </div>
            )}
            {grant.metadata.team_size && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Team:</span>
                <span className="text-xs font-medium text-gray-900">
                  {grant.metadata.team_size} members
                </span>
              </div>
            )}

            {/* Links */}
            <div className="ml-auto flex items-center gap-2">
              {grant.metadata.github_repo && (
                <a
                  href={grant.metadata.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="GitHub Repository"
                >
                  <Github className="h-4 w-4 text-gray-600" />
                </a>
              )}
              {grant.metadata.website && (
                <a
                  href={grant.metadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Website"
                >
                  <Globe className="h-4 w-4 text-gray-600" />
                </a>
              )}
              {grant.ipfs_hash && (
                <a
                  href={`https://ipfs.io/ipfs/${grant.ipfs_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="View on IPFS"
                >
                  <ExternalLink className="h-4 w-4 text-gray-600" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
