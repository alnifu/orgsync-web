import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar, Target, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { MLService } from '../utils/MLService';
import type { UserFeatures } from '../utils/MLService';
import { useParams } from 'react-router';
import toast from 'react-hot-toast';

interface ClusterData {
  name: string;
  users: UserFeatures[];
  avgPosts: number;
  avgRsvpRate: number;
  color: string;
}

const MLDashboard: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [predictions, setPredictions] = useState<UserFeatures[]>([]);
  const [timeWindow, setTimeWindow] = useState<'30d' | '90d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [showDataWarning, setShowDataWarning] = useState(false);
  const mlService = MLService.getInstance();

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId, timeWindow]);

  const loadData = async () => {
    if (!orgId) return;

    setIsLoading(true);
    try {
      await mlService.fetchUserData(orgId, timeWindow);

      if (!mlService.hasEnoughData()) {
        setShowDataWarning(true);
        setClusters([]);
        setPredictions([]);
        return;
      }

      await mlService.trainModels();

      const clusteredUsers = mlService.getClusteredUsers();
      const clusterData: ClusterData[] = [
        {
          name: 'Low Engagement',
          users: clusteredUsers.low,
          avgPosts: clusteredUsers.low.reduce((sum, u) => sum + u.engagementFrequency, 0) / clusteredUsers.low.length || 0,
          avgRsvpRate: clusteredUsers.low.reduce((sum, u) => sum + u.rsvpRate, 0) / clusteredUsers.low.length || 0,
          color: 'bg-red-100 text-red-800'
        },
        {
          name: 'Medium Engagement',
          users: clusteredUsers.medium,
          avgPosts: clusteredUsers.medium.reduce((sum, u) => sum + u.engagementFrequency, 0) / clusteredUsers.medium.length || 0,
          avgRsvpRate: clusteredUsers.medium.reduce((sum, u) => sum + u.rsvpRate, 0) / clusteredUsers.medium.length || 0,
          color: 'bg-yellow-100 text-yellow-800'
        },
        {
          name: 'High Engagement',
          users: clusteredUsers.high,
          avgPosts: clusteredUsers.high.reduce((sum, u) => sum + u.engagementFrequency, 0) / clusteredUsers.high.length || 0,
          avgRsvpRate: clusteredUsers.high.reduce((sum, u) => sum + u.rsvpRate, 0) / clusteredUsers.high.length || 0,
          color: 'bg-green-100 text-green-800'
        }
      ];

      setClusters(clusterData);
      setPredictions(mlService.getUserPredictions());
      setShowDataWarning(false);
    } catch (error) {
      console.error('Error loading ML data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrain = async () => {
    setIsLoading(true);
    try {
      await loadData();
      toast.success('Models retrained successfully');
    } catch (error) {
      toast.error('Failed to retrain models');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedWithLowData = () => {
    setShowDataWarning(false);
    loadData();
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      organizationId: orgId,
      timeWindow,
      clusters: clusters.map(c => ({
        name: c.name,
        userCount: c.users.length,
        avgPosts: c.avgPosts,
        avgRsvpRate: c.avgRsvpRate,
        users: c.users.map(u => ({ name: u.userName, engagement: u.engagementFrequency }))
      })),
      predictions: predictions.slice(0, 20).map(p => ({
        name: p.userName,
        probability: Math.round((p.predictedRsvpProb || 0) * 100)
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-analytics-${orgId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const getConfidenceColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityBarColor = (probability: number) => {
    if (probability >= 0.7) return 'bg-green-500';
    if (probability >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (showDataWarning) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">Insufficient Data</h3>
          </div>
          <p className="text-yellow-700 mb-4">
            We don't have enough user activity data for reliable ML analysis. Results may not be accurate.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleProceedWithLowData}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Proceed Anyway
            </button>
            <button
              onClick={() => setShowDataWarning(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ML Analytics Dashboard</h1>
          <p className="text-gray-600">User segmentation and RSVP prediction insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as '30d' | '90d' | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={handleRetrain}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Retrain Models
          </button>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Training models...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* User Segmentation Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-8 w-8 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">User Segmentation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {clusters.map((cluster) => (
                <div key={cluster.name} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{cluster.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cluster.color}`}>
                      {cluster.users.length} users
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    {cluster.name === 'Low Engagement' ? 'Users with minimal interaction' :
                     cluster.name === 'Medium Engagement' ? 'Users with moderate participation' :
                     'Users with high activity levels'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Avg Engagement:</span>
                      <span className="font-medium">{cluster.avgPosts.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>RSVP Rate:</span>
                      <span className="font-medium">{cluster.avgRsvpRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(cluster.users.length / Math.max(...clusters.map(c => c.users.length))) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Relative group size</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RSVP Prediction Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-8 w-8 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-900">RSVP Prediction</h2>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">Predicted RSVP likelihood for organization members</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Based on historical interaction patterns</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Predicted Probability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visual
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {predictions.slice(0, 20).map((prediction) => (
                    <tr key={prediction.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{prediction.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{Math.round((prediction.predictedRsvpProb || 0) * 100)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getConfidenceColor(prediction.predictedRsvpProb || 0)}`}>
                          {(prediction.predictedRsvpProb || 0) >= 0.7 ? 'High' :
                           (prediction.predictedRsvpProb || 0) >= 0.4 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${getProbabilityBarColor(prediction.predictedRsvpProb || 0)}`}
                                style={{ width: `${(prediction.predictedRsvpProb || 0) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{Math.round((prediction.predictedRsvpProb || 0) * 100)}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">High Likelihood</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {predictions.filter(p => (p.predictedRsvpProb || 0) >= 0.7).length}
                </p>
                <p className="text-xs text-green-600">users likely to RSVP</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Medium Likelihood</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {predictions.filter(p => (p.predictedRsvpProb || 0) >= 0.4 && (p.predictedRsvpProb || 0) < 0.7).length}
                </p>
                <p className="text-xs text-yellow-600">users may RSVP</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Low Likelihood</span>
                </div>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {predictions.filter(p => (p.predictedRsvpProb || 0) < 0.4).length}
                </p>
                <p className="text-xs text-red-600">users unlikely to RSVP</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MLDashboard;