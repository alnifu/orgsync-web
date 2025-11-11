import * as tf from '@tensorflow/tfjs';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';

export interface EventFeatures {
  userId: string;
  userName: string;
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
    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      throw new Error('No events found in the selected time window.');
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
    if (rsvpError) throw rsvpError;

    // Create RSVP map: eventId -> set of userIds who RSVPed
    const rsvpMap = new Map<string, Set<string>>();
    rsvps?.forEach(rsvp => {
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
    if (rewardError) throw rewardError;

    // Aggregate user-level features
    const userMap = new Map<string, {
      userName: string;
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
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userName: `${user.first_name} ${user.last_name}`,
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

    // Create event-level data: one record per user-event pair
    const eventFeatures: EventFeatures[] = [];
    const totalEvents = events.length;

    userMap.forEach((userData, userId) => {
      // Calculate user-level derived features
      const rsvpRate = totalEvents > 0 ? (userData.totalRSVPs / totalEvents) * 100 : 0;
      const engagementScore =
        userData.totalViews * 1 +
        userData.totalLikes * 5 +
        userData.totalPolls * 10 +
        userData.totalFeedbacks * 20 +
        userData.totalRegisters * 20 +
        userData.totalEvaluations * 50;

      events.forEach(event => {
        const hasRSVP = rsvpMap.get(event.id)?.has(userId) ? 1 : 0;

        eventFeatures.push({
          userId,
          userName: userData.userName,
          eventId: event.id,
          eventName: event.title || `Event ${event.id}`,
          totalViews: userData.totalViews,
          totalLikes: userData.totalLikes,
          totalPolls: userData.totalPolls,
          totalFeedbacks: userData.totalFeedbacks,
          totalRSVPs: userData.totalRSVPs,
          totalRegisters: userData.totalRegisters,
          totalEvaluations: userData.totalEvaluations,
          rsvpRate,
          engagementScore,
          hasRSVP
        });
      });
    });

    this.eventFeatures = eventFeatures;

    return this.eventFeatures;
  }

  hasEnoughData(): boolean {
    const uniqueUsers = new Set(this.eventFeatures.map(e => e.userId));
    return uniqueUsers.size >= 10;
  }

  async trainModels(onProgress?: (progress: number, message: string) => void): Promise<void> {
    if (!this.hasEnoughData()) {
      throw new Error('Insufficient data for training. Need at least 10 users with activity.');
    }

    onProgress?.(0, 'Preparing data...');

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

    onProgress?.(20, 'Training logistic regression...');

    // Train logistic regression
    this.logisticModel = tf.sequential();
    this.logisticModel.add(tf.layers.dense({ inputShape: [7], units: 1, activation: 'sigmoid' }));
    this.logisticModel.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });

    const labelTensor = tf.tensor1d(logisticLabels, 'float32');

    await this.logisticModel.fit(scaledLogisticFeatures, labelTensor, {
      epochs: 100,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const progress = 20 + (epoch / 100) * 40;
          onProgress?.(progress, `Logistic regression epoch ${epoch + 1}/100`);
        }
      }
    });

    onProgress?.(60, 'Preparing K-means data...');

    // Prepare K-means data (user-level)
    const userMap = new Map<string, { engagementScore: number; rsvpRate: number; features: EventFeatures[] }>();
    this.eventFeatures.forEach(event => {
      if (!userMap.has(event.userId)) {
        userMap.set(event.userId, {
          engagementScore: event.engagementScore,
          rsvpRate: event.rsvpRate,
          features: []
        });
      }
      userMap.get(event.userId)!.features.push(event);
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

    onProgress?.(70, 'Training K-means...');

    // K-means clustering (k=3)
    const k = 3;
    this.kmeansCentroids = tf.variable(tf.randomNormal([k, 2]));
    const { centroids: finalCentroids, labels } = await this.kMeans(scaledKmeansFeatures as tf.Tensor2D, this.kmeansCentroids!, k);

    this.kmeansCentroids = finalCentroids;
    this.kmeansLabels = labels as number[];

    onProgress?.(90, 'Assigning predictions and clusters...');

    // Assign clusters and predictions
    this.assignClustersAndPredictions();

    onProgress?.(100, 'Training complete!');
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
      if (!userMap.has(event.userId)) {
        userMap.set(event.userId, {
          engagementScore: event.engagementScore,
          rsvpRate: event.rsvpRate,
          features: []
        });
      }
      userMap.get(event.userId)!.features.push(event);
    });

    // Assign clusters to users
    let userIndex = 0;
    userMap.forEach((user, userId) => {
      userClusters.set(userId, this.kmeansLabels[userIndex]);
      userIndex++;
    });

    // Assign clusters and predictions to eventFeatures
    this.eventFeatures.forEach(event => {
      event.cluster = userClusters.get(event.userId);

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
        if (!userPredictions.has(event.userId)) {
          userPredictions.set(event.userId, { user: event, predictions: [], total: 0 });
        }
        userPredictions.get(event.userId)!.predictions.push(event.predictedRSVPProb);
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
    const headers = ['User ID', 'User Name', 'Event ID', 'Event Name', 'Total Views', 'Total Likes', 'Total Polls', 'Total Feedbacks', 'Total RSVPs', 'Total Registers', 'Total Evaluations', 'RSVP Rate (%)', 'Engagement Score', 'Has RSVP'];
    const rows = this.eventFeatures.map(event => [
      event.userId,
      event.userName,
      event.eventId,
      event.eventName,
      event.totalViews,
      event.totalLikes,
      event.totalPolls,
      event.totalFeedbacks,
      event.totalRSVPs,
      event.totalRegisters,
      event.totalEvaluations,
      event.rsvpRate.toFixed(2),
      event.engagementScore,
      event.hasRSVP
    ]);

    const csvContent = [headers, ...rows].map(row => row.map((field: any) => `"${field}"`).join(',')).join('\n');
    return csvContent;
  }

  getAllUserFeatures(): EventFeatures[] {
    return this.eventFeatures;
  }
}