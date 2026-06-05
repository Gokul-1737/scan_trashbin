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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Plus,
  Recycle,
  Leaf,
  Edit,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';

interface WasteType {
  id: string;
  name: string;
  type: string;
  points_per_kg: number;
  is_enabled: boolean;
  icon: string;
  created_at: string;
}

interface BonusDay {
  id: string;
  name: string;
  date: string;
  multiplier: number;
  is_active: boolean;
}

const WasteManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WasteType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'wet',
    points_per_kg: 10,
    icon: '♻️',
  });

  const [bonusData, setBonusData] = useState({
    name: '',
    date: '',
    multiplier: 2.0,
  });

  // Fetch waste types
  const { data: wasteTypes, isLoading } = useQuery({
    queryKey: ['waste-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_types')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as WasteType[];
    },
  });

  // Fetch bonus days
  const { data: bonusDays } = useQuery({
    queryKey: ['bonus-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_days')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as BonusDay[];
    },
  });

  // Toggle waste type status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('waste_types')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-types'] });
      toast.success('Waste type updated');
    },
    onError: () => {
      toast.error('Failed to update waste type');
    },
  });

  // Update points
  const updatePointsMutation = useMutation({
    mutationFn: async ({ id, points_per_kg }: { id: string; points_per_kg: number }) => {
      const { error } = await supabase
        .from('waste_types')
        .update({ points_per_kg })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-types'] });
      toast.success('Points updated');
      setIsEditOpen(false);
    },
    onError: () => {
      toast.error('Failed to update points');
    },
  });

  // Add bonus day
  const addBonusDayMutation = useMutation({
    mutationFn: async (data: typeof bonusData) => {
      const { error } = await supabase
        .from('bonus_days')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-days'] });
      toast.success('Bonus day added! 🎉');
      setIsBonusOpen(false);
      setBonusData({ name: '', date: '', multiplier: 2.0 });
    },
    onError: () => {
      toast.error('Failed to add bonus day');
    },
  });

  const columns = [
    {
      key: 'icon',
      header: '',
      className: 'w-12',
      render: (row: WasteType) => (
        <span className="text-2xl">{row.icon}</span>
      ),
    },
    {
      key: 'name',
      header: 'Waste Type',
      render: (row: WasteType) => (
        <div>
          <span className="font-medium">{row.name}</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {row.type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'points_per_kg',
      header: 'Points/kg',
      render: (row: WasteType) => (
        <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
          {row.points_per_kg} pts
        </Badge>
      ),
    },
    {
      key: 'is_enabled',
      header: 'Status',
      render: (row: WasteType) => (
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
      render: (row: WasteType) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedType(row);
            setIsEditOpen(true);
          }}
        >
          <Edit className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const bonusColumns = [
    {
      key: 'name',
      header: 'Event Name',
      render: (row: BonusDay) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: BonusDay) => (
        <Badge variant="secondary">
          {new Date(row.date).toLocaleDateString()}
        </Badge>
      ),
    },
    {
      key: 'multiplier',
      header: 'Multiplier',
      render: (row: BonusDay) => (
        <Badge className="bg-warning text-warning-foreground">
          {row.multiplier}x Points
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (row: BonusDay) => (
        <Badge variant={row.is_active ? 'default' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
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
            <Recycle className="w-8 h-8 text-primary" />
            Waste & Points Management
          </h1>
          <p className="text-muted-foreground">
            Configure waste categories and point values
          </p>
        </div>
      </motion.div>

      {/* Waste Types Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          title="Waste Categories"
          columns={columns}
          data={wasteTypes || []}
          isLoading={isLoading}
          emptyMessage="No waste types configured"
        />
      </motion.div>

      {/* Bonus Days Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DataTable
          title="🎉 Bonus Point Days"
          columns={bonusColumns}
          data={bonusDays || []}
          emptyMessage="No bonus days scheduled"
          actions={
            <Dialog open={isBonusOpen} onOpenChange={setIsBonusOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bonus Day
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-warning" />
                    Schedule Bonus Day
                  </DialogTitle>
                  <DialogDescription>
                    Add a special day with bonus point multipliers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Event Name</Label>
                    <Input
                      placeholder="Earth Day Special"
                      value={bonusData.name}
                      onChange={(e) => setBonusData({ ...bonusData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={bonusData.date}
                      onChange={(e) => setBonusData({ ...bonusData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Point Multiplier</Label>
                    <Select
                      value={String(bonusData.multiplier)}
                      onValueChange={(value) => setBonusData({ ...bonusData, multiplier: parseFloat(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5">1.5x Points</SelectItem>
                        <SelectItem value="2">2x Points</SelectItem>
                        <SelectItem value="2.5">2.5x Points</SelectItem>
                        <SelectItem value="3">3x Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBonusOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="gradient-primary"
                    onClick={() => addBonusDayMutation.mutate(bonusData)}
                    disabled={!bonusData.name || !bonusData.date}
                  >
                    Add Bonus Day
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />
      </motion.div>

      {/* Edit Points Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Points for {selectedType?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Points per kg</Label>
              <Input
                type="number"
                value={selectedType?.points_per_kg || 0}
                onChange={(e) => setSelectedType(prev => prev ? { ...prev, points_per_kg: parseInt(e.target.value) } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="gradient-primary"
              onClick={() => selectedType && updatePointsMutation.mutate({ 
                id: selectedType.id, 
                points_per_kg: selectedType.points_per_kg 
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

export default WasteManagement;
