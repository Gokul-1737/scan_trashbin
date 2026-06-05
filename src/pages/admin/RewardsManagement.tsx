import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Gift,
  Edit,
  Trash2,
  Star,
  Wallet,
  Ticket,
  Package,
  Loader2,
} from 'lucide-react';

interface Reward {
  id: string;
  reward_name: string;
  description: string | null;
  reward_type: 'cash' | 'coupon' | 'gift';
  points_required: number;
  stock: number | null;
  image_url: string | null;
  is_enabled: boolean;
  created_at: string;
}

const rewardTypeIcons = {
  cash: Wallet,
  coupon: Ticket,
  gift: Package,
};

const RewardsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const [formData, setFormData] = useState<{
    reward_name: string;
    description: string;
    reward_type: 'cash' | 'coupon' | 'gift';
    points_required: number;
    stock: string;
    image_url: string;
  }>({
    reward_name: '',
    description: '',
    reward_type: 'gift',
    points_required: 100,
    stock: '',
    image_url: '',
  });

  // Fetch rewards
  const { data: rewards, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Reward[];
    },
  });

  // Add reward mutation
  const addRewardMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('rewards')
        .insert([{
          reward_name: data.reward_name,
          description: data.description || null,
          reward_type: data.reward_type,
          points_required: data.points_required,
          stock: data.stock ? parseInt(data.stock) : null,
          image_url: data.image_url || null,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward added successfully! 🎁');
      setIsAddOpen(false);
      setFormData({
        reward_name: '',
        description: '',
        reward_type: 'gift',
        points_required: 100,
        stock: '',
        image_url: '',
      });
    },
    onError: () => {
      toast.error('Failed to add reward');
    },
  });

  // Toggle reward status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('rewards')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward status updated');
    },
    onError: () => {
      toast.error('Failed to update reward');
    },
  });

  // Update reward mutation
  const updateRewardMutation = useMutation({
    mutationFn: async (data: Partial<Reward> & { id: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('rewards')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward updated');
      setIsEditOpen(false);
    },
    onError: () => {
      toast.error('Failed to update reward');
    },
  });

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward deleted');
    },
    onError: () => {
      toast.error('Failed to delete reward');
    },
  });

  const columns = [
    {
      key: 'reward_type',
      header: '',
      className: 'w-12',
      render: (row: Reward) => {
        const Icon = rewardTypeIcons[row.reward_type];
        return (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        );
      },
    },
    {
      key: 'reward_name',
      header: 'Reward',
      render: (row: Reward) => (
        <div>
          <span className="font-medium">{row.reward_name}</span>
          {row.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'reward_type',
      header: 'Type',
      render: (row: Reward) => (
        <Badge variant="secondary" className="capitalize">
          {row.reward_type}
        </Badge>
      ),
    },
    {
      key: 'points_required',
      header: 'Points',
      render: (row: Reward) => (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <Star className="w-3 h-3 mr-1" />
          {row.points_required.toLocaleString()}
        </Badge>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (row: Reward) => (
        <span className={row.stock === 0 ? 'text-destructive' : 'text-muted-foreground'}>
          {row.stock !== null ? row.stock : '∞'}
        </span>
      ),
    },
    {
      key: 'is_enabled',
      header: 'Active',
      render: (row: Reward) => (
        <Switch
          checked={row.is_enabled}
          onCheckedChange={(checked) => 
            toggleMutation.mutate({ id: row.id, is_enabled: checked })
          }
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Reward) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedReward(row);
              setIsEditOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Are you sure you want to delete this reward?')) {
                deleteRewardMutation.mutate(row.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary" />
            Rewards Management
          </h1>
          <p className="text-muted-foreground">
            Configure rewards that users can redeem with their points
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Reward
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Add New Reward
              </DialogTitle>
              <DialogDescription>
                Create a new reward for users to redeem
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reward Name *</Label>
                <Input
                  placeholder="₹100 Cash Reward"
                  value={formData.reward_name}
                  onChange={(e) => setFormData({ ...formData, reward_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the reward..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.reward_type}
                    onValueChange={(value: 'cash' | 'coupon' | 'gift') => 
                      setFormData({ ...formData, reward_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💰 Cash</SelectItem>
                      <SelectItem value="coupon">🎫 Coupon</SelectItem>
                      <SelectItem value="gift">🎁 Gift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Points Required *</Label>
                  <Input
                    type="number"
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="gradient-primary"
                onClick={() => addRewardMutation.mutate(formData)}
                disabled={!formData.reward_name || !formData.points_required || addRewardMutation.isPending}
              >
                {addRewardMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Add Reward'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Rewards Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          title="All Rewards"
          columns={columns}
          data={rewards || []}
          isLoading={isLoading}
          emptyMessage="No rewards configured yet"
        />
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reward Name</Label>
              <Input
                value={selectedReward?.reward_name || ''}
                onChange={(e) => setSelectedReward(prev => prev ? { ...prev, reward_name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={selectedReward?.description || ''}
                onChange={(e) => setSelectedReward(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points Required</Label>
                <Input
                  type="number"
                  value={selectedReward?.points_required || 0}
                  onChange={(e) => setSelectedReward(prev => prev ? { ...prev, points_required: parseInt(e.target.value) || 0 } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={selectedReward?.stock ?? ''}
                  onChange={(e) => setSelectedReward(prev => prev ? { ...prev, stock: e.target.value ? parseInt(e.target.value) : null } : null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="gradient-primary"
              onClick={() => selectedReward && updateRewardMutation.mutate({
                id: selectedReward.id,
                reward_name: selectedReward.reward_name,
                description: selectedReward.description,
                points_required: selectedReward.points_required,
                stock: selectedReward.stock,
              })}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RewardsManagement;
