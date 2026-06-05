import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseWasteQrPayload, type ParsedWasteQrPayload } from '@/lib/qr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Coins,
  Loader2,
  QrCode,
  ScanLine,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';

interface ScanResult {
  transaction_id?: string;
  waste_log_id?: string;
  total_points?: number;
  points_earned?: number;
  waste_name?: string;
  message?: string;
}

interface RecentScan {
  id: string;
  qr_code: string;
  scanned_at: string;
  is_valid: boolean;
  is_duplicate: boolean;
  fraud_flagged: boolean;
  waste_logs: {
    points_earned: number;
    weight_kg: number;
    waste_types: {
      name: string;
      icon: string | null;
    } | null;
  } | null;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

const Scan: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<InstanceType<NonNullable<typeof window.BarcodeDetector>> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastHandledCodeRef = useRef<{ raw: string; at: number } | null>(null);
  const creditMutationRef = useRef<ReturnType<typeof useMutation> | null>(null);

  const [isScannerActive, setIsScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastPayload, setLastPayload] = useState<ParsedWasteQrPayload | null>(null);
  const [scanMessage, setScanMessage] = useState('Ready to scan a QR code with waste name and points.');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['scan-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, total_points')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const { data: qrExpirationSeconds } = useQuery({
    queryKey: ['qr-expiration-seconds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'qr_expiration_seconds')
        .maybeSingle();

      if (error) {
        throw error;
      }

      return Number(data?.setting_value ?? 60);
    },
  });

  const { data: recentScans } = useQuery({
    queryKey: ['recent-scans', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_transactions')
        .select(`
          id,
          qr_code,
          scanned_at,
          is_valid,
          is_duplicate,
          fraud_flagged,
          waste_logs (
            points_earned,
            weight_kg,
            waste_types (name, icon)
          )
        `)
        .eq('user_id', user!.id)
        .order('scanned_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      return data as RecentScan[];
    },
  });

  const creditMutation = useMutation({
    mutationFn: async (payload: ParsedWasteQrPayload & { rawCode: string }) => {
      if (!user?.id) {
        throw new Error('You need to sign in before scanning.');
      }

      const expiresAt = new Date(Date.now() + (qrExpirationSeconds || 60) * 1000).toISOString();

      const { data, error } = await supabase.rpc('credit_waste_qr_scan', {
        p_user_id: user.id,
        p_qr_code: payload.rawCode,
        p_waste_name: payload.wasteName,
        p_points: payload.points,
        p_weight_kg: payload.weightKg ?? 1,
        p_expires_at: expiresAt,
      });

      if (error) {
        throw error;
      }

      return data as ScanResult;
    },
    onSuccess: async (result, variables) => {
      setLastPayload({
        wasteName: variables.wasteName,
        points: variables.points,
        weightKg: variables.weightKg,
      });
      setScanMessage(result?.message || `${variables.points} points credited for ${variables.wasteName}.`);
      toast.success(result?.message || 'Points credited successfully');
      setManualCode('');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scan-profile', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['recent-scans', user?.id] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to credit points.';
      setScanMessage(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    creditMutationRef.current = creditMutation;
  }, [creditMutation]);

  const totalScans = recentScans?.length || 0;
  const totalRecentPoints = useMemo(
    () => recentScans?.reduce((acc, scan) => acc + (scan.waste_logs?.points_earned || 0), 0) || 0,
    [recentScans]
  );

  useEffect(() => {
    if (!isScannerActive) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      detectorRef.current = null;
      return;
    }

    let cancelled = false;

    const stopScanner = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      detectorRef.current = null;
    };

    const processRawCode = async (rawCode: string) => {
      const trimmed = rawCode.trim();
      if (!trimmed) {
        return;
      }

      const now = Date.now();
      if (lastHandledCodeRef.current && lastHandledCodeRef.current.raw === trimmed && now - lastHandledCodeRef.current.at < 4000) {
        return;
      }

      lastHandledCodeRef.current = { raw: trimmed, at: now };

      const parsed = parseWasteQrPayload(trimmed);
      if (!parsed) {
        setScanMessage('QR payload is not in a supported format.');
        toast.error('Unsupported QR payload');
        return;
      }

      setLastPayload(parsed);
      setScanMessage(`Detected ${parsed.wasteName} worth ${parsed.points} points.`);
      await creditMutationRef.current!.mutateAsync({ ...parsed, rawCode: trimmed });
    };

    const startDetection = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser.');
        setIsScannerActive(false);
        return;
      }

      if (!window.BarcodeDetector) {
        setCameraError('This browser does not support live QR detection. Use the manual input below.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const loop = async () => {
          if (cancelled || !videoRef.current || !detectorRef.current) {
            return;
          }

          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              const codes = await detectorRef.current.detect(videoRef.current);
              if (codes.length > 0 && codes[0].rawValue) {
                await processRawCode(codes[0].rawValue);
              }
            } catch {
              // Keep scanning on transient detection errors.
            }
          }

          animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to access the camera.';
        setCameraError(message);
        setIsScannerActive(false);
      }
    };

    startDetection();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScannerActive]);

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = parseWasteQrPayload(manualCode);
    if (!parsed) {
      toast.error('Paste a QR payload with waste name and points.');
      return;
    }

    setLastPayload(parsed);
    await creditMutation.mutateAsync({ ...parsed, rawCode: manualCode.trim() });
  };

  const handleStartScanner = () => {
    setCameraError(null);
    setIsScannerActive(true);
  };

  const handleStopScanner = () => {
    setIsScannerActive(false);
    setCameraError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              QR point crediting
            </div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Scan waste QR</h1>
            <p className="max-w-2xl text-muted-foreground">
              Scan a QR code that contains the waste name and point value. The app will parse the payload, add the points to your profile, and log the transaction.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5" />
              {profile?.total_points?.toLocaleString() || 0} points
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <QrCode className="h-3.5 w-3.5" />
              {totalScans} recent scans
            </Badge>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <CardHeader className="space-y-2 border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ScanLine className="h-5 w-5 text-primary" />
                  Live scanner
                </CardTitle>
                <CardDescription>
                  Tap start to open the camera, then point it at a QR code with a supported payload.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance</p>
                    <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
                      <Coins className="h-5 w-5 text-amber-500" />
                      {profile?.total_points?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent points</p>
                    <div className="mt-2 text-2xl font-semibold text-primary">+{totalRecentPoints}</div>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">QR expiry</p>
                    <div className="mt-2 text-2xl font-semibold">{qrExpirationSeconds || 60}s</div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl border bg-slate-950 shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_30%)]" />
                  <div className="relative aspect-[4/3] min-h-[280px]">
                    {isScannerActive ? (
                      <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-8 text-center text-slate-100">
                        <div className="max-w-md space-y-3">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                            <Camera className="h-7 w-7 text-white" />
                          </div>
                          <h3 className="text-xl font-semibold">Camera is idle</h3>
                          <p className="text-sm text-slate-300">
                            Start the scanner to activate your camera or paste a QR payload below.
                          </p>
                        </div>
                      </div>
                    )}

                    {isScannerActive && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-56 w-56 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!isScannerActive ? (
                    <Button onClick={handleStartScanner} className="gap-2">
                      <Camera className="h-4 w-4" />
                      Start scanner
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={handleStopScanner} className="gap-2">
                      <CameraOff className="h-4 w-4" />
                      Stop scanner
                    </Button>
                  )}

                  <Badge variant={cameraError ? 'destructive' : 'secondary'} className="gap-1.5 px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {cameraError ? 'Manual mode required' : 'Scanner ready'}
                  </Badge>
                </div>

                {cameraError && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700">
                    {cameraError}
                  </div>
                )}

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Latest scan status</p>
                  <p className="mt-1 text-sm text-muted-foreground">{scanMessage}</p>
                  {lastPayload && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="gap-1.5">
                        <Star className="h-3.5 w-3.5" />
                        {lastPayload.wasteName}
                      </Badge>
                      <Badge variant="outline">{lastPayload.points} points</Badge>
                      <Badge variant="secondary">{lastPayload.weightKg ?? 1} kg</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Manual QR payload</label>
                    <Input
                      value={manualCode}
                      onChange={(event) => setManualCode(event.target.value)}
                      placeholder='Example: {"wasteName":"Plastic","points":25}'
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={creditMutation.isPending} className="gap-2">
                      {creditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      Credit points
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: JSON, `waste=Plastic&points=25`, `Plastic|25`, or `Plastic 25`.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Payload format
                </CardTitle>
                <CardDescription>
                  Encode the waste name and points in the QR string. Extra fields like weight are supported too.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border bg-muted/30 p-3 font-mono text-xs text-foreground">
                  {`{"wasteName":"Plastic","points":25,"weightKg":1.5}`}
                </div>
                <div className="rounded-2xl border bg-muted/30 p-3 font-mono text-xs text-foreground">
                  waste=Plastic&points=25
                </div>
                <div className="rounded-2xl border bg-muted/30 p-3 font-mono text-xs text-foreground">
                  Plastic|25
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <QrCode className="h-5 w-5 text-primary" />
                  Recent scans
                </CardTitle>
                <CardDescription>
                  The last five credited scans for your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentScans && recentScans.length > 0 ? (
                  recentScans.map((scan) => (
                    <div key={scan.id} className="rounded-2xl border bg-background p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {scan.waste_logs?.waste_types?.icon ? `${scan.waste_logs.waste_types.icon} ` : ''}
                            {scan.waste_logs?.waste_types?.name || 'Unknown waste'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(scan.scanned_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className="bg-success/10 text-success">+{scan.waste_logs?.points_earned || 0}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{scan.is_valid ? 'Valid' : 'Invalid'}</Badge>
                        {scan.is_duplicate && <Badge variant="secondary">Duplicate</Badge>}
                        {scan.fraud_flagged && <Badge variant="destructive">Fraud flagged</Badge>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No scans recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Scan;