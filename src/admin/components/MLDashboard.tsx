import React, { useState, useRef } from 'react';
import { Users, TrendingUp, Target, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import type { EventFeatures } from '../utils/MLService';
import { MLService } from '../utils/MLService';
import { useParams } from 'react-router';
import toast from 'react-hot-toast';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const MLDashboard: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [predictions, setPredictions] = useState<EventFeatures[]>([]);
  const [clusters, setClusters] = useState<{ [key: number]: EventFeatures[] }>({});
  const [timeWindow, setTimeWindow] = useState<'30d' | '90d' | 'all' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingMessage, setTrainingMessage] = useState('');
  const [showDataWarning, setShowDataWarning] = useState(false);
  const [dataQuality, setDataQuality] = useState<{ quality: 'good' | 'fair' | 'poor'; message: string; suggestions: string[] } | null>(null);
  const [clusterInsights, setClusterInsights] = useState<{ [cluster: number]: { description: string; characteristics: string[]; recommendations: string[] } } | null>(null);
  const [predictionInsights, setPredictionInsights] = useState<{ summary: string; topPredictors: string[]; actionItems: string[] } | null>(null);
  const [isTrained, setIsTrained] = useState(false);
  const [dynamicThresholds, setDynamicThresholds] = useState<{ high: number; medium: number }>({ high: 0.7, medium: 0.4 });
  const mlService = MLService.getInstance();

  const loadData = async () => {
    if (!orgId) return;

    setIsLoading(true);
    try {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (timeWindow === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast.error('Please select both start and end dates for custom range');
          setIsLoading(false);
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      }

      await mlService.fetchUserData(orgId, timeWindow, startDate, endDate);

      if (!mlService.hasEnoughData()) {
        setShowDataWarning(true);
        setPredictions([]);
        setClusters({});
        setIsTrained(false);
        return;
      }

      setShowDataWarning(false);
      // Data loaded, but models not trained yet
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const trainModels = async () => {
    setIsLoading(true);
    setTrainingProgress(0);
    setTrainingMessage('');
    try {
      await mlService.trainModels((progress, message) => {
        setTrainingProgress(progress);
        setTrainingMessage(message);
      });

      const clusteredUsers = mlService.getClusteredUsers();
      setClusters(clusteredUsers);
      setPredictions(mlService.getUserPredictions());
      setIsTrained(true);

      // Get user-friendly insights
      setDataQuality(mlService.getDataQualityReport());
      setClusterInsights(mlService.getClusterInsights());
      setPredictionInsights(mlService.getPredictionInsights());
      setDynamicThresholds(mlService.getDynamicThresholds());

      toast.success('Analysis complete! Check out your personalized insights below.');
    } catch (error) {
      console.error('Error training models:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to train models');
    } finally {
      setIsLoading(false);
      setTrainingProgress(0);
      setTrainingMessage('');
    }
  };

  const exportToCSV = () => {
    console.log('Export button clicked, isTrained:', isTrained);
    console.log('ML Service instance:', mlService);

    const csvContent = mlService.exportToCSV();

    // Debug: Check if we have data
    const dataLength = mlService.getAllUserFeatures().length;
    console.log('Exporting CSV with', dataLength, 'data points');
    console.log('CSV content length:', csvContent.length);
    console.log('CSV preview:', csvContent.substring(0, 200));

    if (dataLength === 0) {
      toast.error('No data available to export. Please load and train models first.');
      return;
    }

    if (csvContent === 'No data available') {
      toast.error('CSV generation failed. Please try again.');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-data-${orgId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exported with ${dataLength} data points`);
  };

  const getConfidenceColor = (probability: number) => {
    if (probability >= dynamicThresholds.high) return 'text-green-600';
    if (probability >= dynamicThresholds.medium) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityBarColor = (probability: number) => {
    if (probability >= dynamicThresholds.high) return 'bg-green-500';
    if (probability >= dynamicThresholds.medium) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const scatterData = {
    datasets: Object.entries(clusters)
      .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sort clusters by numeric order
      .map(([cluster, events]) => {
        // Deduplicate by user for scatter plot
        const userMap = new Map<string, EventFeatures>();
        events.forEach(event => {
          if (!userMap.has(event.anonymousUserId)) {
            userMap.set(event.anonymousUserId, event);
          }
        });
        const uniqueUsers = Array.from(userMap.values());

        return {
          label: `Cluster ${cluster}`,
          data: uniqueUsers.map(event => ({
            x: event.engagementScore,
            y: event.rsvpRate,
            anonymousLabel: event.anonymousUserId.replace('User_', 'User ')
          })),
          backgroundColor: cluster === '0' ? 'rgba(255, 99, 132, 0.6)' :
                           cluster === '1' ? 'rgba(54, 162, 235, 0.6)' :
                           'rgba(255, 205, 86, 0.6)',
          borderColor: cluster === '0' ? 'rgba(255, 99, 132, 1)' :
                       cluster === '1' ? 'rgba(54, 162, 235, 1)' :
                       'rgba(255, 205, 86, 1)',
          borderWidth: 1,
        };
      }),
  };

  const scatterOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Engagement Score',
        },
      },
      y: {
        title: {
          display: true,
          text: 'RSVP Rate (%)',
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.raw.anonymousLabel}: (${context.parsed.x}, ${context.parsed.y.toFixed(2)}%)`,
        },
      },
    },
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
            We don't have enough user activity data for reliable ML analysis. Need at least 10 users with activity.
          </p>
          <button
            onClick={() => setShowDataWarning(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            ML Analytics Dashboard
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            User segmentation and RSVP prediction insights
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as '30d' | '90d' | 'all' | 'custom')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeWindow === 'custom' && (
            <div className="flex gap-2">
              <div className="flex flex-col">
                <label className="text-xs text-gray-600">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            Load Data
          </button>

          <button
            onClick={trainModels}
            disabled={isLoading || !mlService.hasEnoughData()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Train Models
          </button>

          <button
            onClick={exportToCSV}
            disabled={!isTrained}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">{trainingMessage || 'Processing...'}</p>
          {trainingProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {!isLoading && isTrained && (
        <>
          {/* Data Quality Report */}
          {dataQuality && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                {dataQuality.quality === 'good' && <div className="w-4 h-4 bg-green-500 rounded-full"></div>}
                {dataQuality.quality === 'fair' && <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>}
                {dataQuality.quality === 'poor' && <div className="w-4 h-4 bg-red-500 rounded-full"></div>}
                <h2 className="text-xl font-semibold text-gray-900">Data Quality Check</h2>
              </div>
              <p className="text-gray-700 mb-4">{dataQuality.message}</p>
              {dataQuality.suggestions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">💡 Suggestions:</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    {dataQuality.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Engagement Score Explanation */}
          {isTrained && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Understanding Engagement Score</h2>
              </div>
              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: mlService.getEngagementScoreExplanation().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
            </div>
          )}

          {/* Cluster Insights */}
          {clusterInsights && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-8 w-8 text-purple-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Member Behavior Groups</h2>
              </div>
              <p className="text-gray-600 mb-4">
                We've identified 3 distinct groups of members based on their engagement patterns:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(clusterInsights).map(([clusterId, insight]) => {
                  const cluster = parseInt(clusterId);
                  const clusterColor = cluster === 0 ? 'red' : cluster === 1 ? 'blue' : 'yellow';
                  const clusterUsers = clusters[cluster] || [];
                  // Count unique users in this cluster (not event-user combinations)
                  const uniqueUsersInCluster = new Set(clusterUsers.map(user => user.anonymousUserId)).size;

                  return (
                    <div key={cluster} className={`bg-${clusterColor}-50 border border-${clusterColor}-200 rounded-lg p-4`}>
                      <div className={`w-12 h-12 bg-${clusterColor}-100 rounded-full flex items-center justify-center mb-3`}>
                        <span className={`text-${clusterColor}-800 font-bold text-lg`}>
                          {uniqueUsersInCluster}
                        </span>
                      </div>
                      <h3 className={`text-lg font-semibold text-${clusterColor}-900 mb-2`}>
                        {insight.description}
                      </h3>
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-700 mb-1">Characteristics:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {insight.characteristics.map((char, index) => (
                            <li key={index}>• {char}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">Recommendations:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {insight.recommendations.map((rec, index) => (
                            <li key={index}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prediction Insights */}
          {predictionInsights && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <Target className="h-8 w-8 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">RSVP Prediction Insights</h2>
              </div>
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <p className="text-green-800 font-medium">{predictionInsights.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🎯 What Drives RSVPs:</h3>
                  <ul className="space-y-2">
                    {predictionInsights.topPredictors.map((predictor, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{predictor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🚀 Action Items:</h3>
                  <ul className="space-y-2">
                    {predictionInsights.actionItems.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Cluster Visualization */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl font-semibold text-gray-900">K-Means Clustering</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Scatter plot showing Engagement Score vs RSVP Rate, colored by cluster.
            </p>
            <div className="w-full h-96">
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
          </div>

          {/* RSVP Prediction */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-8 w-8 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-900">RSVP Prediction</h2>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Dynamic Thresholds:</strong> High ≥ {Math.round(dynamicThresholds.high * 100)}%,
                Medium ≥ {Math.round(dynamicThresholds.medium * 100)}% (automatically calculated from your data distribution)
              </p>
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
                  {predictions.map((prediction) => (
                    <tr key={prediction.anonymousUserId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{prediction.anonymousUserId.replace('User_', 'User ')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{Math.round((prediction.predictedRSVPProb || 0) * 100)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getConfidenceColor(prediction.predictedRSVPProb || 0)}`}>
                          {(prediction.predictedRSVPProb || 0) >= dynamicThresholds.high ? 'High' :
                            (prediction.predictedRSVPProb || 0) >= dynamicThresholds.medium ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${getProbabilityBarColor(prediction.predictedRSVPProb || 0)}`}
                                style={{ width: `${(prediction.predictedRSVPProb || 0) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{Math.round((prediction.predictedRSVPProb || 0) * 100)}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MLDashboard;