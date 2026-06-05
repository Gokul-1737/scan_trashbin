import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { StatsCard } from '@/components/admin/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users,
  Search,
  User,
  Star,
  Ban,
  CheckCircle,
  History,
  Loader2,
  Mail,
  Calendar,
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  total_points: number;
  is_blocked: boolean;
  created_at: string;
}

const UsersManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch user history
  const { data: userHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['user-history', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data, error } = await supabase
        .from('waste_logs')
        .select(`
          *,
          waste_types (name, icon),
          bins (bin_name)
        `)
        .eq('user_id', selectedUser.user_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser,
  });

  // Toggle block status
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, is_blocked }: { id: string; is_blocked: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { is_blocked }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(is_blocked ? 'User blocked' : 'User unblocked');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  // Reset points mutation
  const resetPointsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ total_points: 0 })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Points reset to 0');
    },
    onError: () => {
      toast.error('Failed to reset points');
    },
  });

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPoints = users?.reduce((acc, u) => acc + u.total_points, 0) || 0;
  const blockedCount = users?.filter(u => u.is_blocked).length || 0;

  const columns = [
    {
      key: 'full_name',
      header: 'User',
      render: (row: Profile) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.full_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'total_points',
      header: 'Points',
      render: (row: Profile) => (
        <Badge className="bg-warning/10 text-warning">
          <Star className="w-3 h-3 mr-1" />
          {row.total_points.toLocaleString()}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row: Profile) => (
        <span className="text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'is_blocked',
      header: 'Status',
      render: (row: Profile) => (
        row.is_blocked ? (
          <Badge variant="destructive">
            <Ban className="w-3 h-3 mr-1" />
            Blocked
          </Badge>
        ) : (
          <Badge className="bg-success/10 text-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Profile) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(row);
              setIsHistoryOpen(true);
            }}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={row.is_blocked ? 'text-success' : 'text-destructive'}
            onClick={() => toggleBlockMutation.mutate({ 
              id: row.id, 
              is_blocked: !row.is_blocked 
            })}
          >
            {row.is_blocked ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const historyColumns = [
    {
      key: 'waste_types.icon',
      header: '',
      className: 'w-12',
      render: (row: any) => <span className="text-xl">{row.waste_types?.icon || '♻️'}</span>,
    },
    {
      key: 'waste_types.name',
      header: 'Type',
      render: (row: any) => row.waste_types?.name || 'Unknown',
    },
    {
      key: 'weight_kg',
      header: 'Weight',
      render: (row: any) => `${row.weight_kg} kg`,
    },
    {
      key: 'points_earned',
      header: 'Points',
      render: (row: any) => (
        <Badge className="bg-success/10 text-success">+{row.points_earned}</Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
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
          <Users className="w-8 h-8 text-primary" />
          User Management
        </h1>
        <p className="text-muted-foreground">
          View and manage all registered users
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Users"
          value={users?.length || 0}
          icon={Users}
          variant="primary"
          delay={0}
        />
        <StatsCard
          title="Total Points in System"
          value={totalPoints.toLocaleString()}
          icon={Star}
          variant="warning"
          delay={0.1}
        />
        <StatsCard
          title="Blocked Users"
          value={blockedCount}
          icon={Ban}
          variant="default"
          delay={0.2}
        />
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <DataTable
          title="All Users"
          columns={columns}
          data={filteredUsers}
          isLoading={isLoading}
          emptyMessage="No users found"
        />
      </motion.div>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recycling History - {selectedUser?.full_name}
            </DialogTitle>
            <DialogDescription>
              View user's recycling activity and point history
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-4 mb-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-warning" />
                <span className="font-medium">Current Points:</span>
                <Badge className="bg-warning/10 text-warning">
                  {selectedUser?.total_points.toLocaleString()}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to reset this user\'s points to 0?')) {
                    resetPointsMutation.mutate(selectedUser!.id);
                  }
                }}
              >
                Reset Points
              </Button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : userHistory && userHistory.length > 0 ? (
              <DataTable
                columns={historyColumns}
                data={userHistory}
                emptyMessage="No recycling history"
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No recycling history found
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
