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
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
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
                            minWidth: '380px',
                            maxWidth: '380px',
                            height: '240px',
                            minHeight: '240px',
                            maxHeight: '240px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            fontFamily: "'Outfit', 'Inter', sans-serif",
                            position: 'relative',
                            boxShadow: '0 8px 32px rgba(37,99,235,0.18)',
                            background: '#ffffff',
                        }}
                    >
                        {/* ── LEFT STRIPE (premium navy) ── */}
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: '120px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '12px', padding: '16px 12px',
                            boxShadow: '4px 0 16px rgba(0,0,0,0.1)',
                            zIndex: 10
                        }}>
                            {/* School Monogram */}
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ fontSize: '30px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>T</span>
                            </div>

                            {/* School name vertical */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#bfdbfe', fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                    Theebam
                                </div>
                                <div style={{ color: 'rgba(191,219,254,0.6)', fontSize: '7px', letterSpacing: '0.5px', marginTop: '2px' }}>
                                    Education Centre
                                </div>
                            </div>

                            {/* Grade badge */}
                            <div style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px', padding: '6px 12px',
                                textAlign: 'center',
                                width: '100%',
                                marginTop: '4px'
                            }}>
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 700, letterSpacing: '1px' }}>GRADE</div>
                                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 900, lineHeight: 1, marginTop: '2px' }}>{student.Grade}</div>
                            </div>
                        </div>

                        {/* ── MAIN BODY ── */}
                        <div style={{
                            position: 'absolute', left: '120px', right: 0, top: 0, bottom: 0,
                            background: '#fff',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            padding: '24px',
                            zIndex: 5
                        }}>
                            {/* Top section */}
                            <div>
                                {/* Card type label */}
                                <div style={{
                                    display: 'inline-block',
                                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                                    borderRadius: '6px', padding: '4px 10px',
                                    fontSize: '9px', fontWeight: 800,
                                    color: '#334155', letterSpacing: '1.5px',
                                    textTransform: 'uppercase', marginBottom: '8px',
                                }}>
                                    Student ID Card
                                </div>

                                {/* Student Name */}
                                <div style={{
                                    fontSize: '24px', fontWeight: 900,
                                    color: '#0f172a', lineHeight: 'normal',
                                    paddingTop: '2px', // Solves top cutoff
                                    paddingBottom: '2px',
                                    maxWidth: '200px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {student.StudentName}
                                </div>

                                {/* Student ID */}
                                <div style={{
                                    fontFamily: 'monospace', fontSize: '13px',
                                    color: '#2563eb', letterSpacing: '1.5px',
                                    fontWeight: 700, marginTop: '4px'
                                }}>
                                    {student.StudentID}
                                </div>
                            </div>

                            {/* Middle info row */}
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Academic Year</div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{new Date().getFullYear()}</div>
                                </div>
                                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>
                                <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Status</div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                        Active
                                    </div>
                                </div>
                            </div>

                            {/* QR + bottom strip */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                {/* Bottom label */}
                                <div style={{ fontSize: '9px', color: '#94a3b8', maxWidth: '120px', lineHeight: 1.5, fontWeight: 500 }}>
                                    Scan QR to mark<br />attendance.
                                    <div style={{ color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>theebam.edu.lk</div>
                                </div>

                                {/* QR Code */}
                                <div style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '6px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                }}>
                                    <QRCodeSVG
                                        value={student.StudentID}
                                        size={64}
                                        level="H"
                                        includeMargin={false}
                                        fgColor="#0f172a"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── BOTTOM ACCENT BAR ── */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: '120px', right: 0,
                            height: '6px',
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)',
                            borderBottomRightRadius: '14px',
                            zIndex: 10
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
