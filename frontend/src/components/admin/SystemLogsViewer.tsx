"use client";

import { useState } from "react";
import { SystemLog } from "@/types";
import { useSystemLogs } from "@/hooks/useAdminData";
import { FileText, Filter, Download, AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react";

export default function SystemLogsViewer() {
  const [levelFilter, setLevelFilter] = useState<SystemLog['level'] | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [limit, setLimit] = useState(20);

  const { data: logs, isLoading } = useSystemLogs(
    levelFilter !== 'all' ? { level: levelFilter, limit } : { limit }
  );

  const getLevelIcon = (level: SystemLog['level']) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getLevelColor = (level: SystemLog['level']) => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };

  const exportLogs = () => {
    if (!logs) return;
    
    const csv = [
      ['Timestamp', 'Level', 'Source', 'Message'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.level,
        log.source,
        `"${log.message.replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                System Logs
              </h2>
              <p className="text-sm text-gray-500">
                Real-time system event monitoring
              </p>
            </div>
          </div>
          
          <button
            onClick={exportLogs}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          
          {/* Level Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Show
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900"
            >
              <option value={10}>10 entries</option>
              <option value={20}>20 entries</option>
              <option value={50}>50 entries</option>
              <option value={100}>100 entries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading logs...
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No logs found
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.log_id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {getLevelIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.source}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {log.message}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                        Show details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
