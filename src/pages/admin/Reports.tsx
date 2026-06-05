import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Users,
  Gift,
  Recycle,
  Loader2,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState('last7days');
  const [reportType, setReportType] = useState('waste');
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'last7days':
        return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'last30days':
        return { start: format(subDays(now, 30), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'thisMonth':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      default:
        return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    }
  };

  // Fetch report summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-summary', dateRange],
    queryFn: async () => {
      const range = getDateRange();
      
      const [wasteRes, usersRes, rewardsRes] = await Promise.all([
        supabase
          .from('waste_logs')
          .select('weight_kg, points_earned')
          .gte('created_at', range.start)
          .lte('created_at', `${range.end}T23:59:59`),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', range.start)
          .lte('created_at', `${range.end}T23:59:59`),
        supabase
          .from('reward_requests')
          .select('id, status')
          .gte('created_at', range.start)
          .lte('created_at', `${range.end}T23:59:59`),
      ]);

      const totalWaste = wasteRes.data?.reduce((acc, log) => acc + Number(log.weight_kg), 0) || 0;
      const totalPoints = wasteRes.data?.reduce((acc, log) => acc + log.points_earned, 0) || 0;
      const approvedRewards = rewardsRes.data?.filter(r => r.status === 'approved').length || 0;

      return {
        totalWaste: totalWaste.toFixed(2),
        totalPoints,
        newUsers: usersRes.count || 0,
        wasteEntries: wasteRes.data?.length || 0,
        rewardsRedeemed: approvedRewards,
      };
    },
  });

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const range = getDateRange();
      let data: any[] = [];
      let filename = '';

      switch (reportType) {
        case 'waste':
          const { data: wasteData } = await supabase
            .from('waste_logs')
            .select(`
              created_at,
              weight_kg,
              points_earned,
              waste_types (name),
              bins (bin_name)
            `)
            .gte('created_at', range.start)
            .lte('created_at', `${range.end}T23:59:59`)
            .order('created_at', { ascending: false });
          data = wasteData || [];
          filename = `waste_collection_report_${range.start}_${range.end}.csv`;
          break;

        case 'users':
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name, email, total_points, created_at, is_blocked')
            .order('created_at', { ascending: false });
          data = userData || [];
          filename = `user_report_${range.start}_${range.end}.csv`;
          break;

        case 'rewards':
          const { data: rewardData } = await supabase
            .from('reward_requests')
            .select(`
              created_at,
              points_used,
              status,
              profiles (full_name, email),
              rewards (reward_name, reward_type)
            `)
            .gte('created_at', range.start)
            .lte('created_at', `${range.end}T23:59:59`)
            .order('created_at', { ascending: false });
          data = rewardData || [];
          filename = `reward_redemption_report_${range.start}_${range.end}.csv`;
          break;
      }

      if (data.length === 0) {
        toast.error('No data found for the selected period');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(flattenObject(data[0]));
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          const flat = flattenObject(row);
          return headers.map(h => `"${flat[h] || ''}"`).join(',');
        })
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    return Object.keys(obj).reduce((acc: Record<string, any>, k) => {
      const pre = prefix.length ? `${prefix}_` : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const reportCards = [
    {
      type: 'waste',
      title: 'Waste Collection Report',
      description: 'Detailed breakdown of waste collected by type, bin, and time period',
      icon: Recycle,
      color: 'success',
    },
    {
      type: 'users',
      title: 'User Activity Report',
      description: 'User registration, activity levels, and point balances',
      icon: Users,
      color: 'primary',
    },
    {
      type: 'rewards',
      title: 'Reward Redemption Report',
      description: 'All reward claims, approvals, and point deductions',
      icon: Gift,
      color: 'warning',
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
          <FileText className="w-8 h-8 text-primary" />
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground">
          Generate and download detailed reports
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-48">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Waste</p>
          <p className="text-2xl font-bold text-success">{summary?.totalWaste || 0} kg</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Points Issued</p>
          <p className="text-2xl font-bold text-warning">{summary?.totalPoints?.toLocaleString() || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">New Users</p>
          <p className="text-2xl font-bold text-primary">{summary?.newUsers || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Waste Entries</p>
          <p className="text-2xl font-bold">{summary?.wasteEntries || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Rewards Redeemed</p>
          <p className="text-2xl font-bold text-info">{summary?.rewardsRedeemed || 0}</p>
        </Card>
      </motion.div>

      {/* Report Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {reportCards.map((report, index) => (
          <motion.div
            key={report.type}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Card 
              className={`cursor-pointer transition-all ${
                reportType === report.type 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setReportType(report.type)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-${report.color}/10`}>
                    <report.icon className={`w-6 h-6 text-${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{report.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.description}
                    </p>
                  </div>
                  {reportType === report.type && (
                    <Badge className="gradient-primary">Selected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Download Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          className="gradient-primary px-8"
          onClick={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          Download Report (CSV)
        </Button>
      </motion.div>
    </div>
  );
};

export default Reports;
