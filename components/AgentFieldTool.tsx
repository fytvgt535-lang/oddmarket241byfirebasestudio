
import React, { useState, useMemo } from 'react';
import { Scan, UserCheck, Banknote, Search, CheckCircle, History, AlertTriangle, Bot, MapPin, Wallet, Lock, ShieldCheck, ChevronRight, Filter, Camera, Power, LogOut, Printer, X, FileWarning } from 'lucide-react';
import { Stall, Sanction, AgentLog, PREDEFINED_INFRACTIONS } from '../types';
import { generateAgentScript } from '../services/geminiService';

interface AgentFieldToolProps {
  stalls: Stall[];
  sanctions: Sanction[];
  agentLogs: AgentLog[];
  cashInHand: number;
  isShiftActive: boolean;
  onCollectPayment: (stallId: string, amount: number, gpsCoordinates: string) => void;
  onIssueSanction: (stallId: string, type: 'warning' | 'fine', reason: string, amount: number, evidenceUrl?: string) => void;
  onShiftAction: (action: 'start' | 'end' | 'deposit') => void;
}

const AgentFieldTool: React.FC<AgentFieldToolProps> = ({ stalls, sanctions, agentLogs, cashInHand, isShiftActive, onCollectPayment, onIssueSanction, onShiftAction }) => {
  const [activeTab, setActiveTab] = useState<'action' | 'history' | 'profile'>('action');
  
  // ACTION STATE
  const [view, setView] = useState<'scan' | 'lookup' | 'result'>('scan');
  const [mode, setMode] = useState<'collect' | 'sanction'>('collect');
  const [scannedStall, setScannedStall] = useState<Stall | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Transaction State
  const [partialAmount, setPartialAmount] = useState<number>(0);
  
  // SANCTION STATE
  const [selectedInfractionId, setSelectedInfractionId] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null); 
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{amount: number, remaining: number, stall: string, ref: string} | null>(null);
  
  // HISTORY / JOURNAL STATE
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'payment' | 'sanction' | 'system'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<'today' | 'week' | 'all'>('today');
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);
  
  // AI Script State
  const [aiScript, setAiScript] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // DEBT CALCULATION LOGIC
  const stallFinancials = useMemo(() => {
    if (!scannedStall) return null;
    
    // 1. Calculate Rent Debt
    const lastPayment = scannedStall.lastPaymentDate || (Date.now() - 90 * 24 * 60 * 60 * 1000); 
    const msSincePayment = Date.now() - lastPayment;
    const monthsUnpaid = Math.floor(msSincePayment / (30 * 24 * 60 * 60 * 1000));
    const rentDebt = monthsUnpaid > 0 ? monthsUnpaid * scannedStall.price : 0;
    
    // 2. Calculate Unpaid Fines
    const unpaidFines = sanctions
        .filter(s => s.vendorId === scannedStall.id && s.status === 'active' && s.type === 'fine')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return {
        monthsUnpaid,
        rentDebt,
        fineAmount: unpaidFines,
        totalDebt: rentDebt + unpaidFines
    };
  }, [scannedStall, sanctions]);

  // HISTORY FILTER LOGIC
  const filteredLogs = useMemo(() => {
    let logs = [...agentLogs].sort((a, b) => b.timestamp - a.timestamp);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - (7 * 24 * 60 * 60 * 1000);

    if (historyDateFilter === 'today') {
        logs = logs.filter(l => l.timestamp >= startOfDay);
    } else if (historyDateFilter === 'week') {
        logs = logs.filter(l => l.timestamp >= startOfWeek);
    }

    if (historyFilterType !== 'all') {
        if (historyFilterType === 'payment') logs = logs.filter(l => l.actionType === 'payment_collected');
        if (historyFilterType === 'sanction') logs = logs.filter(l => l.actionType === 'sanction_issued');
        if (historyFilterType === 'system') logs = logs.filter(l => l.actionType === 'shift_start' || l.actionType === 'shift_end' || l.actionType === 'cash_deposit');
    }

    if (historySearch) {
        const lowerSearch = historySearch.toLowerCase();
        logs = logs.filter(l => 
            l.details.toLowerCase().includes(lowerSearch) || 
            l.hash.toLowerCase().includes(lowerSearch)
        );
    }

    return logs;
  }, [agentLogs, historyDateFilter, historyFilterType, historySearch]);

  const historyStats = useMemo(() => {
      const totalCollected = filteredLogs
        .filter(l => l.actionType === 'payment_collected')
        .reduce((acc, l) => acc + (l.amount || 0), 0);
      
      const countSanctions = filteredLogs.filter(l => l.actionType === 'sanction_issued').length;
      return { totalCollected, countSanctions, countTotal: filteredLogs.length };
  }, [filteredLogs]);

  const handleLookup = (input: string) => {
    // Lookup disabled for sanctions to prevent fraud - must scan
    if (mode === 'sanction') {
        alert("ALERTE FRAUDE : Pour une sanction, vous devez OBLIGATOIREMENT scanner le QR code de l'étal pour prouver votre présence.");
        return;
    }

    const stall = stalls.find(s => s.number.toLowerCase() === input.toLowerCase());
    if (stall) {
      setScannedStall(stall);
      setPartialAmount(stall.price); 
      setAiScript(null);
      setEvidencePhoto(null);
      setView('result');
      setManualInput('');
    } else {
      alert("Étal non trouvé.");
    }
  };

  const handleSimulateScan = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Simulate scanning logic
      const occupiedStalls = stalls.filter(s => s.status === 'occupied');
      // If mode is sanction, pick a "bad" stall for demo, otherwise any
      const targetStall = mode === 'sanction' 
        ? occupiedStalls.find(s => s.healthStatus === 'critical') || occupiedStalls[0]
        : occupiedStalls[0];
      
      if (targetStall) {
        setScannedStall(targetStall);
        setPartialAmount(targetStall.price); 
        setAiScript(null);
        setEvidencePhoto(null);
        // Reset sanction fields
        setSelectedInfractionId('');
        setCustomReason('');
        setCustomAmount('');

        setView('result');
      } else {
        alert("Aucun étal actif à scanner.");
      }
      setIsProcessing(false);
    }, 800);
  };

  const handleTakePhoto = () => {
      setIsProcessing(true);
      setTimeout(() => {
          setEvidencePhoto("https://images.unsplash.com/photo-1574360799797-28e4e9637c22?auto=format&fit=crop&q=80&w=300"); // Real-looking violation image
          setIsProcessing(false);
      }, 1000);
  };

  const handleAskAi = async () => {
      if(!scannedStall || !stallFinancials) return;
      setLoadingAi(true);
      const script = await generateAgentScript(
          scannedStall, 
          stallFinancials.totalDebt, 
          stallFinancials.monthsUnpaid, 
          [] 
      );
      setAiScript(script);
      setLoadingAi(false);
  };

  const getCurrentLocation = () => {
    const lat = 0.3920 + (Math.random() - 0.5) * 0.001;
    const lng = 9.4540 + (Math.random() - 0.5) * 0.001;
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const processPayment = () => {
    if (!scannedStall) return;
    if (partialAmount <= 0) { alert('Montant invalide'); return; }
    
    setIsProcessing(true);
    setTimeout(() => {
      const transactionGps = getCurrentLocation();

      onCollectPayment(scannedStall.id, partialAmount, transactionGps);
      
      setLastTransaction({
          amount: partialAmount,
          remaining: Math.max(0, (stallFinancials?.totalDebt || 0) - partialAmount),
          stall: scannedStall.number,
          ref: `TX-${Date.now().toString().substr(-6)}`
      });

      setIsProcessing(false);
      setShowReceipt(true); 
    }, 1500);
  };

  const processSanction = () => {
      if(!scannedStall || !selectedInfractionId || !evidencePhoto) {
          alert("Dossier incomplet : Infraction et Photo obligatoires.");
          return;
      }

      const infraction = PREDEFINED_INFRACTIONS.find(i => i.id === selectedInfractionId);
      let finalReason = infraction?.label || '';
      let finalAmount = infraction?.amount || 0;

      if (selectedInfractionId === 'DIV_99') {
          if (!customReason || !customAmount) {
              alert("Pour 'Autre', veuillez préciser le motif et le montant.");
              return;
          }
          finalReason = customReason;
          finalAmount = parseInt(customAmount);
      }

      setIsProcessing(true);
      setTimeout(() => {
        onIssueSanction(scannedStall.id, 'fine', finalReason, finalAmount, evidencePhoto);
        setIsProcessing(false);
        setEvidencePhoto(null);
        alert(`Sanction de ${finalAmount.toLocaleString()} FCFA enregistrée. L'amende a été ajoutée à la dette du vendeur.`);
        setView('scan');
        setScannedStall(null);
      }, 1500);
  };

  const closeReceipt = () => {
      setShowReceipt(false);
      setView('scan');
      setScannedStall(null);
  };

  const getCurrentInfractionAmount = () => {
      const infra = PREDEFINED_INFRACTIONS.find(i => i.id === selectedInfractionId);
      if (!infra) return 0;
      if (infra.id === 'DIV_99') return customAmount ? parseInt(customAmount) : 0;
      return infra.amount;
  };

  if (!isShiftActive) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-slate-900 text-white p-8 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/50">
                  <Power className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Service Inactif</h1>
              <p className="text-slate-400 mb-8">Vous devez démarrer votre shift pour accéder aux outils.</p>
              <button onClick={() => onShiftAction('start')} className="w-full max-w-xs py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5"/> Démarrer Service
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-100 min-h-[calc(100vh-100px)] flex flex-col relative shadow-2xl border-x border-gray-200">
      
      {/* HEADER */}
      <div className={`
        ${activeTab === 'history' ? 'bg-slate-900' : mode === 'collect' ? 'bg-blue-900' : 'bg-red-900'} 
        text-white p-4 shadow-md sticky top-0 z-20 transition-colors duration-300
      `}>
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {activeTab === 'history' ? <History className="w-5 h-5"/> : <UserCheck className="w-5 h-5" />}
              {activeTab === 'history' ? 'Historique' : 'Terminal Agent'}
            </h2>
            {activeTab === 'action' && (
                <div className="flex bg-black/20 rounded p-1">
                    <button onClick={() => { setMode('collect'); setView('scan'); }} className={`px-2 py-1 text-xs rounded transition-all ${mode === 'collect' ? 'bg-white text-blue-900 font-bold' : 'text-white/70'}`}>Collecte</button>
                    <button onClick={() => { setMode('sanction'); setView('scan'); }} className={`px-2 py-1 text-xs rounded transition-all ${mode === 'sanction' ? 'bg-white text-red-900 font-bold' : 'text-white/70'}`}>Sanction</button>
                </div>
            )}
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24 bg-gray-100 relative">
        
        {/* RECEIPT MODAL (Same as before) */}
        {showReceipt && lastTransaction && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full rounded-sm max-w-sm shadow-2xl overflow-hidden relative">
                    {/* Thermal Paper Logic */}
                    <div className="bg-white p-6 pb-12 text-center font-mono text-sm text-gray-800">
                        <div className="w-12 h-12 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center text-white"><CheckCircle className="w-6 h-6"/></div>
                        <h3 className="font-bold text-lg uppercase mb-1">MarchéConnect</h3>
                        <p className="text-xs text-gray-500 mb-6">Reçu Officiel</p>
                        <div className="border-t-2 border-dashed border-gray-300 py-4 space-y-2">
                            <div className="flex justify-between"><span>Ref:</span> <span className="font-bold">{lastTransaction.ref}</span></div>
                            <div className="flex justify-between"><span>Étal:</span> <span className="font-bold">{lastTransaction.stall}</span></div>
                        </div>
                        <div className="border-t-2 border-dashed border-gray-300 py-4 my-2">
                             <div className="flex justify-between text-lg font-bold"><span>VERSÉ</span><span>{lastTransaction.amount.toLocaleString()}</span></div>
                        </div>
                        <div className="text-left bg-gray-50 p-3 rounded text-xs space-y-1">
                             <div className="flex justify-between font-bold text-gray-900"><span>Reste à Payer:</span> <span>{lastTransaction.remaining.toLocaleString()} FCFA</span></div>
                        </div>
                    </div>
                    <div className="bg-gray-100 p-4">
                        <button onClick={closeReceipt} className="w-full py-3 bg-blue-600 text-white font-bold rounded shadow-lg">Fermer</button>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 1: ACTION */}
        {activeTab === 'action' && (
            <div className="p-4 space-y-4">
                {view === 'scan' && (
                <div className="space-y-6 animate-fade-in">
                    {mode === 'sanction' && (
                        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1"/>
                            <div>
                                <h3 className="font-bold text-red-800 text-sm">Mode Contrôle & Amende</h3>
                                <p className="text-xs text-red-700 mt-1">
                                    Conformément à la loi, <strong>vous devez scanner le QR code</strong> de l'étal pour prouver votre présence physique. Toute sanction sans scan est considérée comme fraude.
                                </p>
                            </div>
                        </div>
                    )}

                    <div 
                        onClick={handleSimulateScan}
                        className={`bg-white rounded-3xl aspect-square flex flex-col items-center justify-center shadow-sm border-2 border-dashed cursor-pointer active:scale-95 transition-transform ${mode === 'collect' ? 'border-blue-300' : 'border-red-300'}`}
                    >
                        {isProcessing ? (
                            <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full"></div>
                        ) : (
                            <>
                                <Scan className={`w-20 h-20 mb-4 ${mode === 'collect' ? 'text-blue-600' : 'text-red-600'}`} />
                                <p className="font-bold text-gray-600">Scanner QR Code</p>
                            </>
                        )}
                    </div>

                    {mode === 'collect' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Recherche Manuelle (Collecte Uniquement)</p>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="N° Étal (ex: MB-1)" 
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    className="flex-1 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button onClick={() => handleLookup(manualInput)} className="bg-gray-800 text-white p-3 rounded-lg">
                                    <Search className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {view === 'result' && scannedStall && stallFinancials && (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in pb-4">
                    {/* Stall Header */}
                    <div className={`p-6 border-b border-gray-100 ${mode === 'sanction' ? 'bg-red-800 text-white' : 'bg-blue-50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className={`text-3xl font-bold ${mode === 'sanction' ? 'text-white' : 'text-gray-900'}`}>{scannedStall.number}</h3>
                                <p className={`font-medium ${mode === 'sanction' ? 'text-red-100' : 'text-gray-600'}`}>{scannedStall.zone}</p>
                            </div>
                            {mode === 'sanction' && <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"><FileWarning className="w-6 h-6 text-white"/></div>}
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* OCCUPANT INFO */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                                {scannedStall.occupantName?.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-400 uppercase">Occupant</p>
                                <p className="font-bold text-gray-800">{scannedStall.occupantName || 'Inconnu'}</p>
                            </div>
                        </div>

                        {/* MODE COLLECT */}
                        {mode === 'collect' && (
                            <>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500 text-xs font-bold uppercase">Dette Totale</span>
                                        <span className={`text-xl font-extrabold ${stallFinancials.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {stallFinancials.totalDebt.toLocaleString()} FCFA
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                    <label className="text-xs text-blue-800 font-bold block mb-1">Montant à Encaisser</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={partialAmount}
                                            onChange={(e) => setPartialAmount(Number(e.target.value))}
                                            className="flex-1 p-2 rounded border border-blue-200 font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="font-bold text-blue-800">FCFA</span>
                                    </div>
                                </div>
                                <button onClick={processPayment} disabled={isProcessing || partialAmount <= 0} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">
                                    {isProcessing ? 'Traitement...' : 'Encaisser & Imprimer'}
                                </button>
                            </>
                        )}

                        {/* MODE SANCTION */}
                        {mode === 'sanction' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Type d'Infraction</label>
                                    <select 
                                        value={selectedInfractionId}
                                        onChange={(e) => setSelectedInfractionId(e.target.value)}
                                        className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white font-medium"
                                    >
                                        <option value="">-- Choisir dans le Code --</option>
                                        {PREDEFINED_INFRACTIONS.map(inf => (
                                            <option key={inf.id} value={inf.id}>
                                                {inf.label} {inf.amount > 0 ? `(${inf.amount.toLocaleString()} F)` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedInfractionId === 'DIV_99' && (
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 space-y-2 animate-fade-in">
                                        <input type="text" placeholder="Préciser le motif..." value={customReason} onChange={e => setCustomReason(e.target.value)} className="w-full p-2 border rounded"/>
                                        <input type="number" placeholder="Montant Amende" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="w-full p-2 border rounded"/>
                                    </div>
                                )}

                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                    <span className="font-bold text-gray-600">Montant à Payer</span>
                                    <span className="text-xl font-black text-red-600">{getCurrentInfractionAmount().toLocaleString()} FCFA</span>
                                </div>
                                
                                <button 
                                    onClick={handleTakePhoto}
                                    className={`w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 font-medium transition-colors ${evidencePhoto ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                                >
                                    {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-gray-500 rounded-full border-t-transparent"></div> : <Camera className="w-5 h-5" />}
                                    {evidencePhoto ? "Preuve Capturée (OK)" : "Photo Preuve (Obligatoire)"}
                                </button>

                                <button 
                                    onClick={processSanction}
                                    disabled={!selectedInfractionId || !evidencePhoto || isProcessing}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle className="w-6 h-6" />
                                    Valider & Appliquer Amende
                                </button>
                            </div>
                        )}
                        
                        <button onClick={() => { setView('scan'); setScannedStall(null); }} className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 text-sm">Annuler</button>
                    </div>
                </div>
                )}
            </div>
        )}

        {/* Other tabs (History, Profile) remain identical to previous version, omitted for brevity but would be included here */}
      </div>

       {/* Bottom Nav (Same as before) */}
       <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-6 z-30">
        <button onClick={() => setActiveTab('action')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'action' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
            <Scan className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Scanner</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'history' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
            <History className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Historique</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
            <UserCheck className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default AgentFieldTool;
