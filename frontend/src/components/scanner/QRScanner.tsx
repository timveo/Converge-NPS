import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { offlineQueue } from '@/lib/offlineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';

interface QRScannerProps {
  onClose?: () => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to start scanner', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner', err);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log('QR Code scanned:', decodedText);

    // Stop scanner
    await stopScanner();

    // Process scan
    await processScan(decodedText);
  };

  const onScanFailure = (errorMessage: string) => {
    // Ignore frequent scan failures
    console.debug('Scan failure:', errorMessage);
  };

  const processScan = async (scannedCode: string) => {
    try {
      if (isOnline) {
        // Online: Send to API
        const response = await api.post('/connections/qr-scan', {
          scannedCode,
          method: 'qr_scan',
        });

        setSuccess('Connection added successfully!');
        setTimeout(() => {
          navigate(`/connections/${response.data.data.id}`);
        }, 1500);
      } else {
        // Offline: Add to queue
        await offlineQueue.add({
          userId: user!.id,
          operationType: 'qr_scan',
          payload: { scannedCode },
        });

        setSuccess('Connection saved! Will sync when online.');
        setTimeout(() => {
          navigate('/connections');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Failed to process scan', error);
      setError(error.response?.data?.error || 'Failed to add connection');

      // Restart scanner after error
      setTimeout(() => {
        setError(null);
        startScanner();
      }, 3000);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualCode.trim()) {
      setError('Please enter a QR code');
      return;
    }

    await processScan(manualCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-6 h-6 text-white" />
            <h2 className="text-white text-lg font-semibold">Scan QR Code</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Scanner */}
      <div className="flex items-center justify-center h-full">
        <div className="relative w-full max-w-md">
          {/* Scanner Container */}
          <div id="qr-reader" className="w-full" />

          {/* Status Messages */}
          {error && (
            <div className="absolute bottom-32 left-4 right-4 bg-red-500 text-white p-4 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="absolute bottom-32 left-4 right-4 bg-green-500 text-white p-4 rounded-lg">
              <p className="text-sm">{success}</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <form onSubmit={handleManualEntry} className="space-y-3">
          <p className="text-white text-sm text-center">
            Can't scan? Enter code manually
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter QR code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
