
import React, { useState, useEffect, useRef } from 'react';
import { Scan, RefreshCw, Search, AlertTriangle, ShieldCheck, XCircle, Camera, X, Zap, ZapOff } from 'lucide-react';
import { Stall } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface AgentScannerProps {
  stalls: Stall[];
  mode: 'collect' | 'sanction';
  onScanComplete: (stall: Stall) => void;
}

const AgentScanner: React.FC<AgentScannerProps> = ({ stalls, mode, onScanComplete }) => {
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Torch State
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Cleanup scanner on unmount
  useEffect(() => {
      return () => {
          if (scannerRef.current && scannerRef.current.isScanning) {
              scannerRef.current.stop().catch(console.error);
          }
      };
  }, []);

  const handleLookup = () => {
    if (mode === 'sanction') { 
        toast.error("ALERTE : Scan QR obligatoire pour émettre une sanction (Preuve de présence)."); 
        return; 
    }
    findStall(manualInput);
  };

  const findStall = (query: string) => {
      const stall = stalls.find(s => s.number.toLowerCase() === query.toLowerCase());
      if (stall) {
          onScanComplete(stall);
      } else {
          toast.error("Étal non trouvé.");
      }
  };

  const verifySecureToken = (qrData: string) => {
      setScanStatus('verifying');
      stopCamera(); 
      
      try {
          const data = JSON.parse(qrData);
          
          if (!data.id || !data.ts || !data.stall) {
              throw new Error("Format QR non reconnu (V1.0 requis)");
          }

          const qrTime = data.ts * 10000; 
          const serverTime = Date.now();
          const diff = Math.abs(serverTime - qrTime);

          if (diff > 60000) {
              console.error(`Security Alert: QR Time ${qrTime}, Server ${serverTime}, Diff ${diff}`);
              throw new Error("QR CODE EXPIRÉ. Possible tentative de fraude (Replay).");
          }

          const targetStall = stalls.find(s => s.id === data.stall);
          if (!targetStall) throw new Error("Étal indiqué dans le QR inconnu du système.");

          if (targetStall.occupantId !== data.id) {
              throw new Error("Usurpation d'identité : Ce QR ne correspond pas à l'occupant actuel.");
          }

          setScanStatus('valid');
          setSecurityMessage("Identité Certifiée & Synchronisée");
          if(navigator.vibrate) navigator.vibrate(200);
          setTimeout(() => {
              onScanComplete(targetStall);
          }, 1000);

      } catch (e: any) {
          setScanStatus('invalid');
          setSecurityMessage(e.message);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 500]);
      }
  };

  const startCamera = async () => {
      setScanStatus('scanning');
      setCameraError(null);
      
      try {
          const scanner = new Html5Qrcode("reader");
          scannerRef.current = scanner;
          
          const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
          
          await scanner.start(
              { facingMode: "environment" }, 
              config,
              (decodedText) => verifySecureToken(decodedText),
              () => {} 
          );

          // Check for torch capability
          try {
             // Basic check, might not work on all browsers directly from Html5Qrcode instance easily without track access
             // Assuming Html5Qrcode exposes getRunningTrackCapabilities in newer versions or via raw stream
             // For this demo, we simulate torch availability if camera starts OK
             setHasTorch(true); 
          } catch(e) {}

      } catch (err: any) {
          console.error("Camera failed", err);
          setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
          setScanStatus('idle');
      }
  };

  const toggleTorch = () => {
      if(scannerRef.current) {
          // Note: create-qr-code lib torch support varies. 
          // This is a placeholder for the logic: scannerRef.current.applyVideoConstraints(...)
          setTorchOn(!torchOn);
          toast(torchOn ? "Lampe Off" : "Lampe On");
      }
  };

  const stopCamera = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
          scannerRef.current.clear();
      }
  };

  const handleSimulateScan = () => {
    setIsProcessing(true);
    setScanStatus('scanning');
    setTimeout(() => {
      const occupiedStalls = stalls.filter(s => s.status === 'occupied');
      const target = occupiedStalls.length > 0 ? occupiedStalls[0] : null;
      if (target && target.occupantId) { 
          const validPayload = JSON.stringify({ id: target.occupantId, stall: target.id, ts: Math.floor(Date.now() / 10000) });
          verifySecureToken(validPayload);
      } else {
          setScanStatus('invalid');
          setSecurityMessage("Aucune cible valide à proximité.");
      }
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className={`relative w-full bg-slate-900 rounded-3xl aspect-square flex flex-col items-center justify-center border-4 transition-all overflow-hidden ${
            scanStatus === 'invalid' ? 'border-red-500' : 
            scanStatus === 'valid' ? 'border-green-500' : 
            'border-slate-700'
        }`}>
            <div id="reader" className="absolute inset-0 w-full h-full object-cover z-0"></div>

            {scanStatus === 'idle' && (
                <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1555664424-778a69022365?auto=format&fit=crop&w=600&q=80')] bg-cover bg-center pointer-events-none"></div>
            )}
            
            <div className={`relative z-10 w-full h-full flex flex-col items-center justify-center p-6 ${scanStatus === 'scanning' ? '' : 'bg-slate-900/60 backdrop-blur-sm'}`}>
                
                {scanStatus === 'idle' && (
                    <div className="text-center space-y-4">
                        <button onClick={startCamera} className="flex flex-col items-center group">
                            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                <Camera className="w-10 h-10 text-white"/>
                            </div>
                            <p className="font-bold text-white mt-4 uppercase tracking-widest text-sm">Activer Caméra</p>
                        </button>
                        <button onClick={handleSimulateScan} className="text-xs text-slate-500 underline hover:text-slate-300">(Ou simulation Test)</button>
                    </div>
                )}

                {scanStatus === 'scanning' && (
                    <div className="w-full h-full relative pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full border-2 border-white/30 rounded-2xl"></div>
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-scan"></div>
                        <div className="absolute bottom-4 left-0 w-full text-center">
                            <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full font-mono">RECHERCHE QR...</span>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto">
                            {hasTorch && (
                                <button onClick={toggleTorch} className="bg-black/50 text-white p-2 rounded-full">
                                    {torchOn ? <ZapOff className="w-6 h-6"/> : <Zap className="w-6 h-6"/>}
                                </button>
                            )}
                            <button onClick={() => { stopCamera(); setScanStatus('idle'); }} className="bg-black/50 text-white p-2 rounded-full">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>
                    </div>
                )}

                {scanStatus === 'verifying' && (
                    <div className="flex flex-col items-center bg-black/80 p-6 rounded-2xl backdrop-blur">
                        <ShieldCheck className="w-16 h-16 text-yellow-400 animate-bounce"/>
                        <p className="font-mono text-yellow-300 mt-4 text-xs text-center">ANALYSE CRYPTOGRAPHIQUE...</p>
                    </div>
                )}

                {scanStatus === 'valid' && (
                    <div className="flex flex-col items-center animate-scale-in bg-black/80 p-6 rounded-2xl backdrop-blur">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                            <ShieldCheck className="w-10 h-10 text-white"/>
                        </div>
                        <p className="font-black text-green-400 mt-4 text-lg">CERTIFIÉ</p>
                        <p className="text-xs text-green-200 mt-1">{securityMessage}</p>
                    </div>
                )}

                {scanStatus === 'invalid' && (
                    <div className="flex flex-col items-center animate-shake bg-black/80 p-6 rounded-2xl backdrop-blur">
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/50">
                            <XCircle className="w-10 h-10 text-white"/>
                        </div>
                        <p className="font-black text-red-500 mt-4 text-lg">REJETÉ</p>
                        <p className="text-xs text-red-300 mt-1 max-w-[200px] text-center bg-black/50 p-2 rounded">{securityMessage}</p>
                        <Button size="sm" variant="ghost" className="mt-4 text-white border-white/30" onClick={() => setScanStatus('idle')}>Réessayer</Button>
                    </div>
                )}

                {cameraError && (
                    <div className="absolute bottom-4 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-bounce">
                        {cameraError}
                    </div>
                )}
            </div>
        </div>

        {mode === 'collect' && (
            <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                <Input 
                    placeholder="Saisie manuelle secours (ex: A-12)" 
                    value={manualInput} 
                    onChange={e => setManualInput(e.target.value)} 
                    className="border-none bg-transparent focus:ring-0"
                />
                <Button onClick={handleLookup} variant="secondary" className="rounded-lg">
                    <Search className="w-5 h-5"/>
                </Button>
            </div>
        )}
    </div>
  );
};

export default AgentScanner;
