import React from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { StatsCard } from '@/components/admin/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  Star,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RewardRequest {
  id: string;
  user_id: string;
  reward_id: string;
  points_used: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  rewards: {
    reward_name: string;
    reward_type: string;
  } | null;
}

const RewardRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch reward requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['reward-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reward_requests')
        .select(`
          *,
          rewards (reward_name, reward_type)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data?.map(r => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || null,
      })) as RewardRequest[];
    },
  });

  // Process request mutation
  const processMutation = useMutation({
    mutationFn: async ({ id, status, userId, points }: { 
      id: string; 
      status: 'approved' | 'rejected';
      userId: string;
      points: number;
    }) => {
      // Update request status
      const { error: requestError } = await supabase
        .from('reward_requests')
        .update({ 
          status, 
          processed_at: new Date().toISOString(),
          processed_by: user?.id 
        })
        .eq('id', id);
      
      if (requestError) throw requestError;

      // If approved, deduct points from user
      if (status === 'approved') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', userId)
          .single();

        if (profileError) throw profileError;

        const newPoints = Math.max(0, (profile?.total_points || 0) - points);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ total_points: newPoints })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['reward-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(status === 'approved' ? 'Request approved! Points deducted.' : 'Request rejected.');
    },
    onError: () => {
      toast.error('Failed to process request');
    },
  });

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = requests?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = requests?.filter(r => r.status === 'rejected').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const columns = [
    {
      key: 'profiles.full_name',
      header: 'User',
      render: (row: RewardRequest) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.profiles?.full_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{row.profiles?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'rewards.reward_name',
      header: 'Reward',
      render: (row: RewardRequest) => (
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <span>{row.rewards?.reward_name || 'Unknown'}</span>
          <Badge variant="secondary" className="text-xs capitalize">
            {row.rewards?.reward_type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'points_used',
      header: 'Points',
      render: (row: RewardRequest) => (
        <Badge className="bg-warning/10 text-warning">
          <Star className="w-3 h-3 mr-1" />
          {row.points_used.toLocaleString()}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Request Date',
      render: (row: RewardRequest) => (
        <span className="text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: RewardRequest) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: RewardRequest) => (
        row.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => processMutation.mutate({
                id: row.id,
                status: 'approved',
                userId: row.user_id,
                points: row.points_used,
              })}
              disabled={processMutation.isPending}
            >
              {processMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => processMutation.mutate({
                id: row.id,
                status: 'rejected',
                userId: row.user_id,
                points: row.points_used,
              })}
              disabled={processMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            {row.processed_at && new Date(row.processed_at).toLocaleString()}
          </span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <CheckCircle className="w-8 h-8 text-primary" />
          Reward Request Approval
        </h1>
        <p className="text-muted-foreground">
          Review and process user reward redemption requests
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Pending Requests"
          value={pendingCount}
          icon={Clock}
          variant="warning"
          delay={0}
        />
        <StatsCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle}
          variant="success"
          delay={0.1}
        />
        <StatsCard
          title="Rejected"
          value={rejectedCount}
          icon={XCircle}
          variant="default"
          delay={0.2}
        />
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20"
        >
          <AlertCircle className="w-5 h-5 text-warning" />
          <p className="text-warning font-medium">
            You have {pendingCount} pending request{pendingCount > 1 ? 's' : ''} awaiting review
          </p>
        </motion.div>
      )}

      {/* Requests Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <DataTable
          title="All Requests"
          columns={columns}
          data={requests || []}
          isLoading={isLoading}
          emptyMessage="No reward requests yet"
        />
      </motion.div>
    </div>
  );
};

export default RewardRequests;
