
import React, { useState, useMemo } from 'react';
import { Scan, UserCheck, Banknote, Search, CheckCircle, History, AlertTriangle, Bot, MapPin, Wallet, Lock, ShieldCheck, ChevronRight, Filter, Camera, Power, LogOut, Printer, X } from 'lucide-react';
import { Stall, Sanction, AgentLog } from '../types';
import { generateAgentScript } from '../services/geminiService';

interface AgentFieldToolProps {
  stalls: Stall[];
  sanctions: Sanction[];
  agentLogs: AgentLog[];
  cashInHand: number;
  isShiftActive: boolean;
  onCollectPayment: (stallId: string, amount: number, gpsCoordinates: string) => void;
  onIssueSanction: (stallId: string, type: 'warning' | 'fine', reason: string, evidenceUrl?: string) => void;
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
  const [sanctionReason, setSanctionReason] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null); // Mock photo URL
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
    const mockFine = scannedStall.healthStatus === 'critical' ? 15000 : 0;
    
    return {
        monthsUnpaid,
        rentDebt,
        fineAmount: mockFine,
        totalDebt: rentDebt + mockFine
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
    const stall = stalls.find(s => s.number.toLowerCase() === input.toLowerCase());
    if (stall) {
      setScannedStall(stall);
      setPartialAmount(stall.price); // Default to full price
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
      const occupiedStalls = stalls.filter(s => s.status === 'occupied');
      const targetStall = occupiedStalls.find(s => s.healthStatus === 'critical') || occupiedStalls[0];
      
      if (targetStall) {
        setScannedStall(targetStall);
        setPartialAmount(targetStall.price); // Default to full price
        setAiScript(null);
        setEvidencePhoto(null);
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
          setEvidencePhoto("https://via.placeholder.com/300?text=Preuve+Infraction");
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

  // Helper to simulate high-precision GPS capture at moment of transaction
  const getCurrentLocation = () => {
    // Simulate Libreville Market area coordinates with slight variance
    const lat = 0.3920 + (Math.random() - 0.5) * 0.001;
    const lng = 9.4540 + (Math.random() - 0.5) * 0.001;
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const processPayment = () => {
    if (!scannedStall) return;
    if (partialAmount <= 0) { alert('Montant invalide'); return; }
    
    setIsProcessing(true);
    setTimeout(() => {
      // Capture Location NOW
      const transactionGps = getCurrentLocation();

      onCollectPayment(scannedStall.id, partialAmount, transactionGps);
      
      // Prepare Receipt Data
      setLastTransaction({
          amount: partialAmount,
          remaining: Math.max(0, (stallFinancials?.totalDebt || 0) - partialAmount),
          stall: scannedStall.number,
          ref: `TX-${Date.now().toString().substr(-6)}`
      });

      setIsProcessing(false);
      setShowReceipt(true); // Trigger Receipt Modal
    }, 1500);
  };

  const closeReceipt = () => {
      setShowReceipt(false);
      setView('scan');
      setScannedStall(null);
  };

  const processSanction = () => {
      if(!scannedStall || !sanctionReason || !evidencePhoto) {
          alert("Veuillez sélectionner un motif et prendre une photo de preuve.");
          return;
      }
      setIsProcessing(true);
      setTimeout(() => {
        onIssueSanction(scannedStall.id, 'warning', sanctionReason, evidencePhoto);
        setIsProcessing(false);
        setSanctionReason('');
        setEvidencePhoto(null);
        alert("Avertissement enregistré avec succès.");
        setView('scan');
        setScannedStall(null);
      }, 1500);
  };

  // --- BLOCKED STATE IF SHIFT IS INACTIVE ---
  if (!isShiftActive) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-slate-900 text-white p-8 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/50">
                  <Power className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Service Inactif</h1>
              <p className="text-slate-400 mb-8">Vous devez démarrer votre shift pour accéder aux outils de collecte et d'audit.</p>
              <button 
                onClick={() => onShiftAction('start')}
                className="w-full max-w-xs py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                  <CheckCircle className="w-5 h-5"/>
                  Démarrer mon Service
              </button>
              <p className="mt-8 text-xs text-slate-500 flex items-center gap-2">
                  <Lock className="w-3 h-3"/> Accès Sécurisé • Géolocalisation Requise
              </p>
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
              {activeTab === 'history' ? 'Historique Transactions' : 'Terminal Agent'}
            </h2>
            {activeTab === 'action' && (
                <div className="flex bg-black/20 rounded p-1">
                    <button onClick={() => setMode('collect')} className={`px-2 py-1 text-xs rounded transition-all ${mode === 'collect' ? 'bg-white text-blue-900 font-bold' : 'text-white/70'}`}>Collecte</button>
                    <button onClick={() => setMode('sanction')} className={`px-2 py-1 text-xs rounded transition-all ${mode === 'sanction' ? 'bg-white text-red-900 font-bold' : 'text-white/70'}`}>Contrôle</button>
                </div>
            )}
        </div>
        <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Libreville, Marché Mont-Bouët
        </p>
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24 bg-gray-100 relative">
        
        {/* --- RECEIPT MODAL --- */}
        {showReceipt && lastTransaction && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full rounded-sm max-w-sm shadow-2xl overflow-hidden relative">
                    {/* Thermal Paper Effect */}
                    <div className="bg-white p-6 pb-12 relative text-center font-mono text-sm text-gray-800">
                        <div className="w-12 h-12 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center text-white">
                            <CheckCircle className="w-6 h-6"/>
                        </div>
                        <h3 className="font-bold text-lg uppercase mb-1">MarchéConnect</h3>
                        <p className="text-xs text-gray-500 mb-6">Reçu de Paiement Officiel</p>
                        
                        <div className="border-t-2 border-dashed border-gray-300 py-4 space-y-2">
                            <div className="flex justify-between"><span>Date:</span> <span>{new Date().toLocaleDateString()}</span></div>
                            <div className="flex justify-between"><span>Heure:</span> <span>{new Date().toLocaleTimeString()}</span></div>
                            <div className="flex justify-between"><span>Ref:</span> <span className="font-bold">{lastTransaction.ref}</span></div>
                            <div className="flex justify-between"><span>Étal:</span> <span className="font-bold">{lastTransaction.stall}</span></div>
                        </div>

                        <div className="border-t-2 border-dashed border-gray-300 py-4 my-2">
                             <div className="flex justify-between text-lg font-bold">
                                <span>MONTANT VERSÉ</span>
                                <span>{lastTransaction.amount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="text-left bg-gray-50 p-3 rounded text-xs space-y-1">
                             <div className="flex justify-between"><span>Dette Initiale:</span> <span>{(lastTransaction.remaining + lastTransaction.amount).toLocaleString()}</span></div>
                             <div className="flex justify-between font-bold text-gray-900"><span>Reste à Payer:</span> <span>{lastTransaction.remaining.toLocaleString()} FCFA</span></div>
                        </div>

                        <p className="mt-8 text-[10px] text-gray-400">Merci de votre contribution.<br/>Ce reçu est une preuve légale.</p>
                        
                        {/* Zigzag bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gray-100" style={{background: 'linear-gradient(45deg, transparent 33.333%, #ffffff 33.333%, #ffffff 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #ffffff 33.333%, #ffffff 66.667%, transparent 66.667%)', backgroundSize: '20px 40px'}}></div>
                    </div>
                    <div className="bg-gray-100 p-4">
                        <button onClick={closeReceipt} className="w-full py-3 bg-blue-600 text-white font-bold rounded shadow-lg">Fermer & Imprimer</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB 1: ACTION (SCANNER) --- */}
        {activeTab === 'action' && (
            <div className="p-4 space-y-4">
                {view === 'scan' && (
                <div className="space-y-6 animate-fade-in">
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
                                <p className="text-xs text-gray-400 mt-2">(Simulation)</p>
                            </>
                        )}
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Recherche Manuelle</p>
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
                </div>
                )}

                {view === 'result' && scannedStall && stallFinancials && (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in pb-4">
                    {/* Stall Header */}
                    <div className={`p-6 border-b border-gray-100 ${
                        scannedStall.healthStatus === 'critical' ? 'bg-red-50' : 
                        scannedStall.healthStatus === 'warning' ? 'bg-yellow-50' : 'bg-green-50'
                    }`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900">{scannedStall.number}</h3>
                                <p className="text-gray-600 font-medium">{scannedStall.zone}</p>
                            </div>
                            <div className={`px-3 py-1 rounded text-xs font-bold border capitalize flex items-center gap-1 ${
                                scannedStall.healthStatus === 'critical' ? 'bg-red-100 text-red-700 border-red-200' : 
                                scannedStall.healthStatus === 'warning' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'
                            }`}>
                                {scannedStall.healthStatus === 'critical' ? <AlertTriangle className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                                {scannedStall.healthStatus === 'critical' ? 'Critique' : scannedStall.healthStatus === 'warning' ? 'Attention' : 'Sain'}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                                {scannedStall.occupantName?.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-400 uppercase">Occupant</p>
                                <p className="font-bold text-gray-800">{scannedStall.occupantName || 'Inconnu'}</p>
                            </div>
                        </div>

                        {/* FINANCIAL DETAIL */}
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-xs font-bold uppercase">Dette Totale</span>
                                <span className={`text-xl font-extrabold ${stallFinancials.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {stallFinancials.totalDebt.toLocaleString()} FCFA
                                </span>
                            </div>
                            {stallFinancials.totalDebt > 0 && (
                                <div className="space-y-1 text-sm text-red-500">
                                    <div className="flex justify-between"><span>• Loyers ({stallFinancials.monthsUnpaid} mois)</span><span>{stallFinancials.rentDebt.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>• Amendes</span><span>{stallFinancials.fineAmount.toLocaleString()}</span></div>
                                </div>
                            )}
                        </div>

                        {/* AI ASSISTANT */}
                        {stallFinancials.totalDebt > 0 && (
                            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                {!aiScript ? (
                                    <button onClick={handleAskAi} disabled={loadingAi} className="w-full flex items-center justify-center gap-2 text-purple-700 text-xs font-bold py-2 hover:bg-purple-100 rounded transition-colors">
                                        {loadingAi ? <div className="animate-spin w-3 h-3 border-2 border-purple-600 rounded-full border-t-transparent"></div> : <Bot className="w-4 h-4" />}
                                        Script de Négociation (IA)
                                    </button>
                                ) : (
                                    <div className="relative">
                                        <div className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1"><Bot className="w-3 h-3"/> Conseil IA :</div>
                                        <p className="text-sm text-purple-900 italic">"{aiScript}"</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ACTION AREA */}
                        <div className="pt-2">
                            {mode === 'collect' ? (
                                <div className="space-y-3">
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                        <label className="text-xs text-blue-800 font-bold block mb-1">Montant à Encaisser (Partiel possible)</label>
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
                                    <button 
                                        onClick={processPayment}
                                        disabled={isProcessing || partialAmount <= 0}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                    >
                                        {isProcessing ? 'Traitement Sécurisé...' : (
                                        <>
                                            <Printer className="w-6 h-6" />
                                            Encaisser & Imprimer
                                        </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <select 
                                        value={sanctionReason}
                                        onChange={(e) => setSanctionReason(e.target.value)}
                                        className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                    >
                                        <option value="">Sélectionner l'infraction...</option>
                                        <option value="Hygiène: Déchets non évacués">Hygiène: Déchets non évacués</option>
                                        <option value="Occupation: Débordement allée">Occupation: Débordement allée</option>
                                        <option value="Admin: Défaut de badge">Admin: Défaut de badge</option>
                                    </select>
                                    
                                    <button 
                                        onClick={handleTakePhoto}
                                        className={`w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 font-medium transition-colors ${evidencePhoto ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                                    >
                                        {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-gray-500 rounded-full border-t-transparent"></div> : <Camera className="w-5 h-5" />}
                                        {evidencePhoto ? "Preuve Capturée (OK)" : "Prendre Photo Preuve (Obligatoire)"}
                                    </button>

                                    <button 
                                        onClick={processSanction}
                                        disabled={!sanctionReason || !evidencePhoto || isProcessing}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95"
                                    >
                                        <AlertTriangle className="w-6 h-6" />
                                        Valider Sanction
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => { setView('scan'); setScannedStall(null); }}
                            className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 text-sm"
                        >
                            Annuler / Retour
                        </button>
                    </div>
                </div>
                )}
            </div>
        )}

        {/* --- TAB 2: HISTORY (PROFESSIONAL AUDIT VIEW) --- */}
        {activeTab === 'history' && (
            <div className="flex flex-col h-full bg-gray-50">
                
                {/* 1. Statistics Summary */}
                <div className="bg-white p-4 border-b border-gray-200 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                        <p className="text-xs text-green-600 uppercase font-bold mb-1">Total Encaissé</p>
                        <p className="text-xl font-extrabold text-green-800">{historyStats.totalCollected.toLocaleString()} FCFA</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 uppercase font-bold mb-1">Actes</p>
                        <p className="text-xl font-extrabold text-blue-800">{historyStats.countTotal}</p>
                    </div>
                </div>

                {/* 2. Advanced Filters */}
                <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 shadow-sm z-10">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Recherche (ID, Hash, Détail)..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <select 
                            value={historyDateFilter} 
                            onChange={(e) => setHistoryDateFilter(e.target.value as any)}
                            className="text-xs font-bold bg-gray-100 text-gray-700 px-3 py-2 rounded-lg border-none outline-none focus:ring-1 focus:ring-slate-400"
                        >
                            <option value="today">Aujourd'hui</option>
                            <option value="week">7 derniers jours</option>
                            <option value="all">Tout l'historique</option>
                        </select>

                        <div className="h-8 w-px bg-gray-300 mx-1"></div>

                        {(['all', 'payment', 'sanction', 'system'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setHistoryFilterType(type)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${
                                    historyFilterType === type 
                                    ? 'bg-slate-800 text-white' 
                                    : 'bg-white border border-gray-200 text-gray-500'
                                }`}
                            >
                                {type === 'all' ? 'Tout' : type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. The Log List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <Filter className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                            <p>Aucune donnée trouvée.</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div 
                                key={log.id} 
                                onClick={() => setSelectedLog(log)}
                                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm active:bg-gray-50 cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${
                                        log.actionType === 'payment_collected' ? 'bg-green-100 text-green-700' :
                                        log.actionType === 'sanction_issued' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {log.actionType === 'payment_collected' ? <Banknote className="w-4 h-4"/> :
                                         log.actionType === 'sanction_issued' ? <AlertTriangle className="w-4 h-4"/> :
                                         <ShieldCheck className="w-4 h-4"/>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 truncate max-w-[150px]">{log.details}</p>
                                        <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • 
                                            <Lock className="w-3 h-3"/> {log.hash.substring(0, 8)}...
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {log.amount && (
                                        <p className="text-sm font-extrabold text-gray-900">{log.amount.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">FCFA</span></p>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-1" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                 {/* 4. Detail Modal (The Proof) */}
                {selectedLog && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Preuve Numérique</h3>
                                <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-white/20 rounded"><X className="w-5 h-5"/></button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="text-center pb-4 border-b border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Montant Transaction</p>
                                    <p className="text-3xl font-black text-slate-800">{selectedLog.amount ? selectedLog.amount.toLocaleString() + ' FCFA' : 'N/A'}</p>
                                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                                        selectedLog.actionType === 'payment_collected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {selectedLog.actionType === 'payment_collected' ? 'ENCAISSEMENT SUCCÈS' : selectedLog.actionType.toUpperCase().replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Date</span>
                                        <span className="font-medium">{new Date(selectedLog.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Détail</span>
                                        <span className="font-medium text-right max-w-[150px]">{selectedLog.details}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Géolocalisation</span>
                                        <span className="font-medium flex items-center gap-1 text-blue-600 underline"><MapPin className="w-3 h-3"/> {selectedLog.location}</span>
                                    </div>
                                     {selectedLog.evidenceUrl && (
                                        <div className="mt-2 p-2 bg-gray-100 rounded">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Camera className="w-3 h-3"/> Preuve Visuelle</p>
                                            <div className="bg-gray-300 w-full h-24 rounded flex items-center justify-center text-gray-500 text-xs">
                                                [Image Stockée Sécurisée]
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Lock className="w-3 h-3"/> Empreinte Cryptographique (Hash)</p>
                                    <p className="text-[10px] font-mono break-all text-gray-600 bg-white p-2 rounded border border-gray-200">
                                        {selectedLog.hash}
                                    </p>
                                </div>

                                <button onClick={() => setSelectedLog(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800">
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB 3: PROFIL / CAISSE --- */}
        {activeTab === 'profile' && (
            <div className="p-4 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-gray-500 border-4 border-white shadow-sm">
                        JN
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Jean Ntoutoume</h3>
                    <p className="text-gray-500 text-sm">ID: AGT-2025-001</p>
                    <div className="mt-4 flex justify-center gap-2">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">En Service</span>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Zone MB-A</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Ma Caisse (Temps Réel)
                    </h3>
                    <div className="text-center py-4">
                        <p className="text-4xl font-extrabold text-blue-600">{cashInHand.toLocaleString()} <span className="text-lg text-gray-400">FCFA</span></p>
                        <p className="text-xs text-gray-400 mt-2">Montant à reverser</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button onClick={() => onShiftAction('deposit')} className="py-3 border border-gray-300 rounded-xl text-gray-700 font-bold text-sm hover:bg-gray-50">
                            Versement Intermédiaire
                        </button>
                         <button className="py-3 border border-gray-300 rounded-xl text-gray-700 font-bold text-sm hover:bg-gray-50">
                            Historique
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={() => onShiftAction('end')}
                    className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                    <LogOut className="w-5 h-5" />
                    Fin de Service & Clôture
                </button>
            </div>
        )}

      </div>

      {/* BOTTOM NAVIGATION */}
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
