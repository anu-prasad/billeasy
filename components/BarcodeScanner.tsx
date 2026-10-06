'use client';
import { useEffect, useRef, useState } from 'react';

type Html5QrcodeType = import('html5-qrcode').Html5Qrcode;

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

const REGION_ID = 'barcode-scanner-region';

async function stopScanner(scanner: Html5QrcodeType | null) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
    await scanner.clear();
  } catch { /* already stopped */ }
}

export default function BarcodeScanner({ open, onClose, onScan, title = 'Scan Barcode' }: BarcodeScannerProps) {
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let scanner: Html5QrcodeType | null = null;
    onScanRef.current = onScan;
    queueMicrotask(() => { if (!disposed) setError(''); });

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (disposed) return;
        scanner = new Html5Qrcode(REGION_ID);
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 150 } },
          (text) => {
            void stopScanner(scanner);
            onScanRef.current(text);
          },
          () => { /* per-frame decode noise is ignored */ }
        );
      } catch {
        if (!disposed) setError('Could not access the camera. Allow camera permission, or enter the barcode manually.');
      }
    }

    void start();

    return () => {
      disposed = true;
      void stopScanner(scanner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: '4px 0 0' }}>
          <div
            id={REGION_ID}
            style={{ minHeight: 240, borderRadius: 12, overflow: 'hidden', background: '#0f172a' }}
          />
          {error ? (
            <div style={{ padding: 12, borderRadius: 8, background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', fontSize: '0.85rem', marginTop: 14 }}>
              {error}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
              Point the camera at the barcode. It will be added automatically when detected.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} id="barcode-scanner-close-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}