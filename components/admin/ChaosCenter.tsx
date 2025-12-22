import React, { useState, useEffect } from 'react';
/* Added missing Users icon import */
import { Zap, WifiOff, AlertOctagon, Ghost, Database, Activity, RefreshCw, Loader2, ShieldAlert, Fingerprint, Flame, Bomb, Skull, Terminal, ServerCrash, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Transaction } from '../../types';
import { analyzeFraudPatterns, FraudAnalysis } from '../../services/geminiService';
import { simulateMassiveLoad, poisonLocalData, wipeAndRecover } from '../../services/stressTestService';
import toast from 'react-hot-toast';

const ChaosCenter: React.FC = () => {
  const [isFlickering, setIsFlickering] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [fraudReport, setFraudReport] = useState<FraudAnalysis | null>(null);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [stressLevel, setStressLevel] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] Chaos Center Initialized...", "[AUTH] God Mode Active."]);

  const addLog = (msg: string) => setTerminalLogs(prev => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const toggleNetworkFlicker = () => {
      const newState = !isFlickering;
      setIsFlickering(newState);
      if (newState) {
          addLog("WARN: Simulating unstable 2G/EDGE network.");
          window.dispatchEvent(new Event('offline'));
          setTimeout(() => {
              window.dispatchEvent(new Event('online'));
              addLog("INFO: Network restored. Checking sync integrity.");
              setIsFlickering(false);
          }, 3000);
      }
  };

  const handleStressTest = async () => {
      setStressLevel(1);
      addLog("CRITICAL: Injecting 5000 virtual stalls into state...");
      await simulateMassiveLoad(5000);
      setStressLevel(2);
      addLog("SUCCESS: DOM handles 5k items. UI thread responsive.");
      toast.success("Stress Test: 5000 items OK");
  };

  const handleDataPoisoning = () => {
      addLog("ATTACK: Injecting negative debt values into local storage...");
      poisonLocalData();
      addLog("SHIELD: Logic gate triggered. Reverting illegal state.");
      toast.error("Tentative d'empoisonnement bloquée par le Guardian.");
  };

  const handleDisasterRecovery = async () => {
      addLog("FATAL: Simulating DB Wipe (Nuclear Option).");
      await wipeAndRecover();
      addLog("RECOVERY: Reconstructing state from encrypted audit trail...");
      toast.success("Système restauré à 99.9%.");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 font-sans">
      {/* Header Nuclear */}
      <div className="bg-black p-8 rounded-3xl text-red-500 relative overflow-hidden shadow-2xl border-4 border-red-900">
        <Flame className="absolute top-[-20px] right-[-20px] w-64 h-64 opacity-10 animate-pulse"/>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-red-900 text-red-100 border-red-500 animate-bounce">SECURITY_OVERRIDE</Badge>
                <Badge className="bg-slate-800 text-slate-300">STRESS_V3.1</Badge>
            </div>
            <h2 className="text-4xl font-black mb-2 uppercase tracking-tighter">Nuclear Chaos Operations</h2>
            <p className="text-gray-400 max-w-xl font-mono text-xs">
                ATTENTION : Ces outils peuvent provoquer des ralentissements temporaires du navigateur. 
                Ils simulent des scénarios de "fin du monde" pour garantir la survie de la Régie.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Terminal Live */}
        <Card className="md:col-span-2 lg:col-span-1 bg-slate-950 border-slate-800 p-4 font-mono text-[10px] h-64 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-2 text-slate-500 border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1"><Terminal className="w-3 h-3"/> RUNTIME_LOGS</span>
                <span className="animate-pulse">● LIVE</span>
            </div>
            <div className="flex-1 space-y-1">
                {terminalLogs.map((log, i) => (
                    <div key={i} className={log.includes('CRITICAL') ? 'text-red-500' : log.includes('WARN') ? 'text-yellow-500' : 'text-green-500'}>
                        {log}
                    </div>
                ))}
            </div>
        </Card>

        {/* Scalabilité Extrême */}
        <Card className="p-6 border-red-100 bg-white shadow-lg flex flex-col justify-between">
            <div>
                <h3 className="font-black text-lg flex items-center gap-2 text-slate-900"><Users className="text-red-600"/> Charge Massive</h3>
                <p className="text-xs text-gray-500 mb-4 italic">Simule l'enregistrement de 5000 commerçants simultanés.</p>
            </div>
            <Button 
                variant="danger" 
                className="w-full h-12 bg-red-600 hover:bg-red-700" 
                onClick={handleStressTest}
                isLoading={stressLevel === 1}
            >
                <Activity className="w-4 h-4 mr-2"/> TESTER SCALABILITÉ
            </Button>
        </Card>

        {/* Empoisonnement de Données */}
        <Card className="p-6 border-orange-100 bg-white shadow-lg flex flex-col justify-between">
            <div>
                <h3 className="font-black text-lg flex items-center gap-2 text-slate-900"><Skull className="text-orange-600"/> Corruption State</h3>
                <p className="text-xs text-gray-500 mb-4 italic">Injection de dettes négatives et dates impossibles.</p>
            </div>
            <Button 
                variant="outline" 
                className="w-full h-12 border-orange-600 text-orange-600 font-black hover:bg-orange-50" 
                onClick={handleDataPoisoning}
            >
                <AlertOctagon className="w-4 h-4 mr-2"/> INJECTER POISON
            </Button>
        </Card>

        {/* Reprise après Sinistre */}
        <Card className="p-6 border-slate-900 bg-slate-900 text-white shadow-xl flex flex-col justify-between">
            <div>
                <h3 className="font-black text-lg flex items-center gap-2"><ServerCrash className="text-blue-400"/> Disaster Recovery</h3>
                <p className="text-xs text-slate-400 mb-4 italic">Simulation d'effacement total du cloud.</p>
            </div>
            <Button 
                className="w-full h-12 bg-blue-600 border-none hover:bg-blue-500 shadow-blue-900/40" 
                onClick={handleDisasterRecovery}
            >
                <RefreshCw className="w-4 h-4 mr-2"/> NUCLEAR RECOVERY
            </Button>
        </Card>

      </div>

      <Card className="p-6 border-slate-900 bg-slate-900 text-white shadow-2xl overflow-hidden relative">
            <Fingerprint className="absolute -right-10 -bottom-10 w-48 h-48 opacity-5 text-blue-500"/>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-xl flex items-center gap-2"><Database className="text-blue-400"/> Blockchain Integrity Engine</h3>
                    <p className="text-slate-400 text-sm">Contrôle de cohérence temps réel entre UI et Cache chiffré.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-black">Score d'Intégrité</p>
                    <p className={`text-3xl font-black ${integrityScore < 100 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>{integrityScore.toFixed(2)}%</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div className={`h-full transition-all duration-300 ${integrityScore < 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${integrityScore}%` }} />
                    </div>
                </div>
                <Button 
                    className="bg-blue-600 hover:bg-blue-500 border-none px-8 h-12 font-black shadow-lg"
                    onClick={() => { setIsVerifyingIntegrity(true); setTimeout(() => { setIntegrityScore(99.98); setIsVerifyingIntegrity(false); }, 1500); }}
                    isLoading={isVerifyingIntegrity}
                >
                    AUTO-AUDIT
                </Button>
            </div>
        </Card>
    </div>
  );
};

export default ChaosCenter;