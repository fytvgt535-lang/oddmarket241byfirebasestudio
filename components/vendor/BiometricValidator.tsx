
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, Loader2, X, RefreshCw, ScanFace, Cpu, Lock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { verifyFaceBiometrics } from '../../services/biometricService';
import toast from 'react-hot-toast';

interface BiometricValidatorProps {
    userId: string;
    onVerified: () => void;
    onCancel: () => void;
}

const BiometricValidator: React.FC<BiometricValidatorProps> = ({ userId, onVerified, onCancel }) => {
    const [status, setStatus] = useState<'idle' | 'capturing' | 'verifying' | 'success' | 'fail'>('idle');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        setStatus('capturing');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (e) {
            toast.error("Vérifiez les permissions caméra.");
            setStatus('idle');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const data = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setCapturedImage(data);
                stopCamera();
                runLocalValidation(data);
            }
        }
    };

    const runLocalValidation = async (img: string) => {
        setStatus('verifying');
        const result = await verifyFaceBiometrics(img, userId);
        if (result.success) {
            setStatus('success');
            toast.success("Validation souveraine réussie.");
            setTimeout(onVerified, 1200);
        } else {
            setStatus('fail');
            toast.error(result.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
            <Card className="w-full max-w-sm overflow-hidden bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] border-none rounded-[3rem]" noPadding>
                <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2"><Cpu className="w-20 h-20 opacity-5 -rotate-12"/></div>
                    <button onClick={onCancel} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X/></button>
                    <ScanFace className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse"/>
                    <h3 className="font-black uppercase tracking-tighter text-xl">Accès Souverain</h3>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <Lock className="w-3 h-3 text-green-400"/>
                        <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Traitement 100% Local (On-Device)</span>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="relative aspect-square bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-inner flex items-center justify-center">
                        {status === 'idle' && (
                            <button onClick={startCamera} className="flex flex-col items-center group">
                                <div className="p-8 bg-blue-600 rounded-full text-white shadow-2xl group-hover:scale-110 transition-transform">
                                    <Camera className="w-10 h-10"/>
                                </div>
                                <span className="mt-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">Initialiser la Vision</span>
                            </button>
                        )}

                        {status === 'capturing' && (
                            <div className="relative w-full h-full">
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]"/>
                                <div className="absolute inset-0 border-[20px] border-slate-900/10 rounded-[inherit]"></div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 border-2 border-blue-500/50 rounded-full border-dashed animate-spin-slow"></div>
                                </div>
                                <button onClick={capture} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-8 border-blue-600 shadow-2xl active:scale-90 transition-transform flex items-center justify-center">
                                    <div className="w-12 h-12 bg-red-600 rounded-full"></div>
                                </button>
                            </div>
                        )}

                        {(status === 'verifying' || status === 'success' || status === 'fail') && capturedImage && (
                            <div className="relative w-full h-full">
                                <img src={capturedImage} className="w-full h-full object-cover scale-x-[-1]" alt="Captured"/>
                                {status === 'verifying' && (
                                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[4px] flex flex-col items-center justify-center">
                                        <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4"/>
                                        <p className="text-blue-100 font-black text-[10px] uppercase tracking-widest animate-pulse">Encryption Localhost...</p>
                                    </div>
                                )}
                                {status === 'success' && (
                                    <div className="absolute inset-0 bg-green-600/80 backdrop-blur-[4px] flex flex-col items-center justify-center animate-fade-in">
                                        <ShieldCheck className="w-20 h-20 text-white mb-4"/>
                                        <p className="text-white font-black text-xs uppercase tracking-widest">Passeport Numérique Valide</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden"/>
                    </div>

                    {status === 'fail' && (
                        <Button variant="danger" className="w-full h-14 rounded-2xl font-black shadow-xl shadow-red-200" onClick={() => setStatus('idle')}>
                            <RefreshCw className="w-5 h-5 mr-2"/> RECOMMENCER
                        </Button>
                    )}

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 text-center uppercase font-black leading-relaxed">
                            VOTRE VIE PRIVÉE EST GARANTIE : L'intelligence artificielle est exécutée sur votre processeur. Aucune image n'est transmise via internet.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BiometricValidator;
