"use client";

import { Grant } from "@/types";
import { Download, FileJson, FileText, ExternalLink } from "lucide-react";
import { useState } from "react";

interface ExportActionsProps {
  grant: Grant;
  evaluations: any[];
  activities: any[];
}

export default function ExportActions({
  grant,
  evaluations,
  activities,
}: ExportActionsProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadJSON = () => {
    const data = {
      grant,
      evaluations,
      activities,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grant-${grant.id}-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadReport = () => {
    setDownloading(true);

    const averageScore =
      evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;

    const report = `
GRANT EVALUATION REPORT
========================

Grant ID: #${grant.id}
Title: ${grant.title}
Status: ${grant.status}
Requested Amount: ${grant.requested_amount} ETH
Applicant: ${grant.applicant_address}
Submitted: ${new Date(grant.created_at).toLocaleString()}

DESCRIPTION
-----------
${grant.description}

PROJECT DETAILS
---------------
${grant.metadata?.category ? `Category: ${grant.metadata.category}` : ""}
${grant.metadata?.duration_months ? `Duration: ${grant.metadata.duration_months} months` : ""}
${grant.metadata?.team_size ? `Team Size: ${grant.metadata.team_size} members` : ""}

EVALUATION SUMMARY
------------------
Total Evaluations: ${evaluations.length}
Average Score: ${averageScore.toFixed(1)}/100
Approved: ${evaluations.filter((e) => e.score >= 6).length}
Rejected: ${evaluations.filter((e) => e.score < 6).length}

INDIVIDUAL EVALUATIONS
----------------------
${evaluations
  .map(
    (e) => `
${e.agent_type.replace(/_/g, " ").toUpperCase()}
Score: ${e.score.toFixed(1)}/100
Date: ${new Date(e.created_at).toLocaleString()}
${e.vote_tx_hash ? `Transaction: ${e.vote_tx_hash}` : ""}

Reasoning:
${e.reasoning}
`
  )
  .join("\n" + "-".repeat(50) + "\n")}

ACTIVITY LOG
------------
${activities
  .map(
    (a) => `
[${new Date(a.timestamp).toLocaleString()}] ${a.action}
Agent: ${a.agent_type}
${a.message}
`
  )
  .join("\n")}

---
Report generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grant-${grant.id}-report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => setDownloading(false), 500);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Export & Documentation
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Download JSON */}
        <button
          onClick={downloadJSON}
          className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <FileJson className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">
                Download JSON
              </p>
              <p className="text-xs text-gray-600">
                Complete data export
              </p>
            </div>
          </div>
          <Download className="h-5 w-5 text-blue-600 group-hover:translate-y-1 transition-transform" />
        </button>

        {/* Download Report */}
        <button
          onClick={downloadReport}
          disabled={downloading}
          className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600 rounded-lg group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">
                Download Report
              </p>
              <p className="text-xs text-gray-600">
                Formatted text report
              </p>
            </div>
          </div>
          <Download className="h-5 w-5 text-green-600 group-hover:translate-y-1 transition-transform" />
        </button>

        {/* View on IPFS */}
        {grant.ipfs_hash && (
          <a
            href={`https://ipfs.io/ipfs/${grant.ipfs_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                <ExternalLink className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">
                  View on IPFS
                </p>
                <p className="text-xs text-gray-600">
                  Full application
                </p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-purple-600" />
          </a>
        )}

        {/* Share Link */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
          }}
          className="flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-600 rounded-lg group-hover:scale-110 transition-transform">
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">
                Copy Link
              </p>
              <p className="text-xs text-gray-600">
                Share this grant
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Note:</strong> All data is exported as-is from the current state. 
          JSON files can be imported into analysis tools. Reports are formatted for human reading.
          {grant.ipfs_hash && " The IPFS link provides permanent access to the original application."}
        </p>
      </div>
    </div>
  );
}
