"use client";

import { useEffect, useState } from "react";
import {
  useSystemHealth,
  useAgentStatuses,
  useTreasuryInfo,
  usePendingActions,
} from "@/hooks/useAdminData";
import SystemHealthCard from "@/components/admin/SystemHealthCard";
import AgentManagementPanel from "@/components/admin/AgentManagementPanel";
import TreasuryManagement from "@/components/admin/TreasuryManagement";
import PendingActionsQueue from "@/components/admin/PendingActionsQueue";
import EmergencyControls from "@/components/admin/EmergencyControls";
import SystemLogsViewer from "@/components/admin/SystemLogsViewer";
import MilestoneReviewPanel from "@/components/admin/MilestoneReviewPanel";
import AdminLogin from "@/components/admin/AdminLogin";
import { Shield, AlertTriangle, LogOut } from "lucide-react";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin@nullshot";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Fetch admin data
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealth();
  const { data: agents, isLoading: agentsLoading } = useAgentStatuses();
  const { data: treasury, isLoading: treasuryLoading } = useTreasuryInfo();
  const { data: pendingActions, isLoading: actionsLoading } = usePendingActions();

  // Mark as client-side and check authentication
  useEffect(() => {
    setIsClient(true);
    const authStatus = sessionStorage.getItem("adminAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (username: string, password: string) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError("");
      sessionStorage.setItem("adminAuthenticated", "true");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuthenticated");
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} error={loginError} />;
  }

  const isLoading = healthLoading || agentsLoading || treasuryLoading || actionsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                System monitoring and administrative controls
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-blue-100 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  Role: ADMIN
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Logout</span>
              </button>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        {systemHealth && systemHealth.status !== 'healthy' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  System Status: {systemHealth.status.toUpperCase()}
                </p>
                <p className="text-xs text-red-700">
                  Immediate attention may be required. Check system health metrics below.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* System Health */}
            {systemHealth && <SystemHealthCard health={systemHealth} />}

            {/* Milestone Reviews - Priority Section */}
            <MilestoneReviewPanel />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Agent Management */}
              {agents && <AgentManagementPanel agents={agents} />}

              {/* Treasury Management */}
              {treasury && <TreasuryManagement treasury={treasury} />}
            </div>

            {/* Pending Actions */}
            {pendingActions && <PendingActionsQueue actions={pendingActions} />}

            {/* Emergency Controls */}
            <EmergencyControls />

            {/* System Logs */}
            <SystemLogsViewer />
          </div>
        )}
      </div>
    </div>
  );
}
