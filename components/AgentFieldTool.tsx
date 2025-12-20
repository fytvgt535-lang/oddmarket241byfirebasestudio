import React, { useState } from 'react';
import { Stall, Sanction, AgentLog, Mission, Transaction } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { CheckCircle, AlertTriangle, QrCode, ClipboardList, History, Power, MapPin, ShieldAlert, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/coreUtils';
import AgentScanner from './agent/AgentScanner';
import AgentAction from './agent/AgentAction';
import AgentHistory from './agent/AgentHistory';
import toast from 'react-hot-toast';

interface AgentFieldToolProps {
  stalls: Stall[];
  sanctions: Sanction[];
  agentLogs: AgentLog[];
  missions?: Mission[];
  transactions?: Transaction[];
  cashInHand: number;
  isShiftActive: boolean;
  onCollectPayment: (stallId: string, amount: number) => Promise<void>;
  onIssueSanction: (stallId: string, type: string, reason: string, amount: number) => Promise<void>;
  onShiftAction: (action: 'start' | 'end' | 'sos' | 'deposit') => void;
  onUpdateMissionStatus?: (id: string, status: string, report?: string) => void;
}

const AgentFieldTool: React.FC<AgentFieldToolProps> = ({
  stalls,
  sanctions,
  agentLogs,
  missions = [],
  transactions = [],
  cashInHand,
  isShiftActive,
  onCollectPayment,
  onIssueSanction,
  onShiftAction,
  onUpdateMissionStatus
}) => {
  const [view, setView] = useState<'dashboard' | 'scanner_collect' | 'scanner_sanction' | 'action' | 'missions' | 'history'>('dashboard');
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // If shift is inactive, force start screen
  if (!isShiftActive) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
          <Power className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">Prise de Service</h2>
          <p className="text-gray-500">Activez votre statut pour commencer.</p>
        </div>
        <Button onClick={() => onShiftAction('start')} size="lg" className="w-full max-w-xs bg-green-600 hover:bg-green-700 shadow-xl shadow-green-200">
          Démarrer le Shift
        </Button>
      </div>
    );
  }

  // Handle Scan Result
  const handleScanSuccess = (stall: Stall) => {
    setSelectedStall(stall);
    setView('action');
  };

  // Handle Action Completion
  const handlePayment = async (amount: number) => {
    if (!selectedStall) return;
    setIsProcessing(true);
    try {
      await onCollectPayment(selectedStall.id, amount);
      if (activeMission && activeMission.targetStallId === selectedStall.id) {
        onUpdateMissionStatus && onUpdateMissionStatus(activeMission.id, 'completed', 'Paiement collecté');
      }
      setView('dashboard');
      setSelectedStall(null);
      setActiveMission(null);
    } catch (e) {
      toast.error("Erreur lors du paiement");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSanction = async (infractionId: string) => {
    if (!selectedStall) return;
    setIsProcessing(true);
    try {
      await onIssueSanction(selectedStall.id, 'fine', 'Infraction Code: ' + infractionId, 10000); // Amount should be dynamic
      toast.success("Sanction émise");
      setView('dashboard');
      setSelectedStall(null);
    } catch (e) {
      toast.error("Erreur lors de la sanction");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-100px)] flex flex-col animate-fade-in relative">
      
      {/* HEADER */}
      {view === 'dashboard' && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Agent Terrain</h2>
            <p className="text-xs text-green-600 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> En Service
            </p>
          </div>
          <button onClick={() => onShiftAction('end')} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
            <LogOut className="w-5 h-5"/>
          </button>
        </div>
      )}

      {/* VIEWS */}
      
      {view === 'dashboard' && (
        <div className="space-y-6 overflow-y-auto pb-20">
          {/* KPI CARD */}
          <Card className="p-6 bg-slate-900 text-white relative overflow-hidden border-none shadow-xl">
            <div className="relative z-10">
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Encaissements (Cash)</p>
              <div className="text-3xl font-black text-white mb-2">{formatCurrency(cashInHand)}</div>
              
              {cashInHand > 0 ? (
                <div className="space-y-3">
                   <p className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                     <AlertTriangle className="w-3 h-3"/> Dépôt requis au QG
                   </p>
                   <Button 
                      variant="secondary" 
                      size="sm"
                      className="w-full bg-white text-slate-900 hover:bg-gray-100 text-xs font-bold"
                      onClick={() => onShiftAction('deposit')}
                   >
                      <CheckCircle className="w-3 h-3 mr-1"/> Valider Dépôt
                   </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-white/10 p-2 rounded-lg w-fit">
                  <CheckCircle className="w-3 h-3"/> Caisse vidée
                </div>
              )}
            </div>
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <QrCode className="w-32 h-32"/>
            </div>
          </Card>

          {/* MISSIONS TEASER */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-gray-800">Missions Prioritaires</h3>
              <button onClick={() => setView('missions')} className="text-xs text-blue-600 font-bold">Voir tout</button>
            </div>
            {missions.filter(m => m.status === 'pending').length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-gray-400 text-xs">
                Aucune mission en attente.
              </div>
            ) : (
              missions.filter(m => m.status === 'pending').slice(0, 2).map(m => (
                <div key={m.id} onClick={() => { setActiveMission(m); setView(m.type === 'collection' ? 'scanner_collect' : 'scanner_sanction'); }} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${m.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></span>
                      <p className="font-bold text-sm text-gray-800">{m.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{m.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400"/>
                </div>
              ))
            )}
          </div>

          {/* ACTIONS GRID */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setView('scanner_collect')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-100 flex flex-col items-center justify-center gap-2 transition-all">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <QrCode className="w-5 h-5"/>
              </div>
              <span className="font-bold text-blue-800 text-sm">Encaisser</span>
            </button>
            <button onClick={() => setView('scanner_sanction')} className="p-4 bg-red-50 hover:bg-red-100 rounded-2xl border border-red-100 flex flex-col items-center justify-center gap-2 transition-all">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-200">
                <ShieldAlert className="w-5 h-5"/>
              </div>
              <span className="font-bold text-red-800 text-sm">Sanctionner</span>
            </button>
            <button onClick={() => setView('history')} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-all">
              <History className="w-6 h-6 text-gray-500"/>
              <span className="font-bold text-gray-600 text-sm">Historique</span>
            </button>
            <button onClick={() => onShiftAction('sos')} className="p-4 bg-orange-50 hover:bg-orange-100 rounded-2xl border border-orange-100 flex flex-col items-center justify-center gap-2 transition-all">
              <AlertTriangle className="w-6 h-6 text-orange-500"/>
              <span className="font-bold text-orange-700 text-sm">SOS QG</span>
            </button>
          </div>
        </div>
      )}

      {/* SCANNER VIEW */}
      {(view === 'scanner_collect' || view === 'scanner_sanction') && (
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => { setView('dashboard'); setActiveMission(null); }} className="text-gray-500 font-bold text-sm hover:text-gray-900">Annuler</button>
            <h3 className="font-bold text-lg">{view === 'scanner_collect' ? 'Scan Paiement' : 'Scan Contrôle'}</h3>
            <div className="w-8"></div>
          </div>
          <div className="flex-1">
            <AgentScanner 
              stalls={stalls} 
              mode={view === 'scanner_collect' ? 'collect' : 'sanction'} 
              onScanComplete={handleScanSuccess} 
            />
          </div>
        </div>
      )}

      {/* ACTION VIEW */}
      {view === 'action' && selectedStall && (
        <div className="h-full flex flex-col">
          <AgentAction 
            stall={selectedStall} 
            mode={activeMission?.type === 'inspection' || view === 'scanner_sanction' ? 'sanction' : 'collect'} 
            sanctions={sanctions}
            activeMission={activeMission}
            onCancel={() => { setView('dashboard'); setSelectedStall(null); }}
            onPayment={handlePayment}
            onSanction={handleSanction}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* HISTORY VIEW */}
      {view === 'history' && (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" variant="ghost" onClick={() => setView('dashboard')}>Retour</Button>
            <h3 className="font-bold text-lg">Journal de Bord</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentHistory logs={agentLogs} />
          </div>
        </div>
      )}

      {/* MISSIONS LIST VIEW */}
      {view === 'missions' && (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" variant="ghost" onClick={() => setView('dashboard')}>Retour</Button>
            <h3 className="font-bold text-lg">Feuille de Route</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {missions.map(m => (
                <div key={m.id} className={`p-4 bg-white rounded-xl border border-gray-100 shadow-sm ${m.status === 'completed' ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${m.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{m.priority}</span>
                        <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-gray-900">{m.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{m.description}</p>
                    {m.status !== 'completed' && (
                        <Button size="sm" onClick={() => { setActiveMission(m); setView(m.type === 'collection' ? 'scanner_collect' : 'scanner_sanction'); }} className="w-full">
                            Traiter
                        </Button>
                    )}
                </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentFieldTool;