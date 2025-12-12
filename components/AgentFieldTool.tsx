
import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, RefreshCw, LogOut, CheckCircle, ListChecks, Target, AlertTriangle, ArrowLeft, Loader2, Satellite, MapPin, BatteryCharging, Zap, ZapOff, ShieldAlert, Wallet, QrCode, Camera, Image as ImageIcon, X, EyeOff, Lock, Unlock, FileText, History, DollarSign, Clock, Search, ChevronRight, Printer, Share2 } from 'lucide-react';
import { Stall, Sanction, AgentLog, Mission, Transaction } from '../types';
import { Button } from './ui/Button';
import AgentScanner from './agent/AgentScanner';
import AgentAction from './agent/AgentAction';
import AgentHistory from './agent/AgentHistory';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import SecureActionModal from './ui/SecureActionModal'; // Security Import
import { formatCurrency } from '../utils/coreUtils';
import { updateAgentLocation, uploadFile, fileToBase64 } from '../services/supabaseService';
import { getDistrictFromCoordinates } from '../utils/geoUtils';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

interface AgentFieldToolProps {
  stalls: Stall[];
  sanctions: Sanction[];
  agentLogs: AgentLog[];
  missions?: Mission[]; 
  transactions?: Transaction[]; 
  cashInHand: number;
  isShiftActive: boolean;
  onCollectPayment: (stallId: string, amount: number, gpsCoordinates: string) => Promise<void> | void;
  onIssueSanction: (stallId: string, type: 'warning' | 'fine', reason: string, amount: number, evidenceUrl?: string) => Promise<void> | void;
  onShiftAction: (action: 'start' | 'end' | 'deposit' | 'sos' | 'visit') => void; 
  onUpdateMissionStatus?: (id: string, status: string, report?: string) => void;
}

const MAX_SAFE_CASH = 50000;
const IDLE_TIMEOUT = 120000; // 2 minutes d'inactivité avant verrouillage

// Haversine distance helper (meters)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const AgentFieldTool: React.FC<AgentFieldToolProps> = ({ stalls, sanctions, agentLogs, missions = [], transactions = [], cashInHand, isShiftActive, onCollectPayment, onIssueSanction, onShiftAction, onUpdateMissionStatus }) => {
  const [view, setView] = useState<'scan' | 'missions' | 'action' | 'success' | 'deposit_qr' | 'history'>('missions'); 
  const [historyTab, setHistoryTab] = useState<'logs' | 'invoices'>('invoices');
  
  const [mode, setMode] = useState<'collect' | 'sanction' | 'visit'>('collect');
  const [scannedStall, setScannedStall] = useState<Stall | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState({ title: '', amount: 0 });
  
  // Local History Management (Optimistic UI)
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Sync props to state when props change (e.g. background refresh)
  useEffect(() => {
      // Merge prop transactions with any locally created ones not yet in props (deduplication logic needed in real app)
      // For simplicity here, we just use props, assuming rapid refresh or relying on local append for immediate feedback
      setLocalTransactions(prev => {
          const newIds = new Set(transactions.map(t => t.id));
          const localsOnly = prev.filter(t => !newIds.has(t.id));
          return [...localsOnly, ...transactions].sort((a,b) => b.date - a.date);
      });
  }, [transactions]);

  // GPS & Battery State
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [currentDistrict, setCurrentDistrict] = useState<string>('Init...');
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [trackingMode, setTrackingMode] = useState<'active' | 'eco'>('active'); 
  
  // Security State
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // SOS State
  const [isSosActive, setIsSosActive] = useState(false);
  const [isSosSecureModalOpen, setIsSosSecureModalOpen] = useState(false); // Modal state
  const [currentUserEmail, setCurrentUserEmail] = useState(''); // Email for validation

  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  // Evidence Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null); // Contains URL or Base64
  const [isUploading, setIsUploading] = useState(false);

  // Refs for tracking algorithms
  const lastGpsUpdateRef = useRef<number>(0);
  const lastPosRef = useRef<{lat: number, lng: number} | null>(null);

  const isCashLimitExceeded = cashInHand > MAX_SAFE_CASH;

  // Init User Email for Secure Modal
  useEffect(() => {
      supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email || ''));
  }, []);

  // --- AUTO-LOCK LOGIC ---
  const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (isShiftActive && !isLocked && !isSosActive) {
          idleTimerRef.current = setTimeout(() => {
              setIsLocked(true);
              if (navigator.vibrate) navigator.vibrate(200);
          }, IDLE_TIMEOUT);
      }
  };

  useEffect(() => {
      const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
      const handler = () => resetIdleTimer();
      
      events.forEach(e => window.addEventListener(e, handler));
      resetIdleTimer();

      return () => {
          events.forEach(e => window.removeEventListener(e, handler));
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
  }, [isShiftActive, isLocked, isSosActive]);

  const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      // Code PIN simple pour la démo. En prod, vérifier contre le hash user.
      if (unlockPin === '1234') {
          setIsLocked(false);
          setUnlockPin('');
          toast.success("Terminal déverrouillé");
      } else {
          toast.error("Code PIN incorrect", { icon: '🔒' });
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
  };

  // --- WAKE LOCK (ROBUST) ---
  useEffect(() => {
      const requestWakeLock = async () => {
          if (isShiftActive && 'wakeLock' in navigator && document.visibilityState === 'visible') {
              try {
                  const lock = await (navigator as any).wakeLock.request('screen');
                  setWakeLock(lock);
                  // console.log("Wake Lock active");
              } catch (err: any) { 
                  // Silently fail if blocked by policy (common in iframes/preview)
                  if (err.name === 'NotAllowedError') {
                      console.warn("Wake Lock blocked by policy (iframe/permissions). Screen may dim.");
                  } else {
                      console.warn(`Wake Lock failed: ${err.message}`); 
                  }
              }
          }
      };
      
      if (isShiftActive) requestWakeLock();
      
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && isShiftActive && !wakeLock) {
              requestWakeLock();
          }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => { 
          if (wakeLock) wakeLock.release().catch(() => {}); 
          document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
  }, [isShiftActive]);

  // --- GPS TRACKING ---
  useEffect(() => {
      let watchId: number;
      if (isShiftActive && 'geolocation' in navigator) {
          const geoOptions = trackingMode === 'active' 
            ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 } 
            : { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 };

          watchId = navigator.geolocation.watchPosition(
              async (position) => {
                  const now = Date.now();
                  const { latitude, longitude } = position.coords;
                  const district = getDistrictFromCoordinates(latitude, longitude);
                  setCurrentDistrict(district);

                  let dist = 0;
                  if (lastPosRef.current) {
                      dist = getDistance(lastPosRef.current.lat, lastPosRef.current.lng, latitude, longitude);
                  }
                  lastPosRef.current = { lat: latitude, lng: longitude };

                  if (dist < 10 && trackingMode === 'active') setTrackingMode('eco');
                  if (dist > 20 && trackingMode === 'eco') setTrackingMode('active');

                  const threshold = isSosActive ? 3000 : (trackingMode === 'active' ? 10000 : 60000);

                  if (now - lastGpsUpdateRef.current > threshold) {
                      setIsSendingLocation(true);
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                          // Fire and forget - don't await to avoid UI lag
                          updateAgentLocation(user.id, latitude, longitude, district, { 
                              isShiftActive: true, 
                              cashInHand, 
                              currentDistrict: district,
                              status: isSosActive ? 'SOS' : isLocked ? 'LOCKED' : 'OK', 
                              batteryLevel: trackingMode 
                          }).catch(err => {
                              // Suppress errors here, already handled in service
                          });
                          lastGpsUpdateRef.current = now;
                      }
                      setTimeout(() => setIsSendingLocation(false), 500); 
                  }
                  setGpsError(null);
              },
              (error) => { setGpsError("Signal GPS perdu."); },
              geoOptions
          );
      }
      return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isShiftActive, cashInHand, trackingMode, isSosActive, isLocked]);

  const handleSOS = () => {
      if (isSosActive) {
          // POUR DÉSACTIVER : Ouvrir modale sécurisée
          setIsSosSecureModalOpen(true);
      } else {
          // POUR ACTIVER : Immédiat
          setIsSosActive(true);
          setTrackingMode('active'); 
          onShiftAction('sos');
          const lat = lastPosRef.current?.lat || 0;
          const lng = lastPosRef.current?.lng || 0;
          const smsBody = `URGENCE SOS AGENT. Pos: ${lat.toFixed(6)}, ${lng.toFixed(6)}. Besoin renfort immédiat.`;
          window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
          toast.error("SOS ACTIVÉ ! REDONDANCE SMS DÉCLENCHÉE.", { duration: 6000, icon: '📡' });
      }
  };

  const performSosDeactivation = async () => {
      setIsSosActive(false);
      setTrackingMode('active');
      onShiftAction('start'); // Reset status to active/start
      toast.success("Code confirmé. Alerte SOS levée.", { icon: '✅' });
  };

  const startMission = (mission: Mission) => {
      setActiveMission(mission);
      if (mission.type === 'collection') setMode('collect');
      else setMode('sanction');
      setView('scan');
      toast("Mission Active : Scannez la cible", { icon: '🎯' });
  };

  const handleScanComplete = (stall: Stall) => {
      if (activeMission && activeMission.targetStallId && activeMission.targetStallId !== stall.id) {
          toast.error("Étal incorrect pour cette mission !");
          return;
      }
      setScannedStall(stall);
      setEvidenceUrl(null); // Reset evidence
      setView('action');
  };

  const handleEvidenceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsUploading(true);
          try {
              const file = e.target.files[0];
              const base64 = await fileToBase64(file);
              setEvidenceUrl(base64);
              toast.success("Preuve capturée (Stockée localement)");
          } catch (err: any) {
              toast.error("Erreur capture: " + err.message);
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handlePayment = async (amount: number) => {
      if (!scannedStall) return;
      setIsProcessing(true);
      try {
          let coords = "0.0,0.0";
          if (lastPosRef.current) coords = `${lastPosRef.current.lat},${lastPosRef.current.lng}`;
          
          await onCollectPayment(scannedStall.id, amount, coords);
          
          // OPTIMISTIC UPDATE FOR HISTORY
          const newTx: Transaction = {
              id: `temp-${Date.now()}`,
              marketId: scannedStall.marketId,
              amount: amount,
              type: 'rent',
              provider: 'cash',
              stallNumber: scannedStall.number,
              reference: `TEMP-${Date.now().toString().slice(-6)}`,
              status: 'completed',
              date: Date.now()
          };
          setLocalTransactions(prev => [newTx, ...prev]);

          if(navigator.vibrate) navigator.vibrate([50, 50, 50]); // Haptic feedback
          
          if (activeMission && onUpdateMissionStatus) {
              onUpdateMissionStatus(activeMission.id, 'completed', `Paiement de ${formatCurrency(amount)} perçu.`);
              setActiveMission(null); 
          }
          setLastAction({ title: 'Paiement Reçu', amount });
          setView('success');
      } catch(e) { /* handled in parent */ } finally { setIsProcessing(false); }
  };

  const handleSanction = async (infractionId: string) => {
      if (!scannedStall) return;
      if (!evidenceUrl) {
          toast.error("Preuve photo OBLIGATOIRE pour sanctionner.");
          return;
      }
      setIsProcessing(true);
      try {
          const fineAmount = 5000; 
          await onIssueSanction(scannedStall.id, 'fine', `Infraction ${infractionId}`, fineAmount, evidenceUrl); 
          
          if (activeMission && onUpdateMissionStatus) {
              onUpdateMissionStatus(activeMission.id, 'completed', `Sanction émise: ${infractionId}`);
              setActiveMission(null);
          }
          setLastAction({ title: 'Sanction Émise', amount: fineAmount });
          setView('success');
      } catch(e) { /* handled */ } finally { setIsProcessing(false); }
  };

  const handleVisit = async () => {
      if (!scannedStall) return;
      if (!evidenceUrl) {
          toast.error("Preuve photo OBLIGATOIRE (Étal fermé ou vide).");
          return;
      }
      setIsProcessing(true);
      try {
          const { error } = await supabase.from('audit_logs').insert([{
              actor_id: (await supabase.auth.getUser()).data.user?.id,
              action: 'STALL_VISIT',
              target_id: scannedStall.id,
              new_value: { status: 'visited', evidence: evidenceUrl, reason: 'Fermé/Absent' }
          }]);
          
          if (error) throw error;

          setLastAction({ title: 'Passage Enregistré', amount: 0 });
          setView('success');
      } catch (e: any) {
          toast.error("Erreur enregistrement: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const resetFlow = () => {
      setScannedStall(null);
      setEvidenceUrl(null);
      setView(activeMission ? 'scan' : 'missions');
  };

  const handleAbortMission = () => {
      if (confirm("Abandonner la mission en cours ?")) {
          setActiveMission(null);
          setView('missions');
          setScannedStall(null);
      }
  };

  const handleEndShift = () => {
      if (cashInHand > 0) {
          toast.error("Caisse non vide ! Effectuez un dépôt au QG avant de finir.", { duration: 5000 });
          setView('deposit_qr');
          return;
      }
      if (confirm("Confirmer la fin de service ?")) onShiftAction('end');
  };

  const filteredTransactions = localTransactions.filter(t => 
      t.stallNumber?.toLowerCase().includes(historySearch.toLowerCase()) ||
      t.reference.toLowerCase().includes(historySearch.toLowerCase())
  );

  if (!isShiftActive) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
              <div className="text-center text-white space-y-6">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <UserCheck className="w-12 h-12"/>
                  </div>
                  <h2 className="text-2xl font-bold">Début de Service</h2>
                  <p className="text-slate-400">Veuillez pointer pour activer le suivi ODD.</p>
                  <Button onClick={() => onShiftAction('start')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 text-lg shadow-green-500/30">
                      COMMENCER MA RONDE
                  </Button>
              </div>
          </div>
      );
  }

  // --- LOCK SCREEN ---
  if (isLocked) {
      return (
          <div className="fixed inset-0 bg-slate-900 z-[999] flex flex-col items-center justify-center p-6 text-white animate-fade-in">
              <div className="mb-8 p-4 bg-white/5 rounded-full border border-white/10">
                  <Lock className="w-12 h-12 text-blue-400"/>
              </div>
              <h2 className="text-2xl font-black mb-2">Terminal Verrouillé</h2>
              <p className="text-slate-400 mb-8 text-center text-sm">Le GPS reste actif en arrière-plan.</p>
              
              <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
                  <input 
                      type="password" 
                      value={unlockPin} 
                      onChange={e => setUnlockPin(e.target.value)} 
                      placeholder="Code PIN" 
                      className="w-full text-center text-2xl tracking-widest py-4 bg-slate-800 border border-slate-600 rounded-xl focus:border-blue-500 outline-none text-white"
                      autoFocus
                      inputMode="numeric"
                  />
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-4 font-bold text-lg">
                      <Unlock className="w-5 h-5 mr-2"/> Déverrouiller
                  </Button>
              </form>
              <div className="mt-8 text-xs text-slate-600 font-mono">
                  SESSION ID: {Date.now().toString().slice(-6)}
              </div>
          </div>
      );
  }

  // --- DEPOSIT QR CODE GENERATION ---
  const depositQRData = JSON.stringify({
      type: 'deposit',
      amount: cashInHand,
      timestamp: Date.now()
  });
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(depositQRData)}`;

  return (
    <div className={`max-w-md mx-auto min-h-screen pb-24 flex flex-col transition-colors duration-500 ${isSosActive ? 'bg-red-900' : 'bg-gray-50'}`}>
      
      {/* SECURE MODAL FOR SOS DEACTIVATION */}
      <SecureActionModal
          isOpen={isSosSecureModalOpen}
          onClose={() => setIsSosSecureModalOpen(false)}
          onConfirm={performSosDeactivation}
          title="Désactivation Alerte SOS"
          description="Confirmez que vous êtes en sécurité en entrant votre mot de passe."
          email={currentUserEmail}
          confirmText="Je suis en sécurité"
          variant="primary"
      />

      {/* RECEIPT MODAL */}
      {selectedTx && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedTx(null)}>
              <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5"/> Reçu Numérique</h3>
                      <button onClick={() => setSelectedTx(null)}><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-6 text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                          <CheckCircle className="w-8 h-8"/>
                      </div>
                      <div>
                          <p className="text-3xl font-black text-gray-900">{formatCurrency(selectedTx.amount)}</p>
                          <p className="text-sm text-gray-500 font-bold uppercase">{selectedTx.type}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-left space-y-2">
                          <div className="flex justify-between"><span className="text-gray-500">Date:</span> <span className="font-bold">{new Date(selectedTx.date).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Étal:</span> <span className="font-bold">{selectedTx.stallNumber}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Ref:</span> <span className="font-mono text-xs bg-gray-200 px-1 rounded">{selectedTx.reference.slice(0,10)}...</span></div>
                      </div>
                      <div className="flex gap-3">
                          <Button variant="outline" className="flex-1" leftIcon={Printer}>Imprimer</Button>
                          <Button variant="secondary" className="flex-1" leftIcon={Share2}>Partager</Button>
                      </div>
                  </div>
                  <div className="bg-gray-100 p-3 text-center text-xs text-gray-400">
                      Certifié par MarchéConnect
                  </div>
              </div>
          </div>
      )}

      {/* Header with Alert Logic */}
      <div className={`p-4 sticky top-0 z-20 flex justify-between items-start text-white shadow-lg transition-colors ${isSosActive ? 'bg-red-800 animate-pulse' : isCashLimitExceeded ? 'bg-purple-800' : activeMission ? 'bg-orange-600' : 'bg-slate-900'}`}>
        <div>
            {isSosActive ? (
                <div>
                    <h2 className="font-black text-2xl flex gap-2 items-center text-white"><ShieldAlert className="w-8 h-8"/> SOS ACTIF</h2>
                    <p className="text-xs font-bold text-red-200">REPLI GSM DÉCLENCHÉ</p>
                </div>
            ) : isCashLimitExceeded ? (
                <div>
                    <h2 className="font-black text-lg flex gap-2 items-center text-white"><Wallet className="w-5 h-5"/> DÉPÔT REQUIS</h2>
                    <p className="text-xs font-bold text-purple-200">PLAFOND CASH ATTEINT</p>
                </div>
            ) : activeMission ? (
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 animate-pulse"/> 
                        <span className="text-xs font-bold uppercase tracking-widest">Mission En Cours</span>
                    </div>
                    <h2 className="font-bold text-lg leading-tight">{activeMission.title}</h2>
                </div>
            ) : (
                <div>
                    <h2 className="font-black text-lg flex gap-2 items-center"><UserCheck className="w-5 h-5"/> TERMINAL AGENT</h2>
                    <p className="text-xs opacity-70 font-mono">CAISSE: {cashInHand.toLocaleString()} F</p>
                </div>
            )}
        </div>
        
        {/* ODD Telemetry */}
        <div className="flex flex-col items-end gap-1">
            <button 
                onClick={handleSOS}
                className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 shadow-lg ${isSosActive ? 'bg-white text-red-600' : 'bg-red-600 text-white border border-red-400'}`}
            >
                <ShieldAlert className="w-3 h-3"/> {isSosActive ? 'ANNULER' : 'SOS'}
            </button>

            <div className={`flex items-center gap-1 text-[10px] font-mono border border-white/30 rounded px-2 py-1 ${isSendingLocation ? 'bg-green-500 text-black' : 'bg-black/30 text-green-400'}`}>
                <Satellite className={`w-3 h-3 ${isSendingLocation ? 'animate-spin' : ''}`}/>
                {trackingMode === 'active' ? 'HIGH' : 'ECO'}
            </div>
            
            <div className="flex items-center gap-1 text-[10px] bg-white/10 px-2 py-1 rounded max-w-[120px] truncate">
                <MapPin className="w-3 h-3"/> {currentDistrict}
            </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        
        {/* CRITICAL ALERT BLOCKER - CLICK TO DEPOSIT */}
        {isCashLimitExceeded && !isSosActive && view !== 'deposit_qr' && (
            <div 
                onClick={() => setView('deposit_qr')}
                className="bg-purple-100 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg animate-pulse cursor-pointer shadow-md"
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-purple-600 mt-1"/>
                    <div>
                        <h4 className="font-bold text-purple-800">Caisse Saturée ({formatCurrency(cashInHand)})</h4>
                        <p className="text-sm text-purple-700">Touchez ici pour générer le code de dépôt au QG.</p>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: DEPOSIT QR (SECURE HANDSHAKE) */}
        {!isSosActive && view === 'deposit_qr' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in">
                <Card className="p-8 bg-white border-2 border-slate-900 text-center shadow-2xl w-full max-w-sm">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">Mandat de Dépôt</h3>
                    <p className="text-sm text-slate-500 mb-6">Présentez ce code au Régisseur.</p>
                    
                    <div className="bg-white p-2 rounded-xl border-4 border-slate-900 mx-auto w-fit mb-6">
                        {cashInHand > 0 ? (
                            <img src={qrUrl} alt="Deposit QR" className="w-48 h-48 mix-blend-multiply" />
                        ) : (
                            <div className="w-48 h-48 flex items-center justify-center bg-gray-100 text-gray-400">
                                <CheckCircle className="w-12 h-12"/>
                            </div>
                        )}
                    </div>

                    <div className="text-3xl font-black text-slate-900 mb-2">{formatCurrency(cashInHand)}</div>
                    {cashInHand === 0 ? (
                        <div className="flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 p-2 rounded">
                            <CheckCircle className="w-5 h-5"/> Dépôt Confirmé
                        </div>
                    ) : (
                        <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded animate-pulse">
                            En attente de scan superviseur...
                        </p>
                    )}
                </Card>
                <Button variant="ghost" onClick={() => setView('missions')}>Retour</Button>
            </div>
        )}

        {/* VIEW: MISSIONS LIST */}
        {view === 'missions' && !isSosActive && (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <ListChecks className="w-5 h-5"/> Mes Missions
                    </h3>
                    {cashInHand > 0 && (
                        <button onClick={() => setView('deposit_qr')} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow">
                            <QrCode className="w-3 h-3"/> Verser Caisse
                        </button>
                    )}
                </div>
                {missions.filter(m => m.status !== 'completed').length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                        <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2"/>
                        <p className="text-gray-500">Aucune mission.</p>
                        <Button variant="outline" onClick={() => setView('scan')} className="mt-4">Scanner un Étal</Button>
                    </div>
                ) : (
                    missions.filter(m => m.status !== 'completed').map(m => (
                        <Card key={m.id} className="border-l-4 border-l-blue-500">
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={m.priority === 'urgent' ? 'danger' : 'info'}>{m.priority.toUpperCase()}</Badge>
                                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <h4 className="font-bold text-gray-900">{m.title}</h4>
                                <p className="text-sm text-gray-600 mb-4">{m.description}</p>
                                <Button size="sm" variant="primary" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => startMission(m)}>
                                    Intervenir
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        )}

        {/* SOS OVERLAY */}
        {isSosActive && (
            <div className="flex flex-col items-center justify-center h-full text-white text-center space-y-6">
                <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center animate-ping">
                    <ShieldAlert className="w-16 h-16 text-white"/>
                </div>
                <div className="bg-red-800 p-6 rounded-2xl border border-red-600">
                    <h3 className="text-2xl font-black mb-2">MODE SURVIE</h3>
                    <p className="text-red-200">1. Data envoyée au QG.</p>
                    <p className="text-red-200">2. SMS de secours pré-rédigé.</p>
                    <p className="text-white mt-4 font-bold text-sm bg-black/20 p-2 rounded">Gardez votre téléphone allumé.</p>
                </div>
                <Button onClick={() => setIsSosSecureModalOpen(true)} className="bg-white text-red-600 hover:bg-red-50 mt-8">Fausse Alerte / Je suis en sécurité</Button>
            </div>
        )}

        {/* STANDARD VIEWS (Hidden during SOS) */}
        {!isSosActive && view === 'scan' && (
            <>
                <div className="flex justify-between items-center mb-4">
                    {activeMission && (
                        <button onClick={handleAbortMission} className="text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-red-500"><ArrowLeft className="w-3 h-3"/> Abandonner</button>
                    )}
                    <div className="text-xs text-gray-400 font-bold uppercase">Mode Scan Actif</div>
                </div>
                <AgentScanner stalls={stalls} mode={'collect'} onScanComplete={handleScanComplete} />
                <div className="mt-8 bg-gray-50 p-2 rounded text-center text-xs text-gray-400">
                    Visez le QR Code du vendeur pour agir.
                </div>
            </>
        )}

        {/* HISTORY VIEW */}
        {!isSosActive && view === 'history' && (
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex bg-gray-200 rounded-lg p-1 shrink-0">
                    <button onClick={() => setHistoryTab('invoices')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${historyTab === 'invoices' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                        <DollarSign className="w-3 h-3"/> Factures
                    </button>
                    <button onClick={() => setHistoryTab('logs')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${historyTab === 'logs' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                        <History className="w-3 h-3"/> Journal
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {historyTab === 'logs' && <AgentHistory logs={agentLogs} />}
                    
                    {historyTab === 'invoices' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    placeholder="Rechercher (ex: A-12, #REF)" 
                                    value={historySearch} 
                                    onChange={e => setHistorySearch(e.target.value)} 
                                    className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {filteredTransactions.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                                    <p>Aucune transaction trouvée.</p>
                                </div>
                            ) : (
                                filteredTransactions.map(tx => (
                                    <div 
                                        key={tx.id} 
                                        onClick={() => setSelectedTx(tx)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer hover:border-blue-300 transition-colors"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-black text-gray-900">Étal {tx.stallNumber || '?'}</p>
                                                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">REF: {tx.reference.substring(0, 12)}...</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-lg text-blue-600">{formatCurrency(tx.amount)}</span>
                                                <ChevronRight className="w-4 h-4 text-gray-300 inline-block ml-1"/>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-50">
                                            <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">{tx.type}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(tx.date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {!isSosActive && view === 'action' && scannedStall && (
            <div className="space-y-4">
                {/* MODE SELECTION IN CONTEXT */}
                <div className="flex gap-2 mb-4 p-1 bg-gray-200 rounded-lg">
                    <button onClick={() => setMode('collect')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === 'collect' ? 'bg-white text-blue-900 shadow' : 'text-gray-500'}`}>Collecte</button>
                    <button onClick={() => setMode('sanction')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === 'sanction' ? 'bg-white text-red-900 shadow' : 'text-gray-500'}`}>Sanction</button>
                    <button onClick={() => setMode('visit')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === 'visit' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}>Passage</button>
                </div>

                {/* INLINE EVIDENCE CAPTURE FOR SANCTIONS OR VISITS */}
                {(mode === 'sanction' || mode === 'visit') ? (
                    <Card className={`animate-fade-in shadow-xl border-t-4 ${mode === 'sanction' ? 'border-red-600' : 'border-gray-600'}`}>
                        <div className={`p-4 border-b flex justify-between items-center ${mode === 'sanction' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                            <h3 className={`font-bold ${mode === 'sanction' ? 'text-red-900' : 'text-gray-900'}`}>
                                {mode === 'sanction' ? 'Nouvelle Sanction' : 'Signaler Absence / Fermé'}
                            </h3>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded text-gray-600 border border-gray-200">#{scannedStall.number}</span>
                        </div>
                        <div className="p-6 space-y-6">
                            {mode === 'sanction' && (
                                <AgentAction 
                                    stall={scannedStall} mode={mode} sanctions={sanctions} activeMission={activeMission}
                                    onCancel={resetFlow} onPayment={handlePayment} onSanction={handleSanction} isProcessing={isProcessing}
                                />
                            )}
                            {mode === 'visit' && (
                                <div className="text-sm text-gray-600">
                                    <p className="mb-4">Si le vendeur est absent ou l'étal fermé, prenez une photo pour prouver votre passage et justifier l'absence de recette.</p>
                                    <Button onClick={handleVisit} isLoading={isProcessing} className="w-full bg-gray-800 text-white" disabled={!evidenceUrl}>Valider le Passage</Button>
                                </div>
                            )}
                            
                            {/* EVIDENCE BLOCK - SHARED */}
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Preuve Photo (Obligatoire)</label>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleEvidenceSelect} />
                                
                                <div 
                                    onClick={() => !evidenceUrl && fileInputRef.current?.click()}
                                    className={`relative w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${evidenceUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-gray-400"/>
                                    ) : evidenceUrl ? (
                                        <>
                                            <img src={evidenceUrl} className="absolute inset-0 w-full h-full object-cover rounded-xl" alt="Preuve"/>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEvidenceUrl(null); }}
                                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg"
                                            >
                                                <X className="w-4 h-4"/>
                                            </button>
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md flex items-center gap-1">
                                                <MapPin className="w-3 h-3"/> {currentDistrict}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-8 h-8 text-gray-400 mb-2"/>
                                            <p className="text-xs font-bold text-gray-500">Toucher pour prendre photo</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <AgentAction 
                        stall={scannedStall} mode={mode} sanctions={sanctions} activeMission={activeMission}
                        onCancel={resetFlow} onPayment={handlePayment} onSanction={handleSanction} isProcessing={isProcessing}
                    />
                )}
            </div>
        )}

        {!isSosActive && view === 'success' && (
            <Card className="p-8 text-center animate-fade-in bg-white border-2 border-green-500 shadow-2xl mt-10">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce"><CheckCircle className="w-10 h-10"/></div>
                <h3 className="font-black text-2xl text-gray-900 mb-2">{lastAction.title}</h3>
                <p className="text-3xl font-black text-green-600 mb-8">{lastAction.amount > 0 ? lastAction.amount.toLocaleString() + ' F' : 'Confirmé'}</p>
                <Button onClick={resetFlow} className="w-full py-4 bg-gray-900 text-white hover:bg-black">{activeMission ? "Mission Suivante" : "Nouvelle Action"}</Button>
            </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      {!isSosActive && view !== 'deposit_qr' && (
          <div className="bg-white border-t border-gray-200 p-2 flex justify-around items-center fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
              <button onClick={() => { setActiveMission(null); setView('missions'); }} className={`flex flex-col items-center p-2 rounded-lg ${view === 'missions' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                  <ListChecks className="w-6 h-6"/>
                  <span className="text-[10px] font-bold">Missions</span>
              </button>
              <button onClick={() => { setActiveMission(null); setView('scan'); }} className={`flex flex-col items-center p-2 rounded-lg ${view === 'scan' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                  <Target className="w-6 h-6"/>
                  <span className="text-[10px] font-bold">Scanner</span>
              </button>
              <button onClick={() => { setActiveMission(null); setView('history'); }} className={`flex flex-col items-center p-2 rounded-lg ${view === 'history' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                  <History className="w-6 h-6"/>
                  <span className="text-[10px] font-bold">Historique</span>
              </button>
              <button onClick={handleEndShift} className="flex flex-col items-center p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                  <LogOut className="w-6 h-6"/>
                  <span className="text-[10px] font-bold">Fin</span>
              </button>
          </div>
      )}
    </div>
  );
};

export default AgentFieldTool;
