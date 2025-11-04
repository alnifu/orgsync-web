import * as tf from '@tensorflow/tfjs';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';

export interface UserFeatures {
  userId: string;
  userName: string;
  totalViews: number;
  totalLikes: number;
  totalPolls: number;
  totalRsvps: number;
  totalRegisters: number;
  totalFeedbacks: number;
  totalEvaluates: number;
  engagementFrequency: number;
  interactionDiversity: number;
  rsvpRate: number;
  cluster?: number;
  predictedRsvpProb?: number;
}

export interface MLModels {
  kmeans: {
    centroids: tf.Tensor2D;
    labels: number[];
  };
  logistic: {
    weights: tf.Tensor2D;
    bias: tf.Tensor1D;
  };
}

export class MLService {
  private static instance: MLService;
  private models: MLModels | null = null;
  private userFeatures: UserFeatures[] = [];

  static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  async fetchUserData(orgId: string, timeWindow: '30d' | '90d' | 'all' = '30d'): Promise<UserFeatures[]> {
    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;

    if (timeWindow === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeWindow === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } // 'all' means no date filter

    // Fetch reward_log data for org members
    let query = supabase
      .from('reward_log')
      .select(`
        user_id,
        action,
        created_at,
        users!inner (
          id,
          first_name,
          last_name
        ),
        posts!inner (
          org_id
        )
      `)
      .eq('posts.org_id', orgId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Get all org members (officers/admins only)
    const { data: members, error: memberError } = await supabase
      .from('org_members')
      .select(`
        user_id,
        users (
          id,
          first_name,
          last_name
        )
      `)
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (memberError) throw memberError;

    // Aggregate data per user
    const userMap = new Map<string, UserFeatures>();

    // Initialize all members
    members?.forEach(member => {
      const user = member.users as User;
      userMap.set(member.user_id, {
        userId: member.user_id,
        userName: `${user.first_name} ${user.last_name}`,
        totalViews: 0,
        totalLikes: 0,
        totalPolls: 0,
        totalRsvps: 0,
        totalRegisters: 0,
        totalFeedbacks: 0,
        totalEvaluates: 0,
        engagementFrequency: 0,
        interactionDiversity: 0,
        rsvpRate: 0
      });
    });

    // Aggregate logs
    logs?.forEach(log => {
      const user = userMap.get(log.user_id);
      if (!user) return;

      switch (log.action) {
        case 'view': user.totalViews++; break;
        case 'like': user.totalLikes++; break;
        case 'poll': user.totalPolls++; break;
        case 'rsvp': user.totalRsvps++; break;
        case 'register': user.totalRegisters++; break;
        case 'feedback': user.totalFeedbacks++; break;
        case 'evaluate': user.totalEvaluates++; break;
      }
    });

    // Calculate derived features
    const totalEvents = await this.getTotalEvents(orgId, startDate);
    userMap.forEach(user => {
      user.engagementFrequency = user.totalViews + user.totalLikes + user.totalPolls +
                                user.totalRsvps + user.totalRegisters + user.totalFeedbacks + user.totalEvaluates;

      const uniqueActions = [user.totalViews > 0, user.totalLikes > 0, user.totalPolls > 0,
                            user.totalRsvps > 0, user.totalRegisters > 0, user.totalFeedbacks > 0, user.totalEvaluates > 0]
                            .filter(Boolean).length;
      user.interactionDiversity = uniqueActions;

      user.rsvpRate = totalEvents > 0 ? (user.totalRsvps / totalEvents) * 100 : 0;
    });

    this.userFeatures = Array.from(userMap.values());
    return this.userFeatures;
  }

  private async getTotalEvents(orgId: string, startDate: Date | null): Promise<number> {
    let query = supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('post_type', 'event');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { count } = await query;
    return count || 0;
  }

  async trainModels(): Promise<void> {
    if (this.userFeatures.length < 10) {
      throw new Error('Insufficient data for training. Need at least 10 users with activity.');
    }

    // Prepare feature matrix for clustering
    const features = this.userFeatures.map(user => [
      user.totalViews,
      user.totalLikes,
      user.totalPolls,
      user.totalRsvps,
      user.totalRegisters,
      user.totalFeedbacks,
      user.totalEvaluates,
      user.engagementFrequency,
      user.interactionDiversity,
      user.rsvpRate
    ]);

    const featureTensor = tf.tensor2d(features);

    // K-means clustering (k=3)
    const k = 3;
    const centroids = tf.variable(tf.randomNormal([k, features[0].length]));
    const { centroids: finalCentroids, labels } = await this.kMeans(featureTensor, centroids, k);

    // Logistic regression for RSVP prediction
    // Use historical RSVPs as labels (simplified: if user has RSVPed to any event, label=1)
    const labelsLogistic = this.userFeatures.map(user => user.totalRsvps > 0 ? 1 : 0);
    const labelTensor = tf.tensor1d(labelsLogistic, 'int32');

    const { weights: finalWeights, bias: finalBias } = await this.trainLogisticRegression(featureTensor, labelTensor);

    this.models = {
      kmeans: { centroids: finalCentroids as unknown as tf.Tensor2D, labels: labels as number[] },
      logistic: { weights: finalWeights as unknown as tf.Tensor2D, bias: finalBias as unknown as tf.Tensor1D }
    };

    // Assign clusters and predictions to users
    this.assignClustersAndPredictions();
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
    const finalLabels = tf.argMin(distances, 1);
    distances.dispose();

    const finalCentroids = tf.tidy(() => centroids);
    const labelsArray = await finalLabels.array();
    finalLabels.dispose();

    return { centroids: finalCentroids, labels: labelsArray };
  }

  private async trainLogisticRegression(features: tf.Tensor2D, labels: tf.Tensor1D, learningRate = 0.01, epochs = 100) {
    const numFeatures = features.shape[1];
    const weights = tf.variable(tf.randomNormal([numFeatures, 1]));
    const bias = tf.variable(tf.scalar(0));

    for (let epoch = 0; epoch < epochs; epoch++) {
      tf.tidy(() => {
        // Manual gradient computation
        const dWeights = tf.grad((w: tf.Tensor) => {
          const pred = tf.sigmoid(tf.add(tf.matMul(features, w), bias));
          return tf.losses.sigmoidCrossEntropy(labels.expandDims(1), pred);
        })(weights);

        const dBias = tf.grad((b: tf.Tensor) => {
          const pred = tf.sigmoid(tf.add(tf.matMul(features, weights), b));
          return tf.losses.sigmoidCrossEntropy(labels.expandDims(1), pred);
        })(bias);

        weights.assign(tf.sub(weights, tf.mul(dWeights, learningRate)));
        bias.assign(tf.sub(bias, tf.mul(dBias, learningRate)));
      });
    }

    const finalWeights = tf.tidy(() => weights);
    const finalBias = tf.tidy(() => bias);

    return { weights: finalWeights, bias: finalBias };
  }

  private assignClustersAndPredictions(): void {
    if (!this.models) return;

    this.userFeatures.forEach((user, index) => {
      user.cluster = this.models!.kmeans.labels[index];

      // Predict RSVP probability
      const features = tf.tensor2d([[user.totalViews, user.totalLikes, user.totalPolls, user.totalRsvps,
                                   user.totalRegisters, user.totalFeedbacks, user.totalEvaluates,
                                   user.engagementFrequency, user.interactionDiversity, user.rsvpRate]]);
      const prediction = tf.tidy(() => {
        const logit = tf.add(tf.matMul(features, this.models!.logistic.weights), this.models!.logistic.bias);
        return tf.sigmoid(logit);
      });
      user.predictedRsvpProb = prediction.dataSync()[0];
      prediction.dispose();
      features.dispose();
    });
  }

  getClusteredUsers(): { low: UserFeatures[], medium: UserFeatures[], high: UserFeatures[] } {
    const clusters = { low: [], medium: [], high: [] } as any;

    this.userFeatures.forEach(user => {
      if (user.cluster === 0) clusters.low.push(user);
      else if (user.cluster === 1) clusters.medium.push(user);
      else if (user.cluster === 2) clusters.high.push(user);
    });

    // Sort clusters by engagement (assuming cluster 0 is low, 1 medium, 2 high - adjust if needed)
    const avgEngagement = (users: UserFeatures[]) =>
      users.reduce((sum, u) => sum + u.engagementFrequency, 0) / users.length;

    const sortedClusters = (Object.entries(clusters) as [string, UserFeatures[]][]).sort(([,a], [,b]) => avgEngagement(a) - avgEngagement(b));
    return {
      low: sortedClusters[0][1],
      medium: sortedClusters[1][1],
      high: sortedClusters[2][1]
    };
  }

  getUserPredictions(): UserFeatures[] {
    return this.userFeatures
      .filter(user => user.predictedRsvpProb !== undefined)
      .sort((a, b) => (b.predictedRsvpProb || 0) - (a.predictedRsvpProb || 0));
  }

  hasEnoughData(): boolean {
    return this.userFeatures.length >= 10 && this.userFeatures.some(u => u.engagementFrequency > 0);
  }
}