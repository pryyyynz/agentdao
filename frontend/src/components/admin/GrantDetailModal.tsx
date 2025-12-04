"use client";

import { useGrant } from "@/hooks/useApi";
import { 
  X, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  Users, 
  Globe, 
  Github, 
  Twitter,
  MessageCircle,
  Loader2,
  FileText,
  TrendingUp
} from "lucide-react";

interface GrantDetailModalProps {
  grantId: number;
  actionId: string;
  onClose: () => void;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export default function GrantDetailModal({
  grantId,
  actionId,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: GrantDetailModalProps) {
  const { data: grant, isLoading, error } = useGrant(grantId);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8">
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load grant details</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const metadata = grant.metadata || {};
  
  // Parse detailed proposal if it's a JSON string
  let detailedProposal: any = {};
  try {
    if (typeof metadata === 'object' && 'detailed_proposal' in metadata) {
      const proposalStr = (metadata as any).detailed_proposal;
      if (typeof proposalStr === 'string') {
        detailedProposal = JSON.parse(proposalStr);
      } else {
        detailedProposal = proposalStr || {};
      }
    }
  } catch (e) {
    console.error("Failed to parse detailed proposal:", e);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "under_evaluation":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900">{grant.title}</h2>
              </div>
              <div className="flex items-center space-x-3 ml-14">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(grant.status)}`}>
                  {grant.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="text-sm text-gray-500">
                  Grant ID: {grant.id}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Key Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-700 mb-1">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Requested Amount</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {parseFloat(grant.requested_amount).toFixed(4)} ETH
              </p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-purple-700 mb-1">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {metadata.duration_months || 'N/A'} months
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-700 mb-1">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Team Size</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {metadata.team_size || detailedProposal.team?.length || 'N/A'} members
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{grant.description}</p>
          </div>

          {/* Applicant Info */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Applicant Information</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">Wallet Address:</span>
                <span className="font-mono text-sm text-gray-900">{grant.applicant_address}</span>
              </div>
              {metadata.category && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <span className="text-sm text-gray-900">{metadata.category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          {(metadata.website || metadata.github_repo || metadata.twitter || metadata.discord) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Links</h3>
              <div className="grid grid-cols-2 gap-3">
                {metadata.website && (
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Globe className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-900">Website</span>
                    <ExternalLink className="h-3 w-3 text-gray-500 ml-auto" />
                  </a>
                )}
                {metadata.github_repo && (
                  <a
                    href={metadata.github_repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Github className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-900">GitHub</span>
                    <ExternalLink className="h-3 w-3 text-gray-500 ml-auto" />
                  </a>
                )}
                {metadata.twitter && (
                  <a
                    href={metadata.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Twitter className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-900">Twitter</span>
                    <ExternalLink className="h-3 w-3 text-gray-500 ml-auto" />
                  </a>
                )}
                {metadata.discord && (
                  <a
                    href={metadata.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-900">Discord</span>
                    <ExternalLink className="h-3 w-3 text-gray-500 ml-auto" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Milestones */}
          {detailedProposal.milestones && detailedProposal.milestones.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Milestones</h3>
              <div className="space-y-3">
                {detailedProposal.milestones.map((milestone: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Milestone {idx + 1}: {milestone.title}
                      </h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {milestone.fundingPercentage}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                    {milestone.deliverables && (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Deliverables:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {(Array.isArray(milestone.deliverables) 
                            ? milestone.deliverables 
                            : milestone.deliverables.split('\n')
                          ).map((deliverable: string, i: number) => (
                            <li key={i}>{deliverable}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team */}
          {detailedProposal.team && detailedProposal.team.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Team Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detailedProposal.team.map((member: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{member.role}</p>
                    {member.experience && (
                      <p className="text-sm text-gray-700">{member.experience}</p>
                    )}
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 mt-2"
                      >
                        <Github className="h-3 w-3" />
                        <span>GitHub Profile</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IPFS Link */}
          {grant.ipfs_hash && (
            <div className="mb-6">
              <a
                href={`https://ipfs.io/ipfs/${grant.ipfs_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">View Full Proposal on IPFS</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Back to List
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => onReject(actionId)}
                disabled={isRejecting || isApproving}
                className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Reject Grant</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onApprove(actionId)}
                disabled={isApproving || isRejecting}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve Grant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
