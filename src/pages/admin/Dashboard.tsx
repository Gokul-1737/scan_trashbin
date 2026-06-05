import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/admin/StatsCard';
import { DataTable } from '@/components/admin/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Recycle,
  Star,
  Gift,
  TrendingUp,
  Droplets,
  Package,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const Dashboard: React.FC = () => {
  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [usersRes, wasteRes, rewardsRes, requestsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('waste_logs').select('weight_kg, points_earned, waste_type_id'),
        supabase.from('rewards').select('id', { count: 'exact', head: true }),
        supabase.from('reward_requests').select('id, status'),
      ]);

      const totalWaste = wasteRes.data?.reduce((acc, log) => acc + Number(log.weight_kg), 0) || 0;
      const totalPoints = wasteRes.data?.reduce((acc, log) => acc + log.points_earned, 0) || 0;
      const approvedRequests = requestsRes.data?.filter(r => r.status === 'approved').length || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalWaste: totalWaste.toFixed(1),
        totalPoints,
        totalRewards: rewardsRes.count || 0,
        redeemedRewards: approvedRequests,
      };
    },
  });

  // Fetch waste types for pie chart
  const { data: wasteTypes } = useQuery({
    queryKey: ['waste-type-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('waste_types').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_logs')
        .select(`
          id,
          weight_kg,
          points_earned,
          created_at,
          waste_types (name, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Mock data for charts (will be replaced with real data)
  const dailyWasteData = [
    { day: 'Mon', waste: 45 },
    { day: 'Tue', waste: 52 },
    { day: 'Wed', waste: 38 },
    { day: 'Thu', waste: 65 },
    { day: 'Fri', waste: 48 },
    { day: 'Sat', waste: 72 },
    { day: 'Sun', waste: 55 },
  ];

  const wasteDistributionData = [
    { name: 'Wet Waste', value: 35, color: 'hsl(142, 76%, 36%)' },
    { name: 'Dry Waste', value: 25, color: 'hsl(38, 92%, 50%)' },
    { name: 'Plastic', value: 20, color: 'hsl(199, 89%, 48%)' },
    { name: 'Metal', value: 10, color: 'hsl(280, 65%, 60%)' },
    { name: 'Glass', value: 7, color: 'hsl(340, 82%, 52%)' },
    { name: 'E-Waste', value: 3, color: 'hsl(0, 0%, 45%)' },
  ];

  const activityColumns = [
    {
      key: 'waste_types.icon',
      header: '',
      className: 'w-12',
      render: (row: any) => (
        <span className="text-2xl">{row.waste_types?.icon || '♻️'}</span>
      ),
    },
    {
      key: 'waste_types.name',
      header: 'Type',
      render: (row: any) => (
        <span className="font-medium">{row.waste_types?.name || 'Unknown'}</span>
      ),
    },
    {
      key: 'weight_kg',
      header: 'Weight',
      render: (row: any) => (
        <Badge variant="secondary">{row.weight_kg} kg</Badge>
      ),
    },
    {
      key: 'points_earned',
      header: 'Points',
      render: (row: any) => (
        <span className="text-primary font-semibold">+{row.points_earned}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Time',
      render: (row: any) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.created_at).toLocaleTimeString()}
        </span>
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
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your recycling overview.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Live Updates</span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
          delay={0}
        />
        <StatsCard
          title="Waste Collected"
          value={`${stats?.totalWaste || 0} kg`}
          icon={Recycle}
          variant="success"
          trend={{ value: 8, isPositive: true }}
          delay={0.1}
        />
        <StatsCard
          title="Points Issued"
          value={stats?.totalPoints?.toLocaleString() || 0}
          icon={Star}
          variant="warning"
          trend={{ value: 15, isPositive: true }}
          delay={0.2}
        />
        <StatsCard
          title="Rewards Redeemed"
          value={stats?.redeemedRewards || 0}
          icon={Gift}
          variant="info"
          trend={{ value: 5, isPositive: true }}
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Daily Waste */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Daily Waste Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyWasteData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="waste"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - Waste Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Droplets className="w-5 h-5 text-info" />
                Waste Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={wasteDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {wasteDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <DataTable
          title="Recent Activity"
          columns={activityColumns}
          data={recentActivity || []}
          isLoading={activityLoading}
          emptyMessage="No recent activity"
        />
      </motion.div>
    </div>
  );
};

export default Dashboard;
