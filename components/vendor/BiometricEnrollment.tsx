
import React, { useState, useRef } from 'react';
import { Camera, Fingerprint, ShieldCheck, Loader2, CheckCircle2, ScanFace, Lock, ShieldAlert, Scale, Info, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { verifyFaceBiometrics, generateLocalTemplate } from '../../services/biometricService';
import toast from 'react-hot-toast';

interface BiometricEnrollmentProps {
    onComplete: (biometricData: any) => void;
    onCancel?: () => void;
}

const FINGERS = [
    { id: 'L-THUMB', label: 'Pouce Gauche' }, { id: 'R-THUMB', label: 'Pouce Droit' },
    { id: 'L-INDEX', label: 'Index Gauche' }, { id: 'R-INDEX', label: 'Index Droit' }
];

const BiometricEnrollment: React.FC<BiometricEnrollmentProps> = ({ onComplete }) => {
    const [step, setStep] = useState<'consent' | 'intro' | 'face' | 'fingers' | 'success'>('consent');
    const [hasConsented, setHasConsented] = useState(false);
    const [currentFingerIndex, setCurrentFingerIndex] = useState(0);
    const [enrolledFingers, setEnrolledFingers] = useState<string[]>([]);
    const [faceStatus, setFaceStatus] = useState<'idle' | 'capturing' | 'verifying' | 'success'>('idle');
    const [localTemplate, setLocalTemplate] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const captureFace = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const context = canvasRef.current.getContext('2d');
        if (!context) return;
        
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const img = canvasRef.current.toDataURL('image/jpeg', 0.8);
        
        setFaceStatus('verifying');
        const result = await verifyFaceBiometrics(img, "enrollment");
        if (result.success) {
            const template = await generateLocalTemplate(img);
            setLocalTemplate(template);
            setFaceStatus('success');
            setTimeout(() => setStep('fingers'), 1000);
        } else {
            setFaceStatus('idle');
            toast.error(result.message);
        }
    };

    const enrollFinger = async () => {
        const finger = FINGERS[currentFingerIndex];
        const newFingers = [...enrolledFingers, finger.id];
        setEnrolledFingers(newFingers);
        if (currentFingerIndex < FINGERS.length - 1) {
            setCurrentFingerIndex(currentFingerIndex + 1);
        } else {
            setStep('success');
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-none" noPadding>
                <div className="bg-slate-950 p-8 text-center border-b border-white/5 shrink-0 relative">
                    <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto mb-3"/>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Certification</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">MarchéConnect • Protocole Souverain</p>
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                    {step === 'consent' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="p-5 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-blue-800 font-black text-xs uppercase">
                                    <Scale className="w-4 h-4"/> Note APDP Gabon
                                </div>
                                <p className="text-xs text-blue-800 font-bold leading-relaxed">
                                    Conformément à la Loi n°001/2011, vos données biométriques sont chiffrées et stockées localement sur ce terminal uniquement.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Garanties de Confidentialité :</h4>
                                <ul className="space-y-2">
                                    {[
                                        "Traitement exécuté sur ce processeur.",
                                        "Aucune image brute transmise sur internet.",
                                        "Droit de suppression via votre profil."
                                    ].map((t, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[11px] text-slate-500 font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0"/> {t}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <label className="flex items-start gap-4 p-5 bg-slate-50 rounded-[2rem] border-4 border-transparent active:border-blue-200 transition-all cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={hasConsented} 
                                    onChange={e => setHasConsented(e.target.checked)}
                                    className="w-6 h-6 rounded-lg accent-blue-600 mt-0.5"
                                />
                                <span className="text-xs font-black text-slate-700 leading-tight">J'accepte le traitement de mes données biométriques pour sécuriser ma caisse.</span>
                            </label>

                            <Button 
                                disabled={!hasConsented} 
                                onClick={() => setStep('intro')} 
                                className="w-full h-20 bg-blue-600 text-white font-black uppercase rounded-3xl shadow-xl disabled:bg-slate-200"
                            >
                                ACCEPTER ET CONTINUER
                            </Button>
                        </div>
                    )}

                    {step === 'intro' && (
                        <div className="space-y-8 text-center animate-fade-in py-6">
                            <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                                <Fingerprint className="w-12 h-12 text-blue-600"/>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Prêt pour l'indexation</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">Positionnez-vous dans un endroit éclairé pour la photo faciale.</p>
                            </div>
                            <Button onClick={() => setStep('face')} className="w-full h-16 bg-slate-900 text-white font-black uppercase rounded-2xl">DÉBUTER</Button>
                        </div>
                    )}

                    {step === 'face' && (
                        <div className="space-y-8 text-center animate-fade-in">
                            <div className="relative aspect-square bg-slate-100 rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-inner flex items-center justify-center">
                                {faceStatus === 'idle' && (
                                    <button onClick={() => {
                                        setFaceStatus('capturing');
                                        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                                            .then(s => { if(videoRef.current) videoRef.current.srcObject = s; });
                                    }} className="flex flex-col items-center">
                                        <Camera className="w-12 h-12 text-blue-600 mb-4"/>
                                        <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Ouvrir l'objectif</span>
                                    </button>
                                )}
                                {faceStatus === 'capturing' && (
                                    <div className="relative w-full h-full">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]"/>
                                        <button onClick={captureFace} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-8 border-blue-600 flex items-center justify-center shadow-2xl">
                                            <div className="w-12 h-12 bg-red-600 rounded-full"></div>
                                        </button>
                                    </div>
                                )}
                                {faceStatus === 'verifying' && (
                                    <div className="flex flex-col items-center animate-pulse">
                                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4"/>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Chiffrement local...</p>
                                    </div>
                                )}
                                {faceStatus === 'success' && <div className="text-center animate-scale-in"><CheckCircle2 className="w-20 h-20 text-green-500 mx-auto"/><p className="text-green-600 font-black mt-4 uppercase tracking-tighter">Points Certifiés</p></div>}
                            </div>
                        </div>
                    )}

                    {step === 'fingers' && (
                        <div className="space-y-8 text-center animate-fade-in flex flex-col">
                            <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                <Fingerprint className="w-20 h-20 mb-6 text-blue-600 animate-pulse"/>
                                <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{FINGERS[currentFingerIndex].label}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase mt-2">Posez le doigt sur le capteur</p>
                            </div>
                            <Button onClick={enrollFinger} className="w-full h-16 bg-blue-600 text-white font-black uppercase rounded-2xl shadow-xl">VALIDER L'EMPREINTE</Button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="space-y-10 text-center animate-scale-in py-10">
                            <div className="relative inline-block">
                                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto"/>
                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-2 rounded-full shadow-lg"><ShieldCheck className="w-6 h-6"/></div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">IDENTITÉ ACTIVE</h4>
                                <p className="text-sm text-slate-400 font-medium">Votre terminal est maintenant couplé à votre biométrie.</p>
                            </div>
                            <Button onClick={() => onComplete({ face: true, fingers: enrolledFingers })} className="w-full h-20 bg-green-600 text-white font-black uppercase rounded-3xl shadow-2xl shadow-green-100">OUVRIR MA CAISSE</Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default BiometricEnrollment;
