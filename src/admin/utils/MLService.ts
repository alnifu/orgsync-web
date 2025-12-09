import * as tf from '@tensorflow/tfjs';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';

export interface EventFeatures {
  eventId: string;
  eventName: string;
  totalViews: number;
  totalLikes: number;
  totalPolls: number;
  totalFeedbacks: number;
  totalRSVPs: number;
  totalRegisters: number;
  totalEvaluations: number;
  rsvpRate: number;
  engagementScore: number;
  hasRSVP: number;
  cluster?: number;
  predictedRSVPProb?: number;
  anonymousUserId: string; // New anonymous ID for internal grouping
  userId: string; // Anonymous user ID for display
  userName: string; // Anonymous user name for display
}

export class MLService {
  private static instance: MLService;
  private eventFeatures: EventFeatures[] = [];
  private logisticModel: tf.Sequential | null = null;
  private kmeansCentroids: tf.Variable | null = null;
  private kmeansLabels: number[] = [];
  private scalerLogistic: { mean: tf.Tensor1D; std: tf.Tensor1D } | null = null;
  private scalerKmeans: { mean: tf.Tensor1D; std: tf.Tensor1D } | null = null;

  static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  async fetchUserData(orgId: string, timeWindow: '30d' | '90d' | 'all' | 'custom', customStartDate?: Date, customEndDate?: Date): Promise<EventFeatures[]> {
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (timeWindow === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (timeWindow === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (timeWindow === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } // 'all' means no date filter

      // Fetch all events (posts with post_type='event')
      let eventsQuery = supabase
        .from('posts')
        .select('id, title, created_at')
        .eq('org_id', orgId)
        .eq('post_type', 'event');

      if (startDate) {
        eventsQuery = eventsQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        eventsQuery = eventsQuery.lte('created_at', endDate.toISOString());
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) {
        throw new Error(`Unable to load organization events. Please check your connection and try again.`);
      }

      if (!events || events.length === 0) {
        throw new Error(`No events found in the selected time period. Try selecting a longer time range or check if events exist in your organization.`);
      }

      // Fetch all RSVPs for these events
      const eventIds = events.map(e => e.id);
      let rsvpQuery = supabase
        .from('rsvps')
        .select('user_id, post_id')
        .in('post_id', eventIds);

      if (startDate) {
        rsvpQuery = rsvpQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        rsvpQuery = rsvpQuery.lte('created_at', endDate.toISOString());
      }

      const { data: rsvps, error: rsvpError } = await rsvpQuery;
      if (rsvpError) {
        throw new Error(`Unable to load RSVP data. This might affect analysis accuracy.`);
      }

      // Fetch org members to ensure only org members are considered
      const { data: orgMembers, error: membersError } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('is_active', true);
      if (membersError) {
        throw new Error(`Unable to verify organization membership. Please try again.`);
      }

      const memberUserIds = new Set(orgMembers?.map(m => m.user_id) || []);

      if (memberUserIds.size === 0) {
        throw new Error(`No active members found in this organization. ML analysis requires at least 10 members with activity.`);
      }

      // Create RSVP map: eventId -> set of userIds who RSVPed (only org members)
      const rsvpMap = new Map<string, Set<string>>();
      rsvps?.forEach(rsvp => {
        if (!memberUserIds.has(rsvp.user_id)) return; // Skip RSVPs from non-members
        if (!rsvpMap.has(rsvp.post_id)) {
          rsvpMap.set(rsvp.post_id, new Set());
        }
        rsvpMap.get(rsvp.post_id)!.add(rsvp.user_id);
      });

      // Fetch reward_log for user activity
      let rewardQuery = supabase
        .from('reward_log')
        .select(`
          user_id,
          action,
          posts!inner (
            org_id
          ),
          users (
            id,
            first_name,
            last_name
          )
        `)
        .eq('posts.org_id', orgId);

      if (startDate) {
        rewardQuery = rewardQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        rewardQuery = rewardQuery.lte('created_at', endDate.toISOString());
      }

      const { data: rewards, error: rewardError } = await rewardQuery;
      if (rewardError) {
        throw new Error(`Unable to load user activity data. This is required for ML analysis.`);
      }

      // Aggregate user-level features
      const userMap = new Map<string, {
        totalViews: number;
        totalLikes: number;
        totalPolls: number;
        totalFeedbacks: number;
        totalRSVPs: number;
        totalRegisters: number;
        totalEvaluations: number;
      }>();

      rewards?.forEach(reward => {
        const user = reward.users as unknown as User;
        const userId = reward.user_id;
        if (!memberUserIds.has(userId)) return; // Skip users not in the org

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            totalViews: 0,
            totalLikes: 0,
            totalPolls: 0,
            totalFeedbacks: 0,
            totalRSVPs: 0,
            totalRegisters: 0,
            totalEvaluations: 0
          });
        }

        const userData = userMap.get(userId)!;
        switch (reward.action) {
          case 'view': userData.totalViews++; break;
          case 'like': userData.totalLikes++; break;
          case 'poll': userData.totalPolls++; break;
          case 'rsvp': userData.totalRSVPs++; break;
          case 'register': userData.totalRegisters++; break;
          case 'feedback': userData.totalFeedbacks++; break;
          case 'evaluate': userData.totalEvaluations++; break;
        }
      });

      if (userMap.size < 10) {
        throw new Error(`Only ${userMap.size} members have activity data. ML analysis requires at least 10 members with activity for reliable insights. Try selecting a longer time period.`);
      }

    // Create event-level data: one record per user-event pair (optimized)
    const eventFeatures: EventFeatures[] = [];
    const totalEvents = events.length;

    // Pre-calculate user-level aggregates to avoid redundant computation
    const userAggregates = new Map<string, {
      totalViews: number;
      totalLikes: number;
      totalPolls: number;
      totalFeedbacks: number;
      totalRSVPs: number;
      totalRegisters: number;
      totalEvaluations: number;
      rsvpRate: number;
      engagementScore: number;
      rsvpEventIds: Set<string>; // Track which events user RSVPed to
    }>();

    // First pass: aggregate user data
    userMap.forEach((userData, userId) => {
      const rsvpRate = totalEvents > 0 ? (userData.totalRSVPs / totalEvents) * 100 : 0;
      const engagementScore =
        userData.totalViews * 1 +
        userData.totalLikes * 5 +
        userData.totalPolls * 10 +
        userData.totalFeedbacks * 20 +
        userData.totalRegisters * 20 +
        userData.totalEvaluations * 50;

      userAggregates.set(userId, {
        ...userData,
        rsvpRate,
        engagementScore,
        rsvpEventIds: new Set()
      });
    });

    // Second pass: build event-user features efficiently
    events.forEach(event => {
      userAggregates.forEach((userData, userId) => {
        const hasRSVP = rsvpMap.get(event.id)?.has(userId) ? 1 : 0;
        if (hasRSVP) {
          userData.rsvpEventIds.add(event.id);
        }

        eventFeatures.push({
          eventId: event.id,
          eventName: event.title || `Event ${event.id}`,
          totalViews: userData.totalViews,
          totalLikes: userData.totalLikes,
          totalPolls: userData.totalPolls,
          totalFeedbacks: userData.totalFeedbacks,
          totalRSVPs: userData.totalRSVPs,
          totalRegisters: userData.totalRegisters,
          totalEvaluations: userData.totalEvaluations,
          rsvpRate: userData.rsvpRate,
          engagementScore: userData.engagementScore,
          hasRSVP,
          anonymousUserId: `User_${Array.from(userAggregates.keys()).indexOf(userId) + 1}`,
          userId: `User_${Array.from(userAggregates.keys()).indexOf(userId) + 1}`,
          userName: `User ${Array.from(userAggregates.keys()).indexOf(userId) + 1}`
        });
      });
    });

    this.eventFeatures = eventFeatures;

    console.log('Loaded', this.eventFeatures.length, 'event-user combinations for ML analysis');
    console.log('Sample data point:', this.eventFeatures[0]);

    return this.eventFeatures;
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error instanceof Error) {
        throw error; // Re-throw user-friendly errors
      } else {
        throw new Error('An unexpected error occurred while analyzing your data. Please try again.');
      }
    }
  }

  hasEnoughData(): boolean {
    const uniqueUsers = new Set(this.eventFeatures.map(e => e.anonymousUserId));
    return uniqueUsers.size >= 10;
  }

  async trainModels(onProgress?: (progress: number, message: string) => void): Promise<void> {
    try {
      if (!this.hasEnoughData()) {
        throw new Error(`Not enough data for analysis. We found ${this.eventFeatures.length} data points, but need at least 10 active members with event interactions. Try selecting a longer time period or check if your organization has enough activity.`);
      }

      onProgress?.(0, '🔍 Analyzing your organization\'s data...');

      // Prepare logistic regression data (event-level)
      const logisticFeatures = this.eventFeatures.map(event => [
        event.totalViews,
        event.totalLikes,
        event.totalPolls,
        event.totalFeedbacks,
        event.totalRSVPs,
        event.totalRegisters,
        event.totalEvaluations
      ]);

      const logisticLabels = this.eventFeatures.map(event => event.hasRSVP);

      // Standardize logistic features
      const logisticTensor = tf.tensor2d(logisticFeatures);
      const logisticMoments = tf.moments(logisticTensor, 0);
      this.scalerLogistic = {
        mean: logisticMoments.mean as tf.Tensor1D,
        std: tf.add(tf.sqrt(logisticMoments.variance), 1e-8) as tf.Tensor1D // Add epsilon to avoid division by zero
      };
      const scaledLogisticFeatures = tf.div(tf.sub(logisticTensor, this.scalerLogistic.mean), this.scalerLogistic.std);

      onProgress?.(20, '🎯 Training RSVP prediction model...');

      // Train logistic regression
      this.logisticModel = tf.sequential();
      this.logisticModel.add(tf.layers.dense({ inputShape: [7], units: 1, activation: 'sigmoid' }));
      this.logisticModel.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      const labelTensor = tf.tensor1d(logisticLabels, 'float32');

      await this.logisticModel.fit(scaledLogisticFeatures, labelTensor, {
        epochs: 100,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = 20 + (epoch / 100) * 40;
            onProgress?.(progress, `🎯 Training RSVP predictor... ${Math.round((epoch + 1) / 100 * 100)}% complete`);
          }
        }
      });

      onProgress?.(60, '👥 Grouping members into behavior patterns...');

      // Prepare K-means data (user-level)
      const userMap = new Map<string, { engagementScore: number; rsvpRate: number; features: EventFeatures[] }>();
      this.eventFeatures.forEach(event => {
        if (!userMap.has(event.anonymousUserId)) {
          userMap.set(event.anonymousUserId, {
            engagementScore: event.engagementScore,
            rsvpRate: event.rsvpRate,
            features: []
          });
        }
        userMap.get(event.anonymousUserId)!.features.push(event);
      });

      const kmeansFeatures = Array.from(userMap.values()).map(user => [
        user.engagementScore,
        user.rsvpRate
      ]);

      const kmeansTensor = tf.tensor2d(kmeansFeatures);
      const kmeansMoments = tf.moments(kmeansTensor, 0);
      this.scalerKmeans = {
        mean: kmeansMoments.mean as tf.Tensor1D,
        std: tf.add(tf.sqrt(kmeansMoments.variance), 1e-8) as tf.Tensor1D
      };
      const scaledKmeansFeatures = tf.div(tf.sub(kmeansTensor, this.scalerKmeans.mean), this.scalerKmeans.std);

      onProgress?.(70, '🎨 Identifying member behavior clusters...');

      // K-means clustering (k=3) with deterministic initialization
      const k = 3;

      // Deterministic centroid initialization based on data range
      // Initialize centroids at different regions of the scaled feature space
      const centroidsData = [
        [-1.0, -1.0], // Low engagement, low RSVP rate
        [0.0, 0.0],   // Medium engagement, medium RSVP rate
        [1.0, 1.0]    // High engagement, high RSVP rate
      ];
      this.kmeansCentroids = tf.variable(tf.tensor2d(centroidsData));

      const { centroids: finalCentroids, labels } = await this.kMeans(scaledKmeansFeatures as tf.Tensor2D, this.kmeansCentroids!, k);

      this.kmeansCentroids = finalCentroids;
      this.kmeansLabels = labels as number[];

      onProgress?.(90, '📊 Generating personalized insights...');

      // Assign clusters and predictions
      this.assignClustersAndPredictions();

      onProgress?.(100, '✅ Analysis complete! Your ML insights are ready.');
    } catch (error) {
      console.error('Training error:', error);
      if (error instanceof Error) {
        throw new Error(`Analysis failed: ${error.message}`);
      } else {
        throw new Error('Analysis failed due to an unexpected error. Please try again or contact support.');
      }
    }
  }

  private async kMeans(data: tf.Tensor2D, centroids: tf.Variable, k: number, maxIter = 100) {
    for (let i = 0; i < maxIter; i++) {
      const distances = tf.tidy(() => {
        const expandedData = data.expandDims(1);
        const expandedCentroids = centroids.expandDims(0);
        return tf.sum(tf.square(tf.sub(expandedData, expandedCentroids)), 2);
      });

      const labels = tf.argMin(distances, 1);
      distances.dispose();

      // Update centroids
      const newCentroids = tf.tidy(() => {
        const oneHot = tf.oneHot(labels, k).transpose();
        const counts = tf.sum(oneHot, 1).expandDims(1);
        const summed = tf.matMul(oneHot, data);
        return tf.div(summed, counts);
      });

      centroids.assign(newCentroids);
      newCentroids.dispose();
      labels.dispose();
    }

    // Final labels
    const distances = tf.tidy(() => {
      const expandedData = data.expandDims(1);
      const expandedCentroids = centroids.expandDims(0);
      return tf.sum(tf.square(tf.sub(expandedData, expandedCentroids)), 2);
    });
    const labels = tf.argMin(distances, 1);
    distances.dispose();

    const finalCentroids = centroids;
    const labelsArray = await labels.array();
    labels.dispose();

    return { centroids: finalCentroids, labels: labelsArray };
  }

  private assignClustersAndPredictions(): void {
    if (!this.logisticModel || !this.scalerLogistic || !this.kmeansCentroids || !this.scalerKmeans) return;

    // Create user cluster mapping
    const userClusters = new Map<string, number>();
    const userMap = new Map<string, { engagementScore: number; rsvpRate: number; features: EventFeatures[] }>();
    this.eventFeatures.forEach(event => {
      if (!userMap.has(event.anonymousUserId)) {
        userMap.set(event.anonymousUserId, {
          engagementScore: event.engagementScore,
          rsvpRate: event.rsvpRate,
          features: []
        });
      }
      userMap.get(event.anonymousUserId)!.features.push(event);
    });

    // Assign clusters to users
    let userIndex = 0;
    userMap.forEach((user, anonymousUserId) => {
      userClusters.set(anonymousUserId, this.kmeansLabels[userIndex]);
      userIndex++;
    });

    // Assign clusters and predictions to eventFeatures
    this.eventFeatures.forEach(event => {
      event.cluster = userClusters.get(event.anonymousUserId);

      // Predict RSVP probability
      const features = tf.tensor2d([[event.totalViews, event.totalLikes, event.totalPolls,
                                   event.totalFeedbacks, event.totalRSVPs, event.totalRegisters, event.totalEvaluations]]);
      const scaledFeatures = tf.div(tf.sub(features, this.scalerLogistic!.mean), this.scalerLogistic!.std);
      const prediction = this.logisticModel!.predict(scaledFeatures) as tf.Tensor;
      event.predictedRSVPProb = prediction.dataSync()[0];
      prediction.dispose();
      scaledFeatures.dispose();
      features.dispose();
    });
  }

  getUserPredictions(): EventFeatures[] {
    // Aggregate per user: average prediction across events
    const userPredictions = new Map<string, { user: EventFeatures; predictions: number[]; total: number }>();

    this.eventFeatures.forEach(event => {
      if (event.predictedRSVPProb !== undefined) {
        if (!userPredictions.has(event.anonymousUserId)) {
          userPredictions.set(event.anonymousUserId, { user: event, predictions: [], total: 0 });
        }
        userPredictions.get(event.anonymousUserId)!.predictions.push(event.predictedRSVPProb);
      }
    });

    const aggregated: EventFeatures[] = [];
    userPredictions.forEach(({ user, predictions }) => {
      const avgProb = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
      aggregated.push({
        ...user,
        predictedRSVPProb: avgProb
      });
    });

    return aggregated.sort((a, b) => (b.predictedRSVPProb || 0) - (a.predictedRSVPProb || 0));
  }

  getDynamicThresholds(): { high: number; medium: number } {
    const predictions = this.getUserPredictions();
    if (predictions.length === 0) return { high: 0.7, medium: 0.4 }; // fallback

    const probabilities = predictions.map(p => p.predictedRSVPProb || 0).sort((a, b) => a - b);

    // Use percentiles: top 33% as high, middle 33% as medium
    const highIndex = Math.floor(probabilities.length * 0.67); // 67th percentile
    const mediumIndex = Math.floor(probabilities.length * 0.33); // 33rd percentile

    return {
      high: probabilities[highIndex] || 0.7,
      medium: probabilities[mediumIndex] || 0.4
    };
  }

  getClusteredUsers(): { [cluster: number]: EventFeatures[] } {
    const clusters: { [key: number]: EventFeatures[] } = { 0: [], 1: [], 2: [] };
    this.eventFeatures.forEach(event => {
      if (event.cluster !== undefined) {
        clusters[event.cluster].push(event);
      }
    });
    return clusters;
  }

  exportToCSV(): string {
    if (!this.eventFeatures || this.eventFeatures.length === 0) {
      console.warn('No event features available for CSV export');
      return 'No data available';
    }

    console.log('Exporting', this.eventFeatures.length, 'records to CSV');

    const headers = ['Anonymous User ID', 'Event ID', 'Event Name', 'Total Views', 'Total Likes', 'Total Polls', 'Total Feedbacks', 'Total RSVPs', 'Total Registers', 'Total Evaluations', 'RSVP Rate (%)', 'Engagement Score', 'Has RSVP'];
    const rows = this.eventFeatures.map(event => [
      event.anonymousUserId || '',
      event.eventId || '',
      event.eventName || '',
      event.totalViews || 0,
      event.totalLikes || 0,
      event.totalPolls || 0,
      event.totalFeedbacks || 0,
      event.totalRSVPs || 0,
      event.totalRegisters || 0,
      event.totalEvaluations || 0,
      event.rsvpRate ? event.rsvpRate.toFixed(2) : '0.00',
      event.engagementScore || 0,
      event.hasRSVP || 0
    ]);

    const csvContent = [headers, ...rows].map(row => row.map((field: any) => `"${field}"`).join(',')).join('\n');
    console.log('Generated CSV with', rows.length, 'data rows');
    return csvContent;
  }

  getAllUserFeatures(): EventFeatures[] {
    return this.eventFeatures;
  }

  // User-friendly methods for layperson interpretation
  getClusterInsights(): { [cluster: number]: { description: string; characteristics: string[]; recommendations: string[] } } {
    const clusters = this.getClusteredUsers();
    const insights: { [cluster: number]: { description: string; characteristics: string[]; recommendations: string[] } } = {};

    Object.entries(clusters).forEach(([clusterId, users]) => {
      const cluster = parseInt(clusterId);
      const avgEngagement = users.reduce((sum, u) => sum + u.engagementScore, 0) / users.length;
      const avgRsvpRate = users.reduce((sum, u) => sum + u.rsvpRate, 0) / users.length;

      if (cluster === 0) {
        insights[cluster] = {
          description: "Casual Participants",
          characteristics: [
            "Lower overall engagement with events",
            "Less likely to RSVP to events",
            "May need more encouragement to participate"
          ],
          recommendations: [
            "Send gentle reminders about upcoming events",
            "Create low-commitment activities to build engagement",
            "Share success stories from active participants"
          ]
        };
      } else if (cluster === 1) {
        insights[cluster] = {
          description: "Regular Attendees",
          characteristics: [
            "Moderate engagement levels",
            "Consistent but not highly active participation",
            "Reliable event attendees when interested"
          ],
          recommendations: [
            "Provide more event details to increase RSVP rates",
            "Create opportunities for leadership roles",
            "Recognize their consistent participation"
          ]
        };
      } else if (cluster === 2) {
        insights[cluster] = {
          description: "Super Engaged Members",
          characteristics: [
            "Highly engaged with all organization activities",
            "Very likely to RSVP and participate in events",
            "Natural leaders and enthusiastic participants"
          ],
          recommendations: [
            "Involve them in planning and organizing events",
            "Ask for feedback on improving engagement",
            "Feature their stories to inspire others"
          ]
        };
      }
    });

    return insights;
  }

  getPredictionInsights(): { summary: string; topPredictors: string[]; actionItems: string[] } {
    const predictions = this.getUserPredictions();
    const thresholds = this.getDynamicThresholds();
    const highProbabilityUsers = predictions.filter(p => (p.predictedRSVPProb || 0) >= thresholds.high);
    const lowProbabilityUsers = predictions.filter(p => (p.predictedRSVPProb || 0) < thresholds.medium);

    return {
      summary: `Based on member behavior patterns, ${highProbabilityUsers.length} members are likely to RSVP to future events, while ${lowProbabilityUsers.length} may need extra encouragement.`,
      topPredictors: [
        "Members who frequently view event posts",
        "Those who have RSVPed to similar events before",
        "Users with high overall engagement scores"
      ],
      actionItems: [
        "Focus outreach efforts on predicted low-RSVP members",
        "Create personalized event recommendations",
        "Design targeted engagement campaigns"
      ]
    };
  }

  getDataQualityReport(): { quality: 'good' | 'fair' | 'poor'; message: string; suggestions: string[] } {
    const uniqueUsers = new Set(this.eventFeatures.map(e => e.anonymousUserId)).size;
    const totalEvents = new Set(this.eventFeatures.map(e => e.eventId)).size;
    const avgActionsPerUser = this.eventFeatures.length / uniqueUsers;

    if (uniqueUsers >= 20 && avgActionsPerUser >= 5) {
      return {
        quality: 'good',
        message: "Excellent data quality! Your analysis will provide reliable insights.",
        suggestions: ["Data looks great for ML analysis"]
      };
    } else if (uniqueUsers >= 10 && avgActionsPerUser >= 2) {
      return {
        quality: 'fair',
        message: `Fair data quality with ${uniqueUsers} active members. Results will be useful but consider gathering more data.`,
        suggestions: [
          "Try analyzing a longer time period",
          "Encourage more member participation",
          "Results are still meaningful but more data would improve accuracy"
        ]
      };
    } else {
      return {
        quality: 'poor',
        message: `Limited data available. Only ${uniqueUsers} members with sufficient activity.`,
        suggestions: [
          "Select a longer time range (90 days or more)",
          "Wait for more member activity before analysis",
          "Focus on increasing event participation first"
        ]
      };
    }
  }

  getEngagementScoreExplanation(): string {
    return "The Engagement Score measures how actively members participate in organization activities. It's calculated using this formula: **Engagement Score = (Total Views × 1) + (Total Likes × 5) + (Total Polls × 10) + (Total Feedbacks × 20) + (Total Registers × 20) + (Total Evaluations × 50)**. Different actions are weighted differently because they show varying levels of commitment - for example, providing feedback or registering for events indicates stronger engagement than just viewing a post.";
  }
}