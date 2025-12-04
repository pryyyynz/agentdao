"use client";

import { useState } from "react";
import { AgentStatus, AgentType } from "@/types";
import {
  useUpdateAgentStatus,
  useUpdateAgentWeight,
} from "@/hooks/useAdminData";
import {
  Bot,
  Pause,
  Play,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AgentManagementPanelProps {
  agents: AgentStatus[];
}

export default function AgentManagementPanel({ agents }: AgentManagementPanelProps) {
  const [editingWeight, setEditingWeight] = useState<{ agentId: string; weight: number } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  const updateStatus = useUpdateAgentStatus();
  const updateWeight = useUpdateAgentWeight();

  // Agent type config
  const getAgentColor = (type: AgentType) => {
    const colors: Record<AgentType, string> = {
      intake: 'purple',
      coordinator: 'indigo',
      technical: 'blue',
      impact: 'green',
      due_diligence: 'red',
      budget: 'yellow',
      community: 'pink',
      executor: 'orange',
    };
    return colors[type] || 'gray';
  };

  const getAgentLabel = (type: AgentType) => {
    const labels: Record<AgentType, string> = {
      intake: 'Intake Agent',
      coordinator: 'Coordinator Agent',
      technical: 'Technical Agent',
      impact: 'Impact Agent',
      due_diligence: 'Due Diligence Agent',
      budget: 'Budget Agent',
      community: 'Community Agent',
      executor: 'Executor Agent',
    };
    return labels[type];
  };

  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    }
  };

  const handleToggleStatus = async (agent: AgentStatus) => {
    setTogglingStatus(agent.agent_id);
    try {
      const newStatus = agent.status === 'active' ? 'paused' : 'active';
      await updateStatus.mutateAsync({
        agentId: agent.agent_id,
        status: newStatus,
      });
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleUpdateWeight = async () => {
    if (!editingWeight) return;
    
    await updateWeight.mutateAsync({
      agentId: editingWeight.agentId,
      weight: editingWeight.weight,
    });
    
    setEditingWeight(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Agent Management
              </h2>
              <p className="text-sm text-gray-500">
                Monitor and control agent operations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="divide-y divide-gray-200">
        {agents.map((agent) => {
          const color = getAgentColor(agent.agent_type);
          const isEditing = editingWeight?.agentId === agent.agent_id;
          
          return (
            <div
              key={agent.agent_id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                {/* Agent Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 bg-${color}-100 rounded-lg`}>
                      <Bot className={`h-5 w-5 text-${color}-600`} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {getAgentLabel(agent.agent_type)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {agent.wallet_address.slice(0, 6)}...{agent.wallet_address.slice(-4)}
                      </p>
                    </div>
                    {getStatusIcon(agent.status)}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Voting Weight</p>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="2.0"
                          value={editingWeight.weight}
                          onChange={(e) =>
                            setEditingWeight({
                              ...editingWeight,
                              weight: parseFloat(e.target.value),
                            })
                          }
                          className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">
                          {agent.voting_weight.toFixed(2)}x
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Evaluations</p>
                      <p className="text-sm font-medium text-gray-900">
                        {agent.evaluations_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Average Score</p>
                      <p className="text-sm font-medium text-gray-900">
                        {agent.average_score ? agent.average_score.toFixed(1) : '0.0'}%
                      </p>
                    </div>
                  </div>

                  {/* Last Active */}
                  <p className="text-xs text-gray-500">
                    Last active: {new Date(agent.last_active).toLocaleString()}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col space-y-2 ml-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleUpdateWeight}
                        disabled={updateWeight.isPending}
                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Save</span>
                      </button>
                      <button
                        onClick={() => setEditingWeight(null)}
                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Cancel</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleStatus(agent)}
                        disabled={togglingStatus === agent.agent_id}
                        className={
                          agent.status === "active"
                            ? "flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-600 hover:bg-yellow-700 text-white"
                            : "flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white"
                        }
                      >
                        {agent.status === "active" ? (
                          <>
                            <Pause className="h-4 w-4" />
                            <span className="text-sm">Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span className="text-sm">Resume</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setEditingWeight({
                            agentId: agent.agent_id,
                            weight: agent.voting_weight,
                          })
                        }
                        disabled={togglingStatus === agent.agent_id}
                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Settings className="h-4 w-4" />
                        <span className="text-sm">Adjust</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
