import { useNavigate } from 'react-router-dom';
import { QRScanner } from '@/components/scanner/QRScanner';
import { useFeature } from '@/hooks/useFeature';
import { useEffect } from 'react';

export function ScanPage() {
  const navigate = useNavigate();
  const isQRAvailable = useFeature('qr_scanner');

  useEffect(() => {
    // Redirect if QR scanner not available on this device
    if (!isQRAvailable) {
      navigate('/');
    }
  }, [isQRAvailable, navigate]);

  if (!isQRAvailable) {
    return null;
  }

  return <QRScanner onClose={() => navigate(-1)} />;
}
