"use client";

import { TreasuryInfo } from "@/types";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, AlertCircle } from "lucide-react";

interface TreasuryManagementProps {
  treasury: TreasuryInfo;
}

export default function TreasuryManagement({ treasury }: TreasuryManagementProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Wallet className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Treasury Management
            </h2>
            <p className="text-sm text-gray-500">
              Monitor and manage DAO treasury
            </p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 mb-1">Blockchain Treasury Balance</p>
          <p className="text-2xl font-bold text-green-900">
            {treasury.blockchain_balance} ETH
          </p>
          <p className="text-xs text-green-600 mt-1">On-chain GrantTreasury contract</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Total Approved Grants</p>
          <p className="text-2xl font-bold text-blue-900">
            {treasury.total_approved_grants} ETH
          </p>
          <p className="text-xs text-blue-600 mt-1">Sum of all approved grant requests</p>
        </div>
      </div>

      {/* Pending Transfers */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-semibold text-gray-900">
            Pending Transfers ({treasury.pending_transfers.length})
          </h3>
        </div>
        <div className="space-y-3">
          {treasury.pending_transfers.map((transfer, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {transfer.reason}
                </p>
                <p className="text-xs text-gray-500">
                  To: {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {transfer.amount} ETH
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(transfer.scheduled_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Recent Transactions
        </h3>
        <div className="space-y-2">
          {treasury.recent_transactions.map((tx, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                {tx.type === 'deposit' ? (
                  <ArrowDownLeft className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {tx.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-8)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  tx.type === 'deposit' ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount} ETH
                </p>
                <div className="flex items-center space-x-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    tx.status === 'confirmed' ? 'bg-green-500' :
                    tx.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {tx.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
