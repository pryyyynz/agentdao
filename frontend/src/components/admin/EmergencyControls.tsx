"use client";

import { useState } from "react";
import { useEmergencyStop, usePauseSystem, useSystemStatus, useDeactivateEmergencyStop, useEmergencyWithdrawal, usePendingWithdrawals, useApproveWithdrawal } from "@/hooks/useAdminData";
import { AlertTriangle, StopCircle, Pause, Shield, CheckCircle, XCircle, Play, DollarSign, ThumbsUp, ThumbsDown, Clock } from "lucide-react";

export default function EmergencyControls() {
  const [showStopModal, setShowStopModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const [pauseDuration, setPauseDuration] = useState(3600); // 1 hour in seconds
  const [pauseReason, setPauseReason] = useState("");
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");

  const emergencyStop = useEmergencyStop();
  const pauseSystem = usePauseSystem();
  const deactivateEmergencyStop = useDeactivateEmergencyStop();
  const emergencyWithdrawal = useEmergencyWithdrawal();
  const approveWithdrawal = useApproveWithdrawal();
  const { data: systemStatus, isLoading: statusLoading } = useSystemStatus();
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = usePendingWithdrawals();

  const handleEmergencyStop = async () => {
    try {
      await emergencyStop.mutateAsync(stopReason);
      setShowStopModal(false);
      setStopReason("");
    } catch (error) {
      console.error('Failed to activate emergency stop:', error);
      alert('Failed to activate emergency stop. Please try again.');
    }
  };

  const handlePauseSystem = async () => {
    try {
      const durationMinutes = Math.floor(pauseDuration / 60);
      const reason = pauseReason || `System paused for ${durationMinutes} minutes for maintenance`;
      await pauseSystem.mutateAsync({ paused: true, reason });
      setShowPauseModal(false);
      setPauseReason("");
    } catch (error) {
      console.error('Failed to pause system:', error);
      alert('Failed to pause system. Please try again.');
    }
  };

  const handleResumeSystem = async () => {
    try {
      await pauseSystem.mutateAsync({ 
        paused: false, 
        reason: "System resumed by admin" 
      });
    } catch (error) {
      console.error('Failed to resume system:', error);
      alert('Failed to resume system. Please try again.');
    }
  };

  const handleDeactivateEmergencyStop = async () => {
    try {
      await deactivateEmergencyStop.mutateAsync();
    } catch (error) {
      console.error('Failed to deactivate emergency stop:', error);
      alert('Failed to deactivate emergency stop. Please try again.');
    }
  };

  const handleEmergencyWithdrawal = async () => {
    try {
      const result = await emergencyWithdrawal.mutateAsync({
        recipient_address: withdrawalAddress,
        amount_eth: withdrawalAmount,
        reason: withdrawalReason,
      });
      
      // Show success
      alert(
        `Emergency withdrawal request created!\n\n` +
        `Request ID: ${result.request_id}\n` +
        `Amount: ${result.amount_eth} ETH\n` +
        `Status: Pending approval (${result.current_approvals}/${result.required_approvals})\n\n` +
        `This request requires ${result.required_approvals} admin approvals before execution.`
      );
      
      setShowWithdrawalModal(false);
      setWithdrawalAddress("");
      setWithdrawalAmount("");
      setWithdrawalReason("");
    } catch (error: any) {
      console.error('Failed to create withdrawal request:', error);
      alert(`Failed to create withdrawal request: ${error.message}`);
    }
  };

  const handleApprove = async (withdrawalId: number) => {
    const comment = prompt("Enter approval comment (optional):");
    if (comment === null) return; // User cancelled
    
    try {
      const result = await approveWithdrawal.mutateAsync({
        withdrawal_id: withdrawalId,
        approved: true,
        comment,
      });
      
      if (result.status === 'executed') {
        alert(
          `Withdrawal approved and executed!\n\n` +
          `Transaction: ${result.transaction_hash}\n` +
          `View on Etherscan: ${result.explorer_url}`
        );
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      alert(`Failed to approve: ${error.message}`);
    }
  };

  const handleReject = async (withdrawalId: number) => {
    const comment = prompt("Enter rejection reason:");
    if (!comment) return;
    
    try {
      await approveWithdrawal.mutateAsync({
        withdrawal_id: withdrawalId,
        approved: false,
        comment,
      });
      alert("Withdrawal request rejected");
    } catch (error: any) {
      alert(`Failed to reject: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-red-500">
      {/* Header */}
      <div className="p-6 border-b border-red-200 bg-red-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-900">
              Emergency Controls
            </h2>
            <p className="text-sm text-red-700">
              Critical system override functions
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="p-6 bg-yellow-50 border-b border-yellow-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900 mb-1">
              Critical Actions - Use With Extreme Caution
            </p>
            <p className="text-xs text-yellow-700">
              These actions will affect all system operations and may require consensus to reverse.
              All actions are logged and auditable.
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {!statusLoading && systemStatus && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Current System Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Operational:</span>
              <div className="flex items-center space-x-2">
                {systemStatus.operational ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Yes</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">No</span>
                  </>
                )}
              </div>
            </div>
            
            {systemStatus.system_paused && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Pause className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900">
                      System Paused
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      {systemStatus.pause_reason}
                    </p>
                    <button
                      onClick={handleResumeSystem}
                      disabled={pauseSystem.isPending}
                      className="mt-2 text-xs px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {pauseSystem.isPending ? 'Resuming...' : 'Resume System'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {systemStatus.emergency_stop && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <StopCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      Emergency Stop Active
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {systemStatus.emergency_stop_reason}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      All operations are suspended.
                    </p>
                    <button
                      onClick={handleDeactivateEmergencyStop}
                      disabled={deactivateEmergencyStop.isPending}
                      className="mt-2 flex items-center space-x-1 text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      <span>{deactivateEmergencyStop.isPending ? 'Deactivating...' : 'Deactivate Emergency Stop'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Withdrawal Requests */}
      {!withdrawalsLoading && pendingWithdrawals && pendingWithdrawals.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Pending Withdrawal Requests ({pendingWithdrawals.length})</span>
          </h3>
          <div className="space-y-3">
            {pendingWithdrawals.map((request: any) => (
              <div key={request.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900">
                      {request.amount_eth} ETH to {request.recipient_address.substring(0, 10)}...
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      {request.reason}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Created by: {request.created_by} • Approvals: {request.current_approvals}/{request.required_approvals}
                    </p>
                  </div>
                </div>
                
                {request.approvals && request.approvals.length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded text-xs">
                    <p className="font-medium text-gray-700 mb-1">Approvals:</p>
                    {request.approvals.map((approval: any, idx: number) => (
                      <p key={idx} className="text-gray-600">
                        • {approval.admin_user}: {approval.approved ? '✓ Approved' : '✗ Rejected'}
                        {approval.comment && ` - ${approval.comment}`}
                      </p>
                    ))}
                  </div>
                )}
                
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={approveWithdrawal.isPending}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 text-xs"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={approveWithdrawal.isPending}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 text-xs"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="p-6 space-y-4">
        {/* Emergency Stop */}
        <div className="p-4 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <StopCircle className="h-6 w-6 text-red-600 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Emergency Stop
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Immediately halt all system operations, agent evaluations, and fund transfers.
                  Use only in case of critical security issues or exploits.
                </p>
                <button
                  onClick={() => setShowStopModal(true)}
                  disabled={systemStatus?.emergency_stop}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StopCircle className="h-4 w-4" />
                  <span>Activate Emergency Stop</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pause System */}
        <div className="p-4 border border-orange-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Pause className="h-6 w-6 text-orange-600 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Pause System
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Temporarily pause new grant submissions and agent evaluations for maintenance.
                  Existing evaluations will continue.
                </p>
                <button
                  onClick={() => setShowPauseModal(true)}
                  disabled={systemStatus?.system_paused}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pause className="h-4 w-4" />
                  <span>Pause System</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Withdrawal */}
        <div className="p-4 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <DollarSign className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Emergency Withdrawal
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Withdraw funds from treasury to secure address. Requires 2 admin approvals before execution.
                  Only available when system is paused.
                </p>
                <button
                  onClick={() => setShowWithdrawalModal(true)}
                  disabled={!systemStatus?.system_paused && !systemStatus?.emergency_stop}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Create Withdrawal Request</span>
                </button>
                {!systemStatus?.system_paused && !systemStatus?.emergency_stop && (
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ System must be paused to create withdrawal requests
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Stop Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-red-900 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Confirm Emergency Stop</span>
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                This will immediately stop all system operations. This action is logged and may
                require multi-sig approval to reverse.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for emergency stop *
              </label>
              <textarea
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="Describe the critical issue requiring an emergency stop..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                rows={4}
                required
              />
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleEmergencyStop}
                  disabled={!stopReason || emergencyStop.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {emergencyStop.isPending ? 'Stopping...' : 'Confirm Stop'}
                </button>
                <button
                  onClick={() => {
                    setShowStopModal(false);
                    setStopReason("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause System Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Pause System
              </h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause duration
              </label>
              <select
                value={pauseDuration}
                onChange={(e) => setPauseDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 mb-4"
              >
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={7200}>2 hours</option>
                <option value={14400}>4 hours</option>
                <option value={28800}>8 hours</option>
                <option value={86400}>24 hours</option>
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for pause (optional)
              </label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g., Scheduled database maintenance"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 mb-4"
                rows={3}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handlePauseSystem}
                  disabled={pauseSystem.isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {pauseSystem.isPending ? 'Pausing...' : 'Confirm Pause'}
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-purple-900 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Emergency Withdrawal</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Multi-Sig Required:</strong> This will create a withdrawal request requiring 2 admin approvals. 
                  The blockchain transaction will only execute after both approvals are received.
                </p>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address *
              </label>
              <input
                type="text"
                value={withdrawalAddress}
                onChange={(e) => setWithdrawalAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 mb-4"
                required
              />
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (ETH) *
              </label>
              <input
                type="text"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 mb-4"
                required
              />
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for withdrawal *
              </label>
              <textarea
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
                placeholder="Describe the emergency requiring fund withdrawal..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 mb-4"
                rows={4}
                required
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={handleEmergencyWithdrawal}
                  disabled={
                    !withdrawalAddress || 
                    !withdrawalAmount || 
                    !withdrawalReason || 
                    withdrawalReason.length < 10 ||
                    emergencyWithdrawal.isPending
                  }
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {emergencyWithdrawal.isPending ? 'Creating Request...' : 'Create Withdrawal Request'}
                </button>
                <button
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setWithdrawalAddress("");
                    setWithdrawalAmount("");
                    setWithdrawalReason("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
