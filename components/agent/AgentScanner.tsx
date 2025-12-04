
import React, { useState } from 'react';
import { Scan, RefreshCw, Search } from 'lucide-react';
import { Stall } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';

interface AgentScannerProps {
  stalls: Stall[];
  mode: 'collect' | 'sanction';
  onScanComplete: (stall: Stall) => void;
}

const AgentScanner: React.FC<AgentScannerProps> = ({ stalls, mode, onScanComplete }) => {
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLookup = () => {
    if (mode === 'sanction') { 
        toast.error("ALERTE : Scan QR obligatoire pour émettre une sanction (Preuve de présence)."); 
        return; 
    }
    const stall = stalls.find(s => s.number.toLowerCase() === manualInput.toLowerCase());
    if (stall) {
        onScanComplete(stall);
    } else {
        toast.error("Étal non trouvé.");
    }
  };

  const handleSimulateScan = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const occupiedStalls = stalls.filter(s => s.status === 'occupied');
      // Simulate finding a random occupied stall or fall back to first stall
      const target = occupiedStalls.length > 0 ? occupiedStalls[Math.floor(Math.random() * occupiedStalls.length)] : stalls[0];
      
      if (target) { 
          toast.success("Étal détecté : " + target.number);
          onScanComplete(target);
      } else {
          toast.error("Aucun étal actif trouvé dans la base.");
      }
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div 
            onClick={handleSimulateScan} 
            className={`bg-white rounded-3xl aspect-square flex flex-col items-center justify-center border-4 border-dashed cursor-pointer transition-all active:scale-95 ${mode === 'collect' ? 'border-blue-200 hover:border-blue-500 hover:bg-blue-50' : 'border-red-200 hover:border-red-500 hover:bg-red-50'}`}
        >
            {isProcessing ? (
                <RefreshCw className={`w-24 h-24 animate-spin ${mode === 'collect' ? 'text-blue-400' : 'text-red-400'}`}/>
            ) : (
                <Scan className={`w-24 h-24 ${mode === 'collect' ? 'text-blue-500' : 'text-red-500'}`}/>
            )}
            <p className="font-black text-xl text-gray-400 mt-6 uppercase tracking-widest">
                {isProcessing ? "Analyse..." : "Toucher pour Scanner"}
            </p>
        </div>

        {mode === 'collect' && (
            <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                <Input 
                    placeholder="Saisie manuelle (ex: A-12)" 
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
