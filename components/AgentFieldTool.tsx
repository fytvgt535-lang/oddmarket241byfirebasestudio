
import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, RefreshCw, LogOut, CheckCircle, ListChecks, Target, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Stall, Sanction, AgentLog, Mission } from '../types';
import { Button } from './ui/Button';
import AgentScanner from './agent/AgentScanner';
import AgentAction from './agent/AgentAction';
import AgentHistory from './agent/AgentHistory';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '../utils/coreUtils';
import { updateAgentLocation } from '../services/supabaseService';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

interface AgentFieldToolProps {
  stalls: Stall[];
  sanctions: Sanction[];
  agentLogs: AgentLog[];
  missions?: Mission[]; // Added Missions Prop
  cashInHand: number;
  isShiftActive: boolean;
  onCollectPayment: (stallId: string, amount: number, gpsCoordinates: string) => Promise<void> | void;
  onIssueSanction: (stallId: string, type: 'warning' | 'fine', reason: string, amount: number, evidenceUrl?: string) => Promise<void> | void;
  onShiftAction: (action: 'start' | 'end' | 'deposit') => void;
  onUpdateMissionStatus?: (id: string, status: string, report?: string) => void;
}

const AgentFieldTool: React.FC<AgentFieldToolProps> = ({ stalls, sanctions, agentLogs, missions = [], cashInHand, isShiftActive, onCollectPayment, onIssueSanction, onShiftAction, onUpdateMissionStatus }) => {
  const [view, setView] = useState<'scan' | 'missions' | 'action' | 'success'>('missions'); // Default to missions if any
  const [mode, setMode] = useState<'collect' | 'sanction'>('collect');
  const [scannedStall, setScannedStall] = useState<Stall | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState({ title: '', amount: 0 });
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  // MISSION CONTEXT (Workflow Locking)
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  // REAL-TIME GPS TRACKER WITH THROTTLING
  // Ref to track last update time to prevent DB spam (Technical Debt Fix)
  const lastGpsUpdateRef = useRef<number>(0);

  useEffect(() => {
      let watchId: number;
      
      if (isShiftActive && 'geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
              async (position) => {
                  const now = Date.now();
                  // STRICT THROTTLE: Only update DB every 30 seconds
                  if (now - lastGpsUpdateRef.current > 30000) {
                      const { latitude, longitude } = position.coords;
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                          // Note: We don't fetch the full profile here to save read bandwidth.
                          // We pass empty stats object, relying on the backend or service to handle merge if needed,
                          // or we accept that stats might be slightly stale in the location update packet.
                          // Ideally, updateAgentLocation only patches lat/lng/lastActive.
                          await updateAgentLocation(user.id, latitude, longitude, {});
                          lastGpsUpdateRef.current = now;
                      }
                  }
                  setGpsError(null);
              },
              (error) => {
                  console.error("GPS Error", error);
                  setGpsError("Signal GPS faible.");
              },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
          );
      }
      return () => {
          if (watchId) navigator.geolocation.clearWatch(watchId);
      };
  }, [isShiftActive]);

  const activeMissions = missions.filter(m => m.status === 'pending' || m.status === 'in_progress');

  const startMission = (mission: Mission) => {
      setActiveMission(mission);
      // Pre-configure mode based on mission type
      if (mission.type === 'collection') setMode('collect');
      else setMode('sanction'); // inspection/verification/security
      
      setView('scan');
      toast("Mission Active : Scannez la cible", { icon: '🎯' });
  };

  const handleScanComplete = (stall: Stall) => {
      // Mission Validation Logic
      if (activeMission) {
          // If mission has a specific target (usually implicit in description or could be explicit field)
          // Here we do a fuzzy check on description for demo purposes or check if mission is bound to market/zone
          // Ideally, mission would have targetStallId. Assuming implicit for now or loose coupling.
          
          // If targetStallId existed:
          if (activeMission.targetStallId && activeMission.targetStallId !== stall.id) {
              toast.error("Étal incorrect pour cette mission !");
              return;
          }
      }
      
      setScannedStall(stall);
      setView('action');
  };

  const handlePayment = async (amount: number) => {
      if (!scannedStall) return;
      setIsProcessing(true);
      try {
          // Attempt to get real GPS for transaction
          let coords = "0.0,0.0";
          if ('geolocation' in navigator) {
              try {
                  const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
                      navigator.geolocation.getCurrentPosition(resolve, reject, {timeout: 3000})
                  );
                  coords = `${pos.coords.latitude},${pos.coords.longitude}`;
              } catch { /* ignore */ }
          }

          await onCollectPayment(scannedStall.id, amount, coords);
          
          if (activeMission && onUpdateMissionStatus) {
              onUpdateMissionStatus(activeMission.id, 'completed', `Paiement de ${formatCurrency(amount)} perçu.`);
              setActiveMission(null); // Clear context
          }
          
          setLastAction({ title: 'Paiement Reçu', amount });
          setView('success');
      } catch(e) {
          // Error handling done by toaster in parent
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSanction = async (infractionId: string) => {
      if (!scannedStall) return;
      setIsProcessing(true);
      try {
          const fineAmount = 5000; 
          await onIssueSanction(scannedStall.id, 'fine', `Infraction ${infractionId}`, fineAmount); 
          
          if (activeMission && onUpdateMissionStatus) {
              onUpdateMissionStatus(activeMission.id, 'completed', `Sanction émise: ${infractionId}`);
              setActiveMission(null);
          }

          setLastAction({ title: 'Sanction Émise', amount: fineAmount });
          setView('success');
      } catch(e) {
          // Error handling
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAbortMission = () => {
      setActiveMission(null);
      setView('missions');
      setScannedStall(null);
  };

  const resetFlow = () => {
      setScannedStall(null);
      setView(activeMission ? 'scan' : 'missions');
  };

  if (!isShiftActive) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
              <div className="text-center text-white space-y-6">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <UserCheck className="w-12 h-12"/>
                  </div>
                  <h2 className="text-2xl font-bold">Début de Service</h2>
                  <p className="text-slate-400">Veuillez pointer pour activer votre terminal.</p>
                  <Button onClick={() => onShiftAction('start')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 text-lg shadow-green-500/30">
                      COMMENCER MA RONDE
                  </Button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-24 flex flex-col">
      {/* Header */}
      <div className={`p-6 sticky top-0 z-20 flex justify-between items-center text-white shadow-lg transition-colors ${activeMission ? 'bg-orange-600' : mode === 'collect' ? 'bg-blue-900' : 'bg-red-900'}`}>
        <div>
            {activeMission ? (
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
        {gpsError && <div className="text-xs bg-red-500 p-1 rounded animate-pulse">{gpsError}</div>}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        
        {/* VIEW: MISSIONS LIST */}
        {view === 'missions' && (
            <div className="space-y-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <ListChecks className="w-5 h-5"/> Mes Missions ({activeMissions.length})
                </h3>
                
                {activeMissions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                        <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2"/>
                        <p className="text-gray-500">Aucune mission en cours.</p>
                        <Button variant="outline" onClick={() => setView('scan')} className="mt-4">Scanner un Étal</Button>
                    </div>
                ) : (
                    activeMissions.map(m => (
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

        {/* VIEW: SCANNER */}
        {view === 'scan' && (
            <>
                <div className="flex justify-between items-center mb-4">
                    {activeMission && (
                        <button onClick={handleAbortMission} className="text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-red-500">
                            <ArrowLeft className="w-3 h-3"/> Abandonner Mission
                        </button>
                    )}
                    <div className="flex bg-gray-200 rounded-lg p-1 ml-auto">
                        <button onClick={() => setMode('collect')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'collect' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}>Collecte</button>
                        <button onClick={() => setMode('sanction')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'sanction' ? 'bg-white shadow text-red-900' : 'text-gray-500'}`}>Sanction</button>
                    </div>
                </div>
                <AgentScanner stalls={stalls} mode={mode} onScanComplete={handleScanComplete} />
                <div className="mt-8">
                    <AgentHistory logs={agentLogs} />
                </div>
            </>
        )}

        {/* VIEW: ACTION FORM */}
        {view === 'action' && scannedStall && (
            <AgentAction 
                stall={scannedStall} 
                mode={mode} 
                sanctions={sanctions} 
                activeMission={activeMission}
                onCancel={resetFlow} 
                onPayment={handlePayment} 
                onSanction={handleSanction}
                isProcessing={isProcessing}
            />
        )}

        {/* VIEW: SUCCESS */}
        {view === 'success' && (
            <Card className="p-8 text-center animate-fade-in bg-white border-2 border-green-500 shadow-2xl mt-10">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
                    <CheckCircle className="w-10 h-10"/>
                </div>
                <h3 className="font-black text-2xl text-gray-900 mb-2">{lastAction.title}</h3>
                <p className="text-3xl font-black text-green-600 mb-8">{lastAction.amount.toLocaleString()} F</p>
                <Button onClick={resetFlow} className="w-full py-4 bg-gray-900 text-white hover:bg-black">
                    {activeMission ? "Mission Suivante" : "Nouvelle Action"}
                </Button>
            </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 p-2 flex justify-around items-center fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <button onClick={() => { setActiveMission(null); setView('missions'); }} className={`flex flex-col items-center p-2 rounded-lg ${view === 'missions' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
              <ListChecks className="w-6 h-6"/>
              <span className="text-[10px] font-bold">Missions</span>
          </button>
          <button onClick={() => { setActiveMission(null); setView('scan'); }} className={`flex flex-col items-center p-2 rounded-lg ${view === 'scan' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
              <Target className="w-6 h-6"/>
              <span className="text-[10px] font-bold">Scanner</span>
          </button>
          <button onClick={() => onShiftAction('end')} className="flex flex-col items-center p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
              <LogOut className="w-6 h-6"/>
              <span className="text-[10px] font-bold">Quitter</span>
          </button>
      </div>
    </div>
  );
};

export default AgentFieldTool;
