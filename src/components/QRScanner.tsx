import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Camera, Upload, X, Loader2, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { decodeQRFromImage } from '@/lib/qr-decoder';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan: (data: string, parsed?: ParsedUPIData) => void;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonClassName?: string;
  showLabel?: boolean;
  trigger?: React.ReactNode;
}

export interface ParsedUPIData {
  upiId?: string;
  name?: string;
  amount?: number;
  note?: string;
  isUPI: boolean;
}

function parseUPILink(data: string): ParsedUPIData {
  if (!data.toLowerCase().startsWith('upi://')) {
    return { isUPI: false };
  }

  try {
    const url = new URL(data);
    const params = new URLSearchParams(url.search);

    return {
      upiId: params.get('pa') || undefined,
      name: params.get('pn') || undefined,
      amount: params.get('am') ? parseFloat(params.get('am')!) : undefined,
      note: params.get('tn') || undefined,
      isUPI: true,
    };
  } catch {
    return { isUPI: false };
  }
}

export function QRScanner({
  onScan,
  buttonVariant = 'outline',
  buttonSize = 'default',
  buttonClassName = '',
  showLabel = true,
  trigger
}: QRScannerProps) {
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ data: string; parsed: ParsedUPIData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, [cameraStream]);

  const handleClose = () => {
    stopCamera();
    setOpen(false);
    setScanResult(null);
    setError(null);
    setIsScanning(false);
  };

  const startCamera = async (mode?: 'environment' | 'user') => {
    const currentMode = mode || facingMode;
    setError(null);
    setIsScanning(true);
    setScanResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(() => {
          scanVideoFrame();
        }, 200);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions or use file upload.');
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    stopCamera();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setTimeout(() => startCamera(newMode), 100);
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR to decode
    import('jsqr').then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        handleQRDetected(code.data);
      }
    });
  };

  const handleQRDetected = (data: string) => {
    stopCamera();
    setIsScanning(false);

    const parsed = parseUPILink(data);
    setScanResult({ data, parsed });

    // Vibrate on successful scan
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await decodeQRFromImage(file);

      if (result.success && result.data) {
        handleQRDetected(result.data);
      } else {
        setError(result.error || 'No QR code found in image');
        setIsScanning(false);
      }
    } catch (err) {
      setError('Failed to process image');
      setIsScanning(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (scanResult) {
      onScan(scanResult.data, scanResult.parsed);
      toast({
        title: 'QR Code Scanned',
        description: scanResult.parsed.isUPI
          ? `UPI ID: ${scanResult.parsed.upiId}`
          : 'URL/Link detected',
      });
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
            <QrCode className="h-4 w-4" />
            {showLabel && <span className="ml-2">Scan QR</span>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Code Scanner
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" onClick={() => { stopCamera(); setScanResult(null); setError(null); }}>
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="upload" onClick={() => { stopCamera(); setScanResult(null); setError(null); }}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            {!isScanning && !scanResult && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Point your camera at a QR code to scan
                </p>
                <Button onClick={() => startCamera()} className="gradient-bg text-primary-foreground">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />

                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 h-0.5 bg-primary animate-bounce" style={{ top: '50%' }} />
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 left-2"
                  onClick={switchCamera}
                  title="Switch Camera"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={stopCamera}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Scan Error</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isScanning ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processing image...</p>
                </div>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Upload an image containing a QR code
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()} className="gradient-bg text-primary-foreground">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3 w-full">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Scan Error</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Scan Result */}
        {scanResult && (
          <div className="space-y-4 p-4 bg-success/10 border border-success/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-success">QR Code Detected!</p>
                {scanResult.parsed.isUPI ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">UPI ID:</span> <span className="font-mono">{scanResult.parsed.upiId}</span></p>
                    {scanResult.parsed.name && (
                      <p><span className="text-muted-foreground">Name:</span> {scanResult.parsed.name}</p>
                    )}
                    {scanResult.parsed.amount && (
                      <p><span className="text-muted-foreground">Amount:</span> ₹{scanResult.parsed.amount}</p>
                    )}
                    {scanResult.parsed.note && (
                      <p><span className="text-muted-foreground">Note:</span> {scanResult.parsed.note}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-mono text-muted-foreground break-all">{scanResult.data}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setScanResult(null); setError(null); }} className="flex-1">
                Scan Again
              </Button>
              <Button onClick={handleConfirm} className="flex-1 gradient-bg text-primary-foreground">
                Use This
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
