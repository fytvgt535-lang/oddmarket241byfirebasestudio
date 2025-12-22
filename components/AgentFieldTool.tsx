
import React, { useState, useEffect, useMemo } from 'react';
import { Stall, Sanction, AgentLog, Mission, Transaction, User } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { 
  QrCode, ShieldAlert, Zap, ShieldCheck, Camera, X, Shield, Landmark, 
  DollarSign, Radio, LogOut, CheckCircle2, ChevronRight, Brain, 
  Loader2, Sparkles, RefreshCw, AlertTriangle, Info, History
} from 'lucide-react';
import { formatCurrency } from '../utils/coreUtils';
import AgentScanner from './agent/AgentScanner';
import AgentAction from './agent/AgentAction';
import { suggestAiPatrol, PatrolRecommendation } from '../services/geminiService';
import toast from 'react-hot-toast';

interface AgentFieldToolProps {
  stalls: Stall[];
  sanctions: Sanction[];
  agentLogs: AgentLog[];
  missions?: Mission[];
  transactions?: Transaction[];
  cashInHand: number;
  isShiftActive: boolean;
  currentUser: User;
  onCollectPayment: (stallId: string, amount: number) => Promise<void>;
  onIssueSanction: (stallId: string, type: string, reason: string, amount: number, evidenceUrl?: string) => Promise<void>;
  onShiftAction: (action: 'start' | 'end' | 'sos' | 'deposit') => void;
}

const AgentFieldTool: React.FC<AgentFieldToolProps> = ({
  stalls, sanctions, agentLogs, missions, transactions = [], cashInHand, isShiftActive, currentUser, onCollectPayment, onIssueSanction, onShiftAction
}) => {
  const [view, setView] = useState<'dashboard' | 'scanner' | 'action' | 'closing'>('dashboard');
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [actionMode, setActionMode] = useState<'collect' | 'sanction'>('collect');
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  // AI PATROL STATE
  const [patrolRecs, setPatrolRecs] = useState<PatrolRecommendation[]>([]);
  const [isGeneratingPatrol, setIsGeneratingPatrol] = useState(false);

  // VIBRATION ENGINE
  const vibrate = (pattern: 'success' | 'error' | 'warning') => {
    if (!navigator.vibrate) return;
    if (pattern === 'success') navigator.vibrate([50, 30, 50]);
    if (pattern === 'error') navigator.vibrate([200, 100, 200]);
    if (pattern === 'warning') navigator.vibrate([100]);
  };

  const handleSOS = () => {
    vibrate('error');
    const confirm = window.confirm("🚨 SIGNALER UNE URGENCE ? Votre position GPS sera envoyée au QG immédiatement.");
    if (confirm) {
      onShiftAction('sos');
      toast.error("ALERTE SOS ENVOYÉE", { duration: 10000, position: 'top-center' });
    }
  };

  const generatePatrol = async () => {
    setIsGeneratingPatrol(true);
    try {
        const recs = await suggestAiPatrol(stalls, transactions, []);
        setPatrolRecs(recs);
        vibrate('success');
    } catch (e) {
        toast.error("Erreur IA");
    } finally {
        setIsGeneratingPatrol(false);
    }
  };

  const solarisClass = isHighContrast ? "bg-white text-black selection:bg-yellow-200" : "bg-slate-50 text-slate-900";

  if (!isShiftActive && view === 'dashboard') {
      return (
          <div className="min-h-[85vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Radio className="w-12 h-12 text-blue-600 animate-pulse"/>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Brigade Mobile</h2>
              <p className="text-slate-500 mb-8 max-w-xs font-medium">Prenez votre service pour activer la géolocalisation et la collecte.</p>
              <Button size="lg" className="w-full bg-blue-600 h-24 text-xl font-black rounded-3xl shadow-2xl active:scale-95" onClick={() => { vibrate('success'); onShiftAction('start'); }}>
                  PRISE DE SERVICE
              </Button>
          </div>
      );
  }

  return (
    <div className={`min-h-screen -m-4 p-4 transition-colors duration-300 ${solarisClass}`}>
        
        {/* TOP SAFETY & ACCESSIBILITY BAR */}
        <div className="flex gap-2 mb-6 sticky top-0 z-50 bg-inherit/90 backdrop-blur-md py-2">
            <button 
                onClick={handleSOS}
                className="flex-1 bg-red-600 text-white h-14 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg active:scale-90"
            >
                <AlertTriangle className="w-5 h-5 animate-pulse"/> SOS URGENCE
            </button>
            <button 
                onClick={() => setIsHighContrast(!isHighContrast)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border-4 ${isHighContrast ? 'border-black bg-black text-white' : 'border-slate-200 bg-white text-slate-400'}`}
            >
                <Zap className="w-6 h-6"/>
            </button>
        </div>

        {view === 'dashboard' && (
            <div className="space-y-6 pb-24">
                {/* AI PATROL CARD - HIGH CONTRAST OPTIMIZED */}
                <Card className={`${isHighContrast ? 'bg-white border-8 border-black text-black' : 'bg-slate-900 text-white border-none shadow-2xl'} p-8 rounded-[3rem] overflow-hidden relative`}>
                    {!isHighContrast && <Sparkles className="absolute -right-10 -top-10 w-48 h-48 opacity-10 text-blue-400"/>}
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black tracking-tighter uppercase mb-1">Missions IA</h3>
                            <p className={`${isHighContrast ? 'text-black' : 'text-blue-400'} text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}>
                                <Brain className="w-4 h-4"/> Optimisation Temps-Réel
                            </p>
                        </div>
                        <button onClick={generatePatrol} className={`${isHighContrast ? 'bg-black text-white' : 'bg-white/10'} p-3 rounded-2xl`}>
                            {isGeneratingPatrol ? <Loader2 className="w-6 h-6 animate-spin"/> : <RefreshCw className="w-6 h-6"/>}
                        </button>
                    </div>

                    <div className="space-y-3 relative z-10">
                        {patrolRecs.length === 0 ? (
                            <button onClick={generatePatrol} className={`w-full py-4 rounded-2xl font-black uppercase text-xs border-2 ${isHighContrast ? 'border-black' : 'border-blue-500/30 text-blue-400 bg-blue-600/10'}`}>
                                Calculer itinéraire prioritaires
                            </button>
                        ) : patrolRecs.map(rec => {
                            const stall = stalls.find(s => s.id === rec.stallId);
                            return (
                                <div 
                                    key={rec.stallId} 
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer ${isHighContrast ? 'border-black bg-white' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    onClick={() => { vibrate('warning'); setSelectedStall(stall || null); setView('action'); }}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${isHighContrast ? 'bg-black text-white' : 'bg-blue-600 text-white'}`}>
                                        {stall?.number || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-sm uppercase">{stall?.occupantName || 'Étal'}</p>
                                        <p className="text-[10px] opacity-60 font-bold italic truncate">"{rec.reason}"</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 opacity-40"/>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* BIG SCAN BUTTON - FOR FATIGUE & SPEED */}
                <button 
                    onClick={() => { vibrate('warning'); setView('scanner'); }}
                    className={`w-full h-40 flex flex-col items-center justify-center rounded-[3rem] shadow-2xl transition-all active:scale-95 border-b-[12px] ${
                        isHighContrast ? 'bg-black text-white border-slate-700' : 'bg-blue-600 text-white border-blue-800'
                    }`}
                >
                    <QrCode className="w-16 h-16 mb-2"/>
                    <span className="font-black uppercase tracking-[0.3em] text-lg">Scanner Étal</span>
                </button>

                {/* STATS & ACTIONS BAR */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className={`p-6 rounded-[2.5rem] flex flex-col justify-between ${isHighContrast ? 'border-4 border-black' : 'border-none shadow-xl bg-white'}`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Main</p>
                        <h4 className="text-2xl font-black text-green-600">{formatCurrency(cashInHand)}</h4>
                    </Card>
                    <button 
                        onClick={() => { vibrate('warning'); setView('closing'); }}
                        className={`p-6 rounded-[2.5rem] flex flex-col justify-between text-left border-4 transition-all ${
                            isHighContrast ? 'border-black bg-white' : 'bg-white border-transparent shadow-xl'
                        }`}
                    >
                        <LogOut className="w-6 h-6 text-slate-400 mb-2"/>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin de Shift</span>
                    </button>
                </div>
            </div>
        )}

        {view === 'scanner' && (
            <div className="fixed inset-0 z-[100] bg-white p-4 flex flex-col animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setView('dashboard')} className="p-4 bg-slate-100 rounded-2xl"><X/></button>
                    <h3 className="font-black uppercase tracking-tighter text-xl">Identification Terrain</h3>
                    <div className="w-12"></div>
                </div>
                <div className="flex-1">
                    <AgentScanner 
                        stalls={stalls} 
                        mode={actionMode} 
                        onScanComplete={(s) => { vibrate('success'); setSelectedStall(s); setView('action'); }} 
                    />
                </div>
            </div>
        )}

        {view === 'action' && selectedStall && (
            <AgentAction 
                stall={selectedStall}
                mode={actionMode}
                sanctions={sanctions}
                transactions={transactions}
                currentUser={currentUser}
                onCancel={() => setView('dashboard')}
                onSuccess={(data) => {
                    vibrate('success');
                    if (actionMode === 'collect') onCollectPayment(selectedStall.id, data.amount);
                    else onIssueSanction(selectedStall.id, data.type, data.reason, data.amount, data.evidenceUrl);
                    setView('dashboard');
                }}
            />
        )}

        {view === 'closing' && (
            <div className="fixed inset-0 z-[100] bg-white p-6 flex flex-col animate-fade-in overflow-y-auto">
                <div className="flex justify-between items-center mb-10">
                    <button onClick={() => setView('dashboard')} className="p-4 bg-slate-100 rounded-2xl"><X/></button>
                    <h3 className="font-black uppercase tracking-tighter text-xl">Clôture de Caisse</h3>
                    <div className="w-12"></div>
                </div>

                <div className="flex-1 space-y-8">
                    <div className="text-center">
                        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] mb-2">Total Collecté ce jour</p>
                        <h4 className="text-6xl font-black text-slate-900 tracking-tighter">{formatCurrency(cashInHand)}</h4>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[3rem] space-y-4 border-2 border-slate-100">
                        <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-500">Transactions validées</span>
                            <span className="text-slate-900">{transactions.length}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-500">Sanctions émises</span>
                            <span className="text-slate-900">{sanctions.filter(s => s.issuedBy === currentUser.id).length}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                            <p className="text-[10px] text-slate-400 uppercase font-black mb-3">Vérification Physique</p>
                            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
                                <DollarSign className="w-5 h-5 text-green-600"/>
                                <span className="font-bold text-sm">Avez-vous le cash en main ?</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button 
                            className="w-full h-20 bg-slate-900 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl"
                            onClick={() => { vibrate('success'); onShiftAction('deposit'); setView('dashboard'); }}
                        >
                            DÉPOSER EN RÉGIE & FERMER
                        </Button>
                        <button 
                            onClick={() => setView('dashboard')}
                            className="w-full py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest"
                        >
                            RETOURNER AU TERRAIN
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AgentFieldTool;
