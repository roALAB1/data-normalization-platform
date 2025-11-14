// @ts-nocheck
/**
 * Memory Monitoring Dashboard
 * 
 * Real-time visualization of worker pool performance:
 * - Active workers count over time
 * - Memory usage (RSS, heap) per worker
 * - Worker recycling events log
 * - Chunk retry events log
 * - System health indicator
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Cpu, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Clock,
  Zap,
  Home
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'wouter';

export default function MemoryMonitoringDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState(3600000); // 1 hour default
  
  // Queries
  const { data: currentMetrics, refetch: refetchCurrent } = trpc.metrics.getCurrentMetrics.useQuery(undefined, {
    refetchInterval: autoRefresh ? 2000 : false, // Refresh every 2 seconds if auto-refresh enabled
  });
  
  const { data: metricsHistory } = trpc.metrics.getMetricsHistory.useQuery(
    { durationMs: timeRange },
    { refetchInterval: autoRefresh ? 5000 : false }
  );
  
  const { data: recyclingEvents } = trpc.metrics.getRecyclingEvents.useQuery(
    { limit: 20 },
    { refetchInterval: autoRefresh ? 5000 : false }
  );
  
  const { data: retryEvents } = trpc.metrics.getRetryEvents.useQuery(
    { limit: 20 },
    { refetchInterval: autoRefresh ? 5000 : false }
  );

  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Determine system health
  const getSystemHealth = () => {
    if (!currentMetrics) return { status: 'unknown', color: 'gray', icon: AlertCircle };
    
    const { activeWorkers, avgMemoryPerWorkerMB, totalRetries } = currentMetrics;
    
    // Health criteria
    const hasWorkers = activeWorkers > 0;
    const memoryOk = avgMemoryPerWorkerMB < 500; // Less than 500 MB per worker
    const retriesLow = totalRetries < 10;
    
    if (hasWorkers && memoryOk && retriesLow) {
      return { status: 'healthy', color: 'green', icon: CheckCircle2 };
    } else if (!hasWorkers) {
      return { status: 'idle', color: 'blue', icon: Activity };
    } else if (!memoryOk || !retriesLow) {
      return { status: 'warning', color: 'yellow', icon: AlertCircle };
    }
    
    return { status: 'unknown', color: 'gray', icon: AlertCircle };
  };

  const health = getSystemHealth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Memory Monitoring Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time worker pool performance metrics
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Home Button */}
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value={300000}>5 minutes</option>
                <option value={900000}>15 minutes</option>
                <option value={1800000}>30 minutes</option>
                <option value={3600000}>1 hour</option>
              </select>
              
              {/* Auto Refresh Toggle */}
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
              </Button>
              
              {/* Manual Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCurrent()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* System Health Indicator */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <health.icon className={`w-8 h-8 text-${health.color}-500`} />
                <div>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current worker pool status</CardDescription>
                </div>
              </div>
              <Badge variant={health.status === 'healthy' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                {health.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {currentMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{currentMetrics.activeWorkers}</div>
                  <div className="text-sm text-muted-foreground">Active Workers</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{currentMetrics.totalMemoryMB.toFixed(1)} MB</div>
                  <div className="text-sm text-muted-foreground">Total Memory</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{currentMetrics.totalChunksProcessed}</div>
                  <div className="text-sm text-muted-foreground">Chunks Processed</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{currentMetrics.totalRetries}</div>
                  <div className="text-sm text-muted-foreground">Total Retries</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Active Workers Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Active Workers Over Time
              </CardTitle>
              <CardDescription>Number of workers processing chunks</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsHistory && metricsHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metricsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTime}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={formatTime}
                      formatter={(value: number) => [value, 'Workers']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="activeWorkers" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Active Workers"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memory Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Memory Usage Over Time
              </CardTitle>
              <CardDescription>Total memory consumption (MB)</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsHistory && metricsHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={metricsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTime}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={formatTime}
                      formatter={(value: number) => [`${value.toFixed(1)} MB`, 'Memory']}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="totalMemoryMB" 
                      stroke="#10b981" 
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Total Memory (MB)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events Tables */}
        <Tabs defaultValue="recycling" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recycling">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recycling Events
            </TabsTrigger>
            <TabsTrigger value="retries">
              <Zap className="w-4 h-4 mr-2" />
              Retry Events
            </TabsTrigger>
          </TabsList>

          {/* Recycling Events Table */}
          <TabsContent value="recycling">
            <Card>
              <CardHeader>
                <CardTitle>Worker Recycling Events</CardTitle>
                <CardDescription>Recent worker recycling activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recyclingEvents && recyclingEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Worker ID</th>
                          <th className="text-left p-2">Reason</th>
                          <th className="text-right p-2">Chunks</th>
                          <th className="text-right p-2">Memory (MB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recyclingEvents.map((event, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatTime(event.timestamp)}</td>
                            <td className="p-2 font-mono text-xs">{event.workerId.substring(0, 8)}...</td>
                            <td className="p-2">
                              <Badge variant="outline">{event.reason}</Badge>
                            </td>
                            <td className="p-2 text-right">{event.chunksProcessed}</td>
                            <td className="p-2 text-right">{event.memoryUsedMB.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recycling events yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retry Events Table */}
          <TabsContent value="retries">
            <Card>
              <CardHeader>
                <CardTitle>Chunk Retry Events</CardTitle>
                <CardDescription>Recent chunk processing retries</CardDescription>
              </CardHeader>
              <CardContent>
                {retryEvents && retryEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Chunk ID</th>
                          <th className="text-left p-2">Attempt</th>
                          <th className="text-left p-2">Error</th>
                          <th className="text-right p-2">Delay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retryEvents.map((event, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatTime(event.timestamp)}</td>
                            <td className="p-2 font-mono">{event.chunkId}</td>
                            <td className="p-2">
                              <Badge variant="secondary">{event.attemptNumber}</Badge>
                            </td>
                            <td className="p-2 max-w-xs truncate">{event.error}</td>
                            <td className="p-2 text-right">{formatDuration(event.delayMs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No retry events yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 flex justify-center items-center gap-4 text-sm text-muted-foreground">
          <span>v3.19.0 - Memory Monitoring Dashboard</span>
          <span>•</span>
          <a
            href="https://github.com/roALAB1/data-normalization-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
