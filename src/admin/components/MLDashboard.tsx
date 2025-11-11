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
  const [isTrained, setIsTrained] = useState(false);
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
      toast.success('Models trained successfully');
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
    const csvContent = mlService.exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-data-${orgId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
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

  const scatterData = {
    datasets: Object.entries(clusters).map(([cluster, events]) => {
      // Deduplicate by user for scatter plot
      const userMap = new Map<string, EventFeatures>();
      events.forEach(event => {
        if (!userMap.has(event.userId)) {
          userMap.set(event.userId, event);
        }
      });
      const uniqueUsers = Array.from(userMap.values());

      return {
        label: `Cluster ${cluster}`,
        data: uniqueUsers.map(event => ({
          x: event.engagementScore,
          y: event.rsvpRate,
          userName: event.userName
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
          label: (context: any) => `${context.raw.userName}: (${context.parsed.x}, ${context.parsed.y.toFixed(2)}%)`,
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
                    <tr key={prediction.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{prediction.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{Math.round((prediction.predictedRSVPProb || 0) * 100)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getConfidenceColor(prediction.predictedRSVPProb || 0)}`}>
                          {(prediction.predictedRSVPProb || 0) >= 0.7 ? 'High' :
                            (prediction.predictedRSVPProb || 0) >= 0.4 ? 'Medium' : 'Low'}
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