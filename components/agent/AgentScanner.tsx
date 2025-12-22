
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Camera, X, Zap, ZapOff, MapPin, Loader2, Navigation } from 'lucide-react';
import { Stall } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { parseSecureQrPayload } from '../../utils/coreUtils';
import { calculateDistance } from '../../utils/geoUtils';

interface AgentScannerProps {
  stalls: Stall[];
  mode: 'collect' | 'sanction';
  onScanComplete: (stall: Stall) => void;
  onCustomVerify?: (payload: any) => void;
}

const AgentScanner: React.FC<AgentScannerProps> = ({ stalls, onScanComplete, onCustomVerify }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual' | 'nearby'>('qr');
  const [manualSearch, setManualSearch] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [torchOn, setTorchOn] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
      if (activeTab === 'nearby') {
          navigator.geolocation.getCurrentPosition(
              (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => toast.error("GPS requis")
          );
      }
  }, [activeTab]);

  const nearbyStalls = useMemo(() => {
      if (!userCoords) return [];
      return stalls
          .map(s => ({ ...s, dist: calculateDistance(userCoords.lat, userCoords.lng, s.coordinates?.lat || 0, s.coordinates?.lng || 0) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 5);
  }, [userCoords, stalls]);

  const verifySecureToken = async (qrData: string) => {
      setScanStatus('verifying');
      try {
          const payload = await parseSecureQrPayload(qrData);
          if (onCustomVerify) {
              onCustomVerify(payload);
              return;
          }
          const targetStall = stalls.find(s => s.id === payload.stallId);
          if (!targetStall) throw new Error("Étal inconnu.");
          setScanStatus('valid');
          setTimeout(() => { stopCamera(); onScanComplete(targetStall); }, 400);
      } catch (e: any) {
          setScanStatus('invalid');
          setTimeout(() => setScanStatus('scanning'), 1500);
      }
  };

  const startCamera = async () => {
      setScanStatus('scanning');
      try {
          const scanner = new Html5Qrcode("reader");
          scannerRef.current = scanner;
          // Optimisation pour les conditions de luminosité variables
          await scanner.start(
            { facingMode: "environment" }, 
            { fps: 30, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
            (text) => verifySecureToken(text), 
            () => {}
          );
      } catch (err) {
          setActiveTab('manual');
          toast.error("Veuillez autoriser la caméra.");
      }
  };

  const stopCamera = async () => {
      if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop();
      }
  };

  const toggleTorch = async () => {
      if (scannerRef.current?.isScanning) {
          try {
              const newState = !torchOn;
              // @ts-ignore
              await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] });
              setTorchOn(newState);
          } catch (e) { toast.error("Lampe indisponible"); }
      }
  };

  useEffect(() => { if (activeTab === 'qr') startCamera(); return () => { stopCamera(); }; }, [activeTab]);

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
        <div className="flex bg-slate-900 p-1.5 rounded-[2rem] border border-slate-800 shrink-0 shadow-2xl">
            {(['qr', 'nearby', 'manual'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)} 
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    {tab === 'qr' && <Camera className="w-4 h-4"/>}
                    {tab === 'nearby' && <Navigation className="w-4 h-4"/>}
                    {tab === 'manual' && <Search className="w-4 h-4"/>}
                    {tab}
                </button>
            ))}
        </div>

        {activeTab === 'qr' && (
            <div className={`relative flex-1 bg-black rounded-[3.5rem] overflow-hidden border-8 transition-colors ${
                scanStatus === 'invalid' ? 'border-red-600' : scanStatus === 'valid' ? 'border-green-600' : 'border-slate-800'
            }`}>
                <div id="reader" className="absolute inset-0 w-full h-full object-cover grayscale brightness-110 contrast-125"></div>
                
                {/* L'overlay de scan doit être très visible */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-white/40 rounded-[3rem] flex items-center justify-center">
                        <div className="w-full h-1 bg-blue-500 shadow-[0_0_25px_#3b82f6] animate-scan-line"></div>
                    </div>
                </div>

                <button onClick={toggleTorch} className={`absolute bottom-10 right-10 p-6 rounded-full z-20 shadow-2xl ${torchOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white border border-white/30'}`}>
                    {torchOn ? <Zap className="w-10 h-10"/> : <ZapOff className="w-10 h-10"/>}
                </button>

                {scanStatus === 'verifying' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500"/>
                        <p className="font-black uppercase tracking-widest text-xs">Certification Badge...</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'nearby' && (
            <div className="flex-1 space-y-4 overflow-y-auto pb-10">
                {!userCoords ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin mb-2"/> Localisation...</div>
                ) : nearbyStalls.map(s => (
                    <button key={s.id} onClick={() => onScanComplete(s)} className="w-full bg-white p-6 rounded-[2.5rem] border-4 border-slate-100 hover:border-blue-600 flex justify-between items-center transition-all shadow-md active:scale-95">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">#{s.number}</div>
                            <div className="text-left">
                                <p className="font-black text-slate-900 uppercase leading-none">{s.occupantName || 'Inconnu'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Zone {s.zone} • {s.productType}</p>
                            </div>
                        </div>
                        <Badge variant="success" className="bg-green-50 text-green-700 border-green-100">{Math.round(s.dist)}m</Badge>
                    </button>
                ))}
            </div>
        )}

        {activeTab === 'manual' && (
            <div className="flex-1 flex flex-col">
                <div className="relative mb-4">
                    <Search className="absolute left-6 top-6 text-slate-400 w-8 h-8"/>
                    <input 
                        placeholder="Recherche manuelle..." 
                        value={manualSearch}
                        onChange={e => setManualSearch(e.target.value)}
                        className="w-full pl-16 pr-6 py-6 bg-slate-100 border-none rounded-[2.5rem] font-black text-2xl focus:ring-4 focus:ring-blue-500/20"
                    />
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pb-10">
                    {stalls.filter(s => s.number.includes(manualSearch) || (s.occupantName || '').toLowerCase().includes(manualSearch.toLowerCase())).slice(0, 8).map(s => (
                        <button key={s.id} onClick={() => onScanComplete(s)} className="w-full bg-white p-6 rounded-[2.5rem] border-4 border-slate-50 flex justify-between items-center shadow-sm">
                            <span className="font-black text-2xl">#{s.number}</span>
                            <div className="text-right">
                                <p className="font-bold text-slate-900">{s.occupantName}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Sélect. &rarr;</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default AgentScanner;
