import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

const StudentIDCard = ({ student, onClose }) => {
    const cardRef = useRef(null);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 4,
                backgroundColor: null,
                useCORS: true,
                logging: false,
            });
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `ID_${student.StudentName.replace(/\s+/g, '_')}.png`;
            link.click();
        } catch (err) {
            console.error('Error generating ID card', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-scale-in">

                {/* Modal Header */}
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Student ID Card</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Print or download for attendance scanning</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* ── ID CARD ─────────────────────────────────────────── */}
                <div className="flex justify-center mb-5 w-full overflow-x-auto">
                    <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }} className="w-full flex justify-center">
                    <div
                        ref={cardRef}
                        style={{
                            width: '380px',
                            minWidth: '320px',
                            height: '240px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            fontFamily: "'Outfit', 'Inter', sans-serif",
                            position: 'relative',
                            boxShadow: '0 8px 32px rgba(37,99,235,0.18)',
                            background: '#fff',
                        }}
                    >
                        {/* ── LEFT STRIPE (dark blue) ── */}
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: '110px',
                            background: 'linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '10px', padding: '16px 10px',
                        }}>
                            {/* School Monogram */}
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)',
                                border: '2px solid rgba(255,255,255,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>T</span>
                            </div>

                            {/* School name vertical */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#bfdbfe', fontSize: '8px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                    Theebam
                                </div>
                                <div style={{ color: 'rgba(191,219,254,0.7)', fontSize: '7px', letterSpacing: '0.5px' }}>
                                    Education Centre
                                </div>
                            </div>

                            {/* Grade badge */}
                            <div style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.35)',
                                borderRadius: '8px', padding: '4px 10px',
                                textAlign: 'center',
                            }}>
                                <div style={{ color: 'rgba(191,219,254,0.8)', fontSize: '7px', fontWeight: 600, letterSpacing: '0.5px' }}>GRADE</div>
                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 900, lineHeight: 1 }}>{student.Grade}</div>
                            </div>
                        </div>

                        {/* ── MAIN BODY ── */}
                        <div style={{
                            position: 'absolute', left: '110px', right: 0, top: 0, bottom: 0,
                            background: '#fff',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            padding: '16px 16px 12px 18px',
                        }}>
                            {/* Top section */}
                            <div>
                                {/* Card type label */}
                                <div style={{
                                    display: 'inline-block',
                                    background: '#eff6ff', border: '1px solid #bfdbfe',
                                    borderRadius: '20px', padding: '2px 10px',
                                    fontSize: '8px', fontWeight: 700,
                                    color: '#2563eb', letterSpacing: '1px',
                                    textTransform: 'uppercase', marginBottom: '8px',
                                }}>
                                    Student ID
                                </div>

                                {/* Student Name */}
                                <div style={{
                                    fontSize: '17px', fontWeight: 800,
                                    color: '#0f172a', lineHeight: 1.2,
                                    maxWidth: '170px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {student.StudentName}
                                </div>

                                {/* Student ID */}
                                <div style={{
                                    marginTop: '4px',
                                    fontFamily: 'monospace', fontSize: '11px',
                                    color: '#64748b', letterSpacing: '1px',
                                    fontWeight: 600,
                                }}>
                                    {student.StudentID}
                                </div>
                            </div>

                            {/* Middle info row */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Academic Year</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{new Date().getFullYear()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Status</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>● Active</div>
                                </div>
                            </div>

                            {/* QR + bottom strip */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                {/* Bottom label */}
                                <div style={{ fontSize: '7px', color: '#94a3b8', maxWidth: '120px', lineHeight: 1.4 }}>
                                    Scan QR code to mark attendance.<br />
                                    <span style={{ color: '#cbd5e1' }}>theebam.edu.lk</span>
                                </div>

                                {/* QR Code */}
                                <div style={{
                                    background: '#fff',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '5px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                }}>
                                    <QRCodeSVG
                                        value={student.StudentID}
                                        size={80}
                                        level="H"
                                        includeMargin={false}
                                        fgColor="#0f172a"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── BOTTOM ACCENT BAR ── */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: '110px', right: 0,
                            height: '4px',
                            background: 'linear-gradient(90deg, #2563eb, #6366f1, #10b981)',
                        }} />
                    </div>
                    </div>
                </div>

                {/* Scan hint */}
                <p className="text-center text-xs text-slate-400 mb-4">
                    The QR code encodes <span className="font-mono font-semibold text-slate-600">{student.StudentID}</span> — tutor scans this for attendance.
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md shadow-blue-500/20 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PNG
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentIDCard;
