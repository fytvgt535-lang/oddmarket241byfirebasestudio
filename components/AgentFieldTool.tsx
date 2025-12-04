
import React, { useState } from 'react';
import { UserCheck, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import { Stall, Sanction, AgentLog } from '../types';
import { Button } from './ui/Button';
import AgentScanner from './agent/AgentScanner';
import AgentAction from './agent/AgentAction';
import AgentHistory from './agent/AgentHistory';
import { Card } from './ui/Card';

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
  const [view, setView] = useState<'scan' | 'action' | 'success'>('scan');
  const [mode, setMode] = useState<'collect' | 'sanction'>('collect');
  const [scannedStall, setScannedStall] = useState<Stall | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState({ title: '', amount: 0 });

  const handleScanComplete = (stall: Stall) => {
      setScannedStall(stall);
      setView('action');
  };

  const handlePayment = (amount: number) => {
      if (!scannedStall) return;
      setIsProcessing(true);
      setTimeout(() => {
          onCollectPayment(scannedStall.id, amount, "0.0,0.0");
          setLastAction({ title: 'Paiement Reçu', amount });
          setView('success');
          setIsProcessing(false);
      }, 1000);
  };

  const handleSanction = (infractionId: string) => {
      if (!scannedStall) return;
      setIsProcessing(true);
      setTimeout(() => {
          onIssueSanction(scannedStall.id, 'fine', `Infraction ${infractionId}`, 5000); // Amount simulated based on ID
          setLastAction({ title: 'Sanction Émise', amount: 5000 });
          setView('success');
          setIsProcessing(false);
      }, 1000);
  };

  const resetFlow = () => {
      setScannedStall(null);
      setView('scan');
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
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20 flex flex-col">
      {/* Header */}
      <div className={`p-6 sticky top-0 z-20 flex justify-between items-center text-white shadow-lg transition-colors ${mode === 'collect' ? 'bg-blue-900' : 'bg-red-900'}`}>
        <div>
            <h2 className="font-black text-lg flex gap-2 items-center"><UserCheck className="w-5 h-5"/> TERMINAL AGENT</h2>
            <p className="text-xs opacity-70 font-mono">CAISSE: {cashInHand.toLocaleString()} F</p>
        </div>
        {view === 'scan' && (
            <div className="flex bg-black/30 rounded-lg p-1 backdrop-blur-sm">
                <button onClick={() => setMode('collect')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${mode === 'collect' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'text-white/70 font-medium'}`}>Collecte</button>
                <button onClick={() => setMode('sanction')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${mode === 'sanction' ? 'bg-white text-red-900 font-bold shadow-sm' : 'text-white/70 font-medium'}`}>Sanction</button>
            </div>
        )}
      </div>

      <div className="flex-1 p-4">
        {view === 'scan' && (
            <>
                <AgentScanner stalls={stalls} mode={mode} onScanComplete={handleScanComplete} />
                <div className="mt-8">
                    <AgentHistory logs={agentLogs} />
                </div>
            </>
        )}

        {view === 'action' && scannedStall && (
            <AgentAction 
                stall={scannedStall} 
                mode={mode} 
                sanctions={sanctions} 
                onCancel={resetFlow} 
                onPayment={handlePayment} 
                onSanction={handleSanction}
                isProcessing={isProcessing}
            />
        )}

        {view === 'success' && (
            <Card className="p-8 text-center animate-fade-in bg-white border-2 border-green-500 shadow-2xl mt-10">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
                    <CheckCircle className="w-10 h-10"/>
                </div>
                <h3 className="font-black text-2xl text-gray-900 mb-2">{lastAction.title}</h3>
                <p className="text-3xl font-black text-green-600 mb-8">{lastAction.amount.toLocaleString()} F</p>
                <Button onClick={resetFlow} className="w-full py-4 bg-gray-900 text-white hover:bg-black">
                    Nouvelle Action
                </Button>
            </Card>
        )}
      </div>

      {/* Footer Actions */}
      {view === 'scan' && (
          <div className="p-4 sticky bottom-0 bg-white border-t border-gray-200">
              <Button variant="outline" onClick={() => onShiftAction('end')} className="w-full text-red-600 border-red-100 hover:bg-red-50">
                  <LogOut className="w-4 h-4"/> Fin de Service
              </Button>
          </div>
      )}
    </div>
  );
};

export default AgentFieldTool;
