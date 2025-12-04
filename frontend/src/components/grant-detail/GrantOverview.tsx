"use client";

import { Grant } from "@/types";
import { Calendar, DollarSign, User, Hash, Tag, Clock, Users, Globe, Github, Twitter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GrantOverviewProps {
  grant: Grant;
}

export default function GrantOverview({ grant }: GrantOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "evaluating":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {grant.title}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {grant.description}
          </p>
        </div>
        <div className="ml-6">
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
              grant.status
            )}`}
          >
            {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Requested Amount</p>
            <p className="text-xl font-bold text-gray-900">
              {grant.requested_amount} ETH
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Hash className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Grant ID</p>
            <p className="text-xl font-bold text-gray-900">
              #{grant.id}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Submitted</p>
            <p className="text-sm font-semibold text-gray-900">
              {new Date(grant.created_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(grant.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="p-2 bg-orange-100 rounded-lg">
            <User className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Applicant</p>
            <p className="text-xs font-mono text-gray-900 break-all">
              {grant.applicant_address.slice(0, 6)}...{grant.applicant_address.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* Project Details */}
      {grant.metadata && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Project Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {grant.metadata.category && (
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900">
                    {grant.metadata.category}
                  </p>
                </div>
              </div>
            )}

            {grant.metadata.duration_months && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-medium text-gray-900">
                    {grant.metadata.duration_months} months
                  </p>
                </div>
              </div>
            )}

            {grant.metadata.team_size && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Team Size</p>
                  <p className="text-sm font-medium text-gray-900">
                    {grant.metadata.team_size} members
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* External Links */}
          {(grant.metadata.website || grant.metadata.github_repo || grant.metadata.twitter) && (
            <div className="flex flex-wrap gap-3">
              {grant.metadata.website && (
                <a
                  href={grant.metadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">Website</span>
                </a>
              )}

              {grant.metadata.github_repo && (
                <a
                  href={grant.metadata.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span className="text-sm font-medium">GitHub</span>
                </a>
              )}

              {grant.metadata.twitter && (
                <a
                  href={`https://twitter.com/${grant.metadata.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                  <span className="text-sm font-medium">Twitter</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* IPFS Hash */}
      {grant.ipfs_hash && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Full Proposal on IPFS
              </p>
              <p className="text-xs text-gray-500">
                View the complete application details on IPFS
              </p>
            </div>
            <a
              href={`https://ipfs.io/ipfs/${grant.ipfs_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              View on IPFS
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
