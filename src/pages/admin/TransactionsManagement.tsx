import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { StatsCard } from '@/components/admin/StatsCard';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Copy,
} from 'lucide-react';

interface QRTransaction {
  id: string;
  qr_code: string;
  user_id: string | null;
  bin_id: string | null;
  is_valid: boolean;
  scanned_at: string;
  expires_at: string;
  is_duplicate: boolean;
  fraud_flagged: boolean;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  bins: {
    bin_name: string;
    bin_id: string;
  } | null;
  waste_logs: {
    waste_type_id: string;
    points_earned: number;
    weight_kg: number;
  } | null;
}

const TransactionsManagement: React.FC = () => {
  // Fetch QR transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['qr-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_transactions')
        .select(`
          *,
          bins (bin_name, bin_id),
          waste_logs (waste_type_id, points_earned, weight_kg)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data?.filter(t => t.user_id).map(t => t.user_id!) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data?.map(t => ({
        ...t,
        profiles: t.user_id ? profilesMap.get(t.user_id) || null : null,
      })) as QRTransaction[];
    },
  });

  const validCount = transactions?.filter(t => t.is_valid).length || 0;
  const duplicateCount = transactions?.filter(t => t.is_duplicate).length || 0;
  const fraudCount = transactions?.filter(t => t.fraud_flagged).length || 0;

  const getStatusBadge = (row: QRTransaction) => {
    if (row.fraud_flagged) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Fraud
        </Badge>
      );
    }
    if (row.is_duplicate) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <Copy className="w-3 h-3 mr-1" />
          Duplicate
        </Badge>
      );
    }
    if (!row.is_valid) {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Invalid
        </Badge>
      );
    }
    return (
      <Badge className="bg-success/10 text-success">
        <CheckCircle className="w-3 h-3 mr-1" />
        Valid
      </Badge>
    );
  };

  const columns = [
    {
      key: 'qr_code',
      header: 'QR Code',
      render: (row: QRTransaction) => (
        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
          {row.qr_code.substring(0, 12)}...
        </code>
      ),
    },
    {
      key: 'profiles.full_name',
      header: 'User',
      render: (row: QRTransaction) => (
        <div>
          <p className="font-medium">{row.profiles?.full_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{row.profiles?.email}</p>
        </div>
      ),
    },
    {
      key: 'bins.bin_name',
      header: 'Bin',
      render: (row: QRTransaction) => (
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-muted-foreground" />
          <span>{row.bins?.bin_name || 'Unknown'}</span>
          {row.bins?.bin_id && (
            <Badge variant="outline" className="text-xs">
              {row.bins.bin_id}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'waste_logs.points_earned',
      header: 'Points',
      render: (row: QRTransaction) => (
        row.waste_logs ? (
          <span className="text-primary font-semibold">
            +{row.waste_logs.points_earned}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'scanned_at',
      header: 'Scanned',
      render: (row: QRTransaction) => (
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(row.scanned_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: QRTransaction) => getStatusBadge(row),
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
          <QrCode className="w-8 h-8 text-primary" />
          QR & Transactions
        </h1>
        <p className="text-muted-foreground">
          Monitor QR scan activity and detect fraud attempts
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Scans"
          value={transactions?.length || 0}
          icon={QrCode}
          variant="primary"
          delay={0}
        />
        <StatsCard
          title="Valid Scans"
          value={validCount}
          icon={CheckCircle}
          variant="success"
          delay={0.1}
        />
        <StatsCard
          title="Duplicate Scans"
          value={duplicateCount}
          icon={Copy}
          variant="warning"
          delay={0.2}
        />
        <StatsCard
          title="Fraud Attempts"
          value={fraudCount}
          icon={AlertTriangle}
          variant="default"
          delay={0.3}
        />
      </div>

      {/* Fraud Alert */}
      {fraudCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <p className="text-destructive font-medium">
            {fraudCount} potential fraud attempt{fraudCount > 1 ? 's' : ''} detected!
          </p>
        </motion.div>
      )}

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <DataTable
          title="QR Scan Logs"
          columns={columns}
          data={transactions || []}
          isLoading={isLoading}
          emptyMessage="No QR transactions recorded"
        />
      </motion.div>
    </div>
  );
};

export default TransactionsManagement;
