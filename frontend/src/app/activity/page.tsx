"use client";

import { PageLayout } from "@/components/PageLayout";
import { useAgentActivities } from "@/hooks/useApi";
import { useState, useMemo } from "react";
import {
  Bot,
  Loader2,
  Wrench,
  Heart,
  Shield,
  Coins,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  XCircle,
  TrendingUp,
  Activity as ActivityIcon,
  ChevronDown,
  ChevronUp,
  List,
  Calendar,
  BarChart3,
  Zap,
  Eye,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { AgentActivity, AgentType } from "@/types";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO, differenceInMinutes, startOfDay, format } from "date-fns";

type ViewMode = "time" | "grant" | "agent" | "timeline";
type GroupKey = string;

const AGENT_CONFIGS = {
  technical: {
    icon: Wrench,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
  },
  impact: {
    icon: Heart,
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
  },
  due_diligence: {
    icon: Shield,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
  },
  budget: {
    icon: Coins,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
  },
  community: {
    icon: Users,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-200",
  },
  intake: {
    icon: Bot,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    borderColor: "border-indigo-200",
  },
  coordinator: {
    icon: ActivityIcon,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    borderColor: "border-pink-200",
  },
  executor: {
    icon: Zap,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-200",
  },
};

function getActionIcon(action: string) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes("start") || actionLower.includes("begin")) {
    return { icon: PlayCircle, color: "text-blue-600" };
  }
  if (actionLower.includes("complet") || actionLower.includes("finish") || actionLower.includes("success")) {
    return { icon: CheckCircle2, color: "text-green-600" };
  }
  if (actionLower.includes("error") || actionLower.includes("fail")) {
    return { icon: XCircle, color: "text-red-600" };
  }
  if (actionLower.includes("warn") || actionLower.includes("review")) {
    return { icon: AlertCircle, color: "text-yellow-600" };
  }
  return { icon: ActivityIcon, color: "text-gray-600" };
}

function isLive(timestamp: string): boolean {
  const activityTime = parseISO(timestamp);
  return differenceInMinutes(new Date(), activityTime) < 5;
}

function getTimeGroup(timestamp: string): string {
  const date = parseISO(timestamp);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return "This Week";
  return "Earlier";
}

export default function ActivityPage() {
  const { data: activities, isLoading } = useAgentActivities(100);
  const [viewMode, setViewMode] = useState<ViewMode>("time");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Calculate stats
  const stats = useMemo(() => {
    if (!activities) return null;

    const now = new Date();
    const todayActivities = activities.filter((a) => isToday(parseISO(a.timestamp)));
    const yesterdayActivities = activities.filter((a) => isYesterday(parseISO(a.timestamp)));
    
    // Active agents (active in last 5 minutes)
    const activeAgents = new Set(
      activities
        .filter((a) => isLive(a.timestamp))
        .map((a) => a.agent_type)
    ).size;

    // Calculate average evaluation time (from start to complete actions)
    const completedEvals = activities.filter((a) => 
      a.action.toLowerCase().includes("complet") || a.action.toLowerCase().includes("finish")
    );
    
    // Completion rate (completed vs started)
    const startedCount = activities.filter((a) => 
      a.action.toLowerCase().includes("start") || a.action.toLowerCase().includes("begin")
    ).length;
    const completionRate = startedCount > 0 ? (completedEvals.length / startedCount) * 100 : 0;

    // Trend indicator
    const trend = yesterdayActivities.length > 0 
      ? ((todayActivities.length - yesterdayActivities.length) / yesterdayActivities.length) * 100
      : 0;

    return {
      totalToday: todayActivities.length,
      activeAgents,
      completionRate: Math.round(completionRate),
      trend: Math.round(trend),
    };
  }, [activities]);

  // Calculate workload distribution
  const workloadDistribution = useMemo(() => {
    if (!activities) return [];
    
    const distribution: Record<AgentType, number> = {} as any;
    activities.forEach((activity) => {
      distribution[activity.agent_type] = (distribution[activity.agent_type] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([agent, count]) => ({ agent: agent as AgentType, count }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  // Calculate activity heatmap (by hour)
  const activityHeatmap = useMemo(() => {
    if (!activities) return [];
    
    const todayActivities = activities.filter((a) => isToday(parseISO(a.timestamp)));
    const hourCounts: Record<number, number> = {};
    
    todayActivities.forEach((activity) => {
      const hour = parseISO(activity.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(hourCounts), 1);
    
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts[hour] || 0,
      intensity: (hourCounts[hour] || 0) / maxCount,
    }));
  }, [activities]);

  // Group activities based on view mode
  const groupedActivities = useMemo(() => {
    if (!activities) return new Map<GroupKey, AgentActivity[]>();

    const groups = new Map<GroupKey, AgentActivity[]>();

    activities.forEach((activity) => {
      let key: string;
      
      switch (viewMode) {
        case "time":
          key = getTimeGroup(activity.timestamp);
          break;
        case "grant":
          key = `Grant #${activity.grant_id}`;
          break;
        case "agent":
          key = activity.agent_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          break;
        default:
          key = "All Activities";
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(activity);
    });

    // Sort groups
    if (viewMode === "time") {
      const order = ["Today", "Yesterday", "This Week", "Earlier"];
      return new Map([...groups].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)));
    }

    return groups;
  }, [activities, viewMode]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <PageLayout
        title="Agent Activity"
        description="Real-time feed of AI agent evaluations and actions"
      >
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </PageLayout>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <PageLayout
        title="Agent Activity"
        description="Real-time feed of AI agent evaluations and actions"
      >
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No agent activity yet. Submit a grant to see agents in action!
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Agent Activity"
      description="Real-time feed of AI agent evaluations and actions"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <ActivityIcon className="h-6 w-6 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">TODAY</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalToday || 0}</p>
          <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
            {stats && stats.trend !== 0 && (
              <>
                <TrendingUp className={`h-3 w-3 ${stats.trend > 0 ? "text-green-600" : "text-red-600 rotate-180"}`} />
                <span className={stats.trend > 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(stats.trend)}%
                </span>
                <span>vs yesterday</span>
              </>
            )}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Zap className="h-6 w-6 text-green-600" />
            <span className="text-xs font-medium text-green-600">ACTIVE NOW</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.activeAgents || 0}</p>
          <p className="text-xs text-gray-600 mt-1">Agents working</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-6 w-6 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">COMPLETION</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.completionRate || 0}%</p>
          <p className="text-xs text-gray-600 mt-1">Success rate</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-6 w-6 text-orange-600" />
            <span className="text-xs font-medium text-orange-600">TOTAL</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
          <p className="text-xs text-gray-600 mt-1">All time activities</p>
        </div>
      </div>

      {/* Activity Heatmap & Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Activity Heatmap */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activity Heatmap (Today)
          </h3>
          <div className="grid grid-cols-12 gap-1">
            {activityHeatmap.map((data) => (
              <div
                key={data.hour}
                className="aspect-square rounded relative group"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${data.intensity * 0.8})`,
                }}
                title={`${data.hour}:00 - ${data.count} activities`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-medium text-white">{data.count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0h</span>
            <span>12h</span>
            <span>23h</span>
          </div>
        </div>

        {/* Agent Workload Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Agent Workload Distribution
          </h3>
          <div className="space-y-2">
            {workloadDistribution.slice(0, 6).map((item) => {
              const config = AGENT_CONFIGS[item.agent] || AGENT_CONFIGS.intake;
              const Icon = config.icon;
              const maxCount = workloadDistribution[0]?.count || 1;
              const percentage = (item.count / maxCount) * 100;

              return (
                <div key={item.agent} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 capitalize">
                        {item.agent.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${config.bgColor.replace("/20", "")}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Mode
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("time")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                viewMode === "time"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Calendar className="h-3 w-3 inline mr-1" />
              By Time
            </button>
            <button
              onClick={() => setViewMode("grant")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                viewMode === "grant"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <List className="h-3 w-3 inline mr-1" />
              By Grant
            </button>
            <button
              onClick={() => setViewMode("agent")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                viewMode === "agent"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Bot className="h-3 w-3 inline mr-1" />
              By Agent
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Activities */}
      <div className="space-y-4">
        {Array.from(groupedActivities.entries()).map(([groupKey, groupActivities]) => {
          const isCollapsed = collapsedGroups.has(groupKey);
          
          return (
            <div
              key={groupKey}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-gray-900">
                    {groupKey}
                  </h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {groupActivities.length} activities
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Group Activities */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-200">
                  {groupActivities.map((activity) => {
                    const config = AGENT_CONFIGS[activity.agent_type] || AGENT_CONFIGS.intake;
                    const AgentIcon = config.icon;
                    const actionInfo = getActionIcon(activity.action);
                    const ActionIcon = actionInfo.icon;
                    const live = isLive(activity.timestamp);

                    return (
                      <div
                        key={activity.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Agent Icon */}
                          <div className={`${config.bgColor} p-2 rounded-lg ${config.borderColor} border relative`}>
                            <AgentIcon className={`w-5 h-5 ${config.color}`} />
                            {live && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                            )}
                          </div>

                          {/* Activity Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {activity.agent_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Agent
                                  </h4>
                                  {live && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
                                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                      LIVE
                                    </span>
                                  )}
                                  {viewMode !== "grant" && (
                                    <span className="text-xs text-gray-500">
                                      Grant #{activity.grant_id}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <ActionIcon className={`h-3.5 w-3.5 ${actionInfo.color}`} />
                                  <p className="text-sm text-gray-600">
                                    {activity.action}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700 mt-2">
                                  {activity.message}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
