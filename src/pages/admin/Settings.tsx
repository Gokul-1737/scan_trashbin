import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon,
  DollarSign,
  Clock,
  Trophy,
  Bell,
  Save,
  Loader2,
} from 'lucide-react';

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      if (error) throw error;
      return data as AppSetting[];
    },
  });

  useEffect(() => {
    if (dbSettings) {
      const settingsMap: Record<string, string> = {};
      dbSettings.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      setSettings(settingsMap);
    }
  }, [dbSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(settings).map(([key, value]) => 
        supabase
          .from('app_settings')
          .update({ setting_value: value })
          .eq('setting_key', key)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Settings saved successfully!');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const settingsConfig = [
    {
      key: 'points_to_money_ratio',
      title: 'Points to Money Conversion',
      description: 'Number of points equal to ₹1',
      icon: DollarSign,
      type: 'number',
      suffix: 'points = ₹1',
    },
    {
      key: 'qr_expiration_seconds',
      title: 'QR Code Expiration',
      description: 'Time in seconds before a QR code expires',
      icon: Clock,
      type: 'number',
      suffix: 'seconds',
    },
    {
      key: 'leaderboard_enabled',
      title: 'Public Leaderboard',
      description: 'Show public leaderboard to users',
      icon: Trophy,
      type: 'toggle',
    },
    {
      key: 'notifications_enabled',
      title: 'Push Notifications',
      description: 'Send push notifications to users',
      icon: Bell,
      type: 'toggle',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure application settings and preferences
          </p>
        </div>
        <Button
          className="gradient-primary"
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </motion.div>

      {/* Settings Cards */}
      <div className="grid gap-6">
        {settingsConfig.map((config, index) => (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <config.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{config.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  
                  {config.type === 'toggle' ? (
                    <Switch
                      checked={settings[config.key] === 'true'}
                      onCheckedChange={(checked) => 
                        updateSetting(config.key, checked ? 'true' : 'false')
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24 text-right"
                        value={settings[config.key] || ''}
                        onChange={(e) => updateSetting(config.key, e.target.value)}
                      />
                      {config.suffix && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {config.suffix}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">💡 Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Changes to point conversion will affect future redemptions only</li>
              <li>• QR expiration time should be between 15-60 seconds for security</li>
              <li>• Disabling leaderboard will hide rankings from users immediately</li>
              <li>• Push notifications require user permission in the mobile app</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Settings;
