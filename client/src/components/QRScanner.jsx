import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { X, Camera, CameraOff, RefreshCw } from 'lucide-react';

const QRScanner = ({ onScanPromise, onClose }) => {
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [lastScanned, setLastScanned] = useState(null); // { id, name } of last successful scan
    const scannerRef = useRef(null);
    const divId = 'reader-stream';

    // Step 1 — enumerate cameras on mount
    useEffect(() => {
        const getCameras = async () => {
            try {
                const deviceCameras = await Html5Qrcode.getCameras();
                if (deviceCameras && deviceCameras.length > 0) {
                    setCameras(deviceCameras);
                    setSelectedCamera(deviceCameras[0].id);
                } else {
                    setError('No cameras found on this device.');
                }
            } catch (err) {
                console.error('Error getting cameras', err);
                setError('Camera permission denied. Use manual entry below.');
            }
        };
        getCameras();
    }, []);

    // Step 2 — start scanner when camera is selected
    useEffect(() => {
        const isMounted = { current: true };

        const startScanner = async () => {
            // Stop any previous instance
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch (e) { /* ignore cleanup errors */ }
            }

            if (!selectedCamera || !isMounted.current) return;

            try {
                const scanner = new Html5Qrcode(divId);
                scannerRef.current = scanner;

                await scanner.start(
                    selectedCamera,
                    { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
                    onScanSuccess,
                    () => { /* ignore per-frame failures */ }
                );
            } catch (err) {
                console.error('Camera start error', err);
                if (isMounted.current) setError('Could not start camera. ' + err.message);
            }
        };

        startScanner();

        return () => {
            isMounted.current = false;
            const cleanup = async () => {
                try {
                    if (scannerRef.current?.isScanning) await scannerRef.current.stop();
                    scannerRef.current?.clear();
                } catch (e) { /* ignore */ }
            };
            cleanup();
        };
    }, [selectedCamera]);

    // Beep on successful scan
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
        playBeep();
        if (scannerRef.current) scannerRef.current.pause();

        try {
            const result = await onScanPromise(decodedText);
            // onScanPromise (handleScan in TutorDashboard) calls toast.success internally,
            // but we also update lastScanned for the in-scanner UI
            const studentName = result?.studentName || decodedText;
            setLastScanned({ id: decodedText, name: studentName });
            setIsProcessing(false);

            // Resume after short delay so tutor can see the result
            setTimeout(() => {
                if (scannerRef.current) scannerRef.current.resume();
            }, 1500);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            setError(msg);
            toast.error(msg);
            setIsProcessing(false);
            setTimeout(() => {
                if (scannerRef.current) scannerRef.current.resume();
                setError('');
            }, 2500);
        }
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-scale-in">

                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Camera size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Scan Student QR</h3>
                            <p className="text-[11px] text-slate-400">Point camera at student ID card</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Camera selector */}
                {cameras.length > 1 && (
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                        <select
                            value={selectedCamera}
                            onChange={(e) => setSelectedCamera(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {cameras.map(cam => (
                                <option key={cam.id} value={cam.id}>
                                    {cam.label || `Camera ${cam.id.slice(0, 8)}...`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Camera viewport */}
                <div className="relative bg-black aspect-square">
                    <div id={divId} className="w-full h-full" />

                    {/* Corner guides */}
                    {!isProcessing && !lastScanned && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-48 h-48">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg" style={{ borderWidth: '3px', borderRightWidth: 0, borderBottomWidth: 0 }} />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg" style={{ borderWidth: '3px', borderLeftWidth: 0, borderBottomWidth: 0 }} />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg" style={{ borderWidth: '3px', borderRightWidth: 0, borderTopWidth: 0 }} />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg" style={{ borderWidth: '3px', borderLeftWidth: 0, borderTopWidth: 0 }} />
                            </div>
                        </div>
                    )}

                    {/* Processing overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                            <div className="w-10 h-10 border-4 border-t-white border-white/20 rounded-full animate-spin mb-3" />
                            <span className="text-white text-sm font-semibold">Processing...</span>
                        </div>
                    )}

                    {/* Success flash */}
                    {lastScanned && !isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/90 backdrop-blur-sm z-10">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-white font-bold text-base">{lastScanned.name}</p>
                            <p className="text-emerald-100 text-xs mt-1 font-mono">{lastScanned.id}</p>
                            <p className="text-emerald-200 text-xs mt-3 animate-pulse">Resuming scanner...</p>
                        </div>
                    )}

                    {/* Camera error overlay */}
                    {!selectedCamera && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                            <CameraOff size={32} className="text-slate-500 mb-2" />
                            <p className="text-slate-400 text-sm">Starting camera...</p>
                        </div>
                    )}
                </div>

                {/* Error banner */}
                {error && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-t border-red-100 text-red-700 text-xs">
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Manual entry fallback */}
                <div className="px-4 py-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 mb-2 text-center font-medium uppercase tracking-wide">
                        Manual Entry (camera not working?)
                    </p>
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                        <input
                            name="manualId"
                            type="text"
                            placeholder="Student ID (e.g. S10001)"
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                            disabled={isProcessing}
                        />
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition"
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
