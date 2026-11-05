/**
 * اپ هوشمند بدنسازی — supplement QR/barcode scanner modal (logging ONLY).
 *
 * The camera only reads a code (QR or barcode) off a product the user
 * ALREADY takes. The code is stored exactly as scanned; the product
 * name (and optional dose) is typed by the user — nothing is ever
 * auto-filled from a database, because there is none: no lookup, no
 * network, no recommendation, no dose judgment, no interaction check.
 * When the camera is unavailable (no device, denied permission, or a
 * scanner error), the same form is offered as manual entry.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { addSupplementLog } from '../lib/supplements';

interface Props {
  k: Record<string, string>;
  initialManual: boolean;
  onSaved: () => void;
  onClose: () => void;
}

type Phase = 'camera' | 'manual' | 'confirm';

export default function SupplementScanner({ k, initialManual, onSaved, onClose }: Props): ReactElement {
  const [phase, setPhase] = useState<Phase>(initialManual ? 'manual' : 'camera');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const stoppedRef = useRef(false);

  const stopCamera = (): void => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    try {
      controlsRef.current?.stop();
    } catch {
      /* already stopped */
    }
    controlsRef.current = null;
  };

  useEffect(() => {
    if (initialManual) return;
    let cancelled = false;
    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        if (devices.length === 0) {
          setPhase('manual');
          return;
        }
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        const deviceId = (back ?? devices[0]).deviceId;
        const video = videoRef.current;
        if (!video) {
          setPhase('manual');
          return;
        }
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(deviceId, video, (result, _err, ctrls) => {
          if (!result) return;
          try {
            ctrls.stop();
          } catch {
            /* ignore */
          }
          controlsRef.current = null;
          stoppedRef.current = true;
          setCode(result.getText());
          setPhase('confirm');
        });
        if (cancelled) {
          try {
            controls.stop();
          } catch {
            /* ignore */
          }
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (!cancelled) setPhase('manual');
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (source: 'scan' | 'manual'): void => {
    if (!name.trim()) {
      setError(k.suppNameRequired);
      return;
    }
    addSupplementLog({ name, dose, code, source });
    stopCamera();
    onSaved();
    onClose();
  };

  const close = (): void => {
    stopCamera();
    onClose();
  };

  // Portaled to document.body: a fixed overlay inside an animated ancestor
  // (e.g. a card running an entrance animation) gets contained by that
  // ancestor's transform and jumps off-position mid-animation. The portal
  // keeps the modal viewport-fixed no matter what its parent animates.
  return createPortal(
    <div
      data-supplement-scanner
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16,
      }}
      onClick={close}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 480, margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'camera' && (
          <>
            <h2 className="card-title">{k.suppScan}</h2>
            <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.suppScanning}</p>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', borderRadius: 12, background: '#000' }}
            />
            <button
              type="button"
              className="chip"
              style={{ marginTop: 12 }}
              onClick={() => {
                stopCamera();
                setPhase('manual');
              }}
            >
              {k.suppManual}
            </button>
          </>
        )}
        {phase === 'manual' && (
          <>
            <h2 className="card-title">{k.suppManual}</h2>
            <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.suppCameraUnavailable}</p>
            <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{k.suppCode}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{k.suppName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{k.suppDose}</label>
            <input
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <p className="card-meta" style={{ color: '#ff6b6b' }}>{error}</p>}
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => save('manual')}>
              {k.suppSave}
            </button>
          </>
        )}
        {phase === 'confirm' && (
          <>
            <h2 className="card-title">{k.suppScan}</h2>
            <p className="card-meta" style={{ margin: '0 0 4px' }}>{k.suppCode}</p>
            <p dir="ltr" style={{ fontWeight: 700, wordBreak: 'break-all', margin: '0 0 12px' }}>{code}</p>
            <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{k.suppName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{k.suppDose}</label>
            <input
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <p className="card-meta" style={{ color: '#ff6b6b' }}>{error}</p>}
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => save('scan')}>
              {k.suppSave}
            </button>
          </>
        )}
        <button type="button" className="chip" style={{ marginTop: 12 }} onClick={close}>
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}
