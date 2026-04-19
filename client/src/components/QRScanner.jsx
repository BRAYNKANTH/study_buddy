import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { X, Camera, CameraOff, RefreshCw, FlipHorizontal } from 'lucide-react';

const QRScanner = ({ onScanPromise, onClose }) => {
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [starting, setStarting] = useState(true);
    const scannerRef = useRef(null);
    const isMountedRef = useRef(true);
    const divId = 'reader-stream';

    const stopScanner = useCallback(async () => {
        try {
            if (scannerRef.current?.isScanning) await scannerRef.current.stop();
            scannerRef.current?.clear();
        } catch (e) { /* ignore cleanup errors */ }
        scannerRef.current = null;
    }, []);

    const startScanner = useCallback(async (mode) => {
        await stopScanner();
        if (!isMountedRef.current) return;

        setError('');
        setStarting(true);

        try {
            const scanner = new Html5Qrcode(divId, { verbose: false });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: mode },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                onScanSuccess,
                () => {}
            );

            if (isMountedRef.current) setStarting(false);
        } catch (err) {
            console.error('Camera start error:', err);
            if (!isMountedRef.current) return;

            const msg = typeof err === 'string' ? err
                : err?.message || err?.toString?.() || 'Permission denied or camera busy';

            setError(msg);
            setStarting(false);
        }
    }, [stopScanner]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        isMountedRef.current = true;
        startScanner(facingMode);

        return () => {
            isMountedRef.current = false;
            stopScanner();
        };
    }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const playBeep = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.1;
            osc.start();
            setTimeout(() => osc.stop(), 180);
        } catch (e) { /* audio not critical */ }
    };

    const onScanSuccess = async (decodedText) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setLastScanned(null);
        playBeep();
        try { scannerRef.current?.pause(); } catch (e) { /* ignore */ }

        try {
            const result = await onScanPromise(decodedText);
            const studentName = result?.studentName || decodedText;
            if (isMountedRef.current) setLastScanned({ id: decodedText, name: studentName });
            if (isMountedRef.current) setIsProcessing(false);

            setTimeout(() => {
                if (isMountedRef.current) setLastScanned(null);
                try { scannerRef.current?.resume(); } catch (e) { /* ignore */ }
            }, 2000);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Scan failed';
            toast.error(msg);
            if (isMountedRef.current) setError(msg);
            if (isMountedRef.current) setIsProcessing(false);

            setTimeout(() => {
                if (isMountedRef.current) setError('');
                try { scannerRef.current?.resume(); } catch (e) { /* ignore */ }
            }, 2500);
        }
    };

    const handleFlip = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        setLastScanned(null);
    };

    const handleRetry = () => {
        setLastScanned(null);
        startScanner(facingMode);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const val = e.target.elements.manualId.value.trim();
        if (val) {
            e.target.elements.manualId.value = '';
            onScanSuccess(val);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="qr-scanner-title"
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col motion-safe:animate-scale-in"
            >
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center" aria-hidden="true">
                            <Camera size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 id="qr-scanner-title" className="font-bold text-slate-900 text-sm">Scan Student QR</h3>
                            <p className="text-[11px] text-slate-400">
                                <span aria-hidden="true">{facingMode === 'environment' ? '📷' : '🤳'}</span>
                                {facingMode === 'environment' ? ' Back camera' : ' Front camera'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleFlip}
                            aria-label="Flip camera"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <FlipHorizontal size={17} aria-hidden="true" />
                        </button>
                        <button
                            onClick={onClose}
                            aria-label="Close scanner"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Camera viewport */}
                <div className="relative bg-black aspect-square">
                    <div id={divId} className="w-full h-full" />

                    {/* Scanning guides */}
                    {!isProcessing && !lastScanned && !error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                            <div className="relative w-52 h-52">
                                <div className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa', borderRadius: '6px 0 0 0' }} />
                                <div className="absolute top-0 right-0 w-8 h-8" style={{ borderTop: '3px solid #60a5fa', borderRight: '3px solid #60a5fa', borderRadius: '0 6px 0 0' }} />
                                <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderBottom: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa', borderRadius: '0 0 0 6px' }} />
                                <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: '3px solid #60a5fa', borderRight: '3px solid #60a5fa', borderRadius: '0 0 6px 0' }} />
                                <div className="absolute left-2 right-2 h-0.5 bg-blue-400/70 top-1/2 motion-safe:animate-pulse" />
                            </div>
                        </div>
                    )}

                    {/* Starting overlay */}
                    {starting && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10" role="status" aria-live="polite">
                            <div className="w-8 h-8 border-4 border-t-blue-400 border-white/20 rounded-full motion-safe:animate-spin mb-2" aria-hidden="true" />
                            <p className="text-slate-300 text-xs">Starting camera...</p>
                        </div>
                    )}

                    {/* Processing overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10" role="status" aria-live="polite">
                            <div className="w-10 h-10 border-4 border-t-white border-white/20 rounded-full motion-safe:animate-spin mb-3" aria-hidden="true" />
                            <span className="text-white text-sm font-semibold">Marking attendance...</span>
                        </div>
                    )}

                    {/* Success overlay */}
                    {lastScanned && !isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/90 backdrop-blur-sm z-10" role="status" aria-live="assertive">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3" aria-hidden="true">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-white font-bold text-base">{lastScanned.name}</p>
                            <p className="text-emerald-100 text-xs mt-1 font-mono">{lastScanned.id}</p>
                            <p className="text-emerald-200 text-xs mt-3 motion-safe:animate-pulse">Resuming in 2s...</p>
                        </div>
                    )}

                    {/* Camera error overlay */}
                    {error && !isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10 p-4" role="alert">
                            <CameraOff size={32} className="text-red-400 mb-3" aria-hidden="true" />
                            <p className="text-white text-xs text-center mb-1 font-semibold">Camera Error</p>
                            <p className="text-slate-200 text-[11px] text-center mb-4 leading-relaxed">{error}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRetry}
                                    aria-label="Retry camera"
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    <RefreshCw size={12} aria-hidden="true" /> Retry
                                </button>
                                <button
                                    onClick={handleFlip}
                                    aria-label={`Try ${facingMode === 'environment' ? 'front' : 'back'} camera`}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-700 text-white text-xs font-bold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    <FlipHorizontal size={12} aria-hidden="true" />
                                    Try {facingMode === 'environment' ? 'Front' : 'Back'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Manual entry fallback */}
                <div className="px-4 py-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 mb-2 text-center font-medium uppercase tracking-wide" aria-hidden="true">
                        Manual Entry (camera not working?)
                    </p>
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                        <label htmlFor="qr-manual-id" className="sr-only">Student ID</label>
                        <input
                            id="qr-manual-id"
                            name="manualId"
                            type="text"
                            placeholder="Student ID (e.g. S10001)"
                            aria-label="Student ID for manual entry"
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-slate-900"
                            disabled={isProcessing}
                        />
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            Mark
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
