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
import { StatsCard } from '@/components/admin/StatsCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  MapPin,
  Activity,
  Edit,
  Power,
  Loader2,
} from 'lucide-react';

interface Bin {
  id: string;
  bin_id: string;
  bin_name: string;
  location: string | null;
  status: boolean;
  total_waste_collected: number;
  created_at: string;
}

const BinsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const [formData, setFormData] = useState({
    bin_id: '',
    bin_name: '',
    location: '',
  });

  // Fetch bins
  const { data: bins, isLoading } = useQuery({
    queryKey: ['bins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bins')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Bin[];
    },
  });

  // Add bin mutation
  const addBinMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('bins')
        .insert([{ ...data, location: data.location || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      toast.success('Bin added successfully! 🗑️');
      setIsAddOpen(false);
      setFormData({ bin_id: '', bin_name: '', location: '' });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Bin ID already exists');
      } else {
        toast.error('Failed to add bin');
      }
    },
  });

  // Toggle bin status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase
        .from('bins')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      toast.success('Bin status updated');
    },
    onError: () => {
      toast.error('Failed to update bin status');
    },
  });

  // Update bin mutation
  const updateBinMutation = useMutation({
    mutationFn: async (data: Partial<Bin> & { id: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('bins')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      toast.success('Bin updated successfully');
      setIsEditOpen(false);
    },
    onError: () => {
      toast.error('Failed to update bin');
    },
  });

  // Delete bin mutation
  const deleteBinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bins')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      toast.success('Bin deleted');
    },
    onError: () => {
      toast.error('Failed to delete bin');
    },
  });

  const activeBins = bins?.filter(b => b.status).length || 0;
  const totalWaste = bins?.reduce((acc, b) => acc + Number(b.total_waste_collected), 0) || 0;

  const columns = [
    {
      key: 'bin_id',
      header: 'Bin ID',
      render: (row: Bin) => (
        <Badge variant="outline" className="font-mono">
          {row.bin_id}
        </Badge>
      ),
    },
    {
      key: 'bin_name',
      header: 'Name',
      render: (row: Bin) => (
        <span className="font-medium">{row.bin_name}</span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: Bin) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{row.location || 'Not set'}</span>
        </div>
      ),
    },
    {
      key: 'total_waste_collected',
      header: 'Total Waste',
      render: (row: Bin) => (
        <Badge variant="secondary" className="bg-success/10 text-success">
          {Number(row.total_waste_collected).toFixed(1)} kg
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Bin) => (
        <Switch
          checked={row.status}
          onCheckedChange={(checked) => 
            toggleMutation.mutate({ id: row.id, status: checked })
          }
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Bin) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBin(row);
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
              if (confirm('Are you sure you want to delete this bin?')) {
                deleteBinMutation.mutate(row.id);
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
            <Trash2 className="w-8 h-8 text-primary" />
            Bins Management
          </h1>
          <p className="text-muted-foreground">
            Manage recycle bins and track their activity
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add New Bin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-primary" />
                Add New Recycle Bin
              </DialogTitle>
              <DialogDescription>
                Register a new recycling bin in the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Bin ID *</Label>
                <Input
                  placeholder="BIN-001"
                  value={formData.bin_id}
                  onChange={(e) => setFormData({ ...formData, bin_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bin Name *</Label>
                <Input
                  placeholder="Main Entrance Bin"
                  value={formData.bin_name}
                  onChange={(e) => setFormData({ ...formData, bin_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Location (Optional)</Label>
                <Input
                  placeholder="Building A, Floor 1"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="gradient-primary"
                onClick={() => addBinMutation.mutate(formData)}
                disabled={!formData.bin_id || !formData.bin_name || addBinMutation.isPending}
              >
                {addBinMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Add Bin'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Bins"
          value={bins?.length || 0}
          icon={Trash2}
          variant="primary"
          delay={0}
        />
        <StatsCard
          title="Active Bins"
          value={activeBins}
          icon={Power}
          variant="success"
          delay={0.1}
        />
        <StatsCard
          title="Total Waste Collected"
          value={`${totalWaste.toFixed(1)} kg`}
          icon={Activity}
          variant="info"
          delay={0.2}
        />
      </div>

      {/* Bins Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <DataTable
          title="All Bins"
          columns={columns}
          data={bins || []}
          isLoading={isLoading}
          emptyMessage="No bins registered yet"
        />
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bin Name</Label>
              <Input
                value={selectedBin?.bin_name || ''}
                onChange={(e) => setSelectedBin(prev => prev ? { ...prev, bin_name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={selectedBin?.location || ''}
                onChange={(e) => setSelectedBin(prev => prev ? { ...prev, location: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="gradient-primary"
              onClick={() => selectedBin && updateBinMutation.mutate({
                id: selectedBin.id,
                bin_name: selectedBin.bin_name,
                location: selectedBin.location,
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

export default BinsManagement;
