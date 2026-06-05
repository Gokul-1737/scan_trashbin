import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  delay?: number;
}

const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
  success: 'bg-gradient-to-br from-success/10 to-success/5 border-success/20',
  warning: 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20',
  info: 'bg-gradient-to-br from-info/10 to-info/5 border-info/20',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-info text-info-foreground',
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={cn('border overflow-hidden hover:shadow-lg transition-shadow', variantStyles[variant])}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <motion.p
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: delay + 0.1 }}
                className="text-3xl font-bold text-foreground"
              >
                {value}
              </motion.p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && (
                <div className={cn(
                  'inline-flex items-center text-xs font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}>
                  <span>{trend.isPositive ? '↑' : '↓'}</span>
                  <span className="ml-1">{Math.abs(trend.value)}%</span>
                  <span className="ml-1 text-muted-foreground">vs last month</span>
                </div>
              )}
            </div>
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className={cn(
                'p-3 rounded-xl shadow-sm',
                iconStyles[variant]
              )}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
