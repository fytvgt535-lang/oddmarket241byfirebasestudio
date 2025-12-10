
import React, { useState, useMemo } from 'react';
import { Stall, Sanction, PREDEFINED_INFRACTIONS, Mission } from '../../types';
import { calculateStallDebt, formatCurrency } from '../../utils/coreUtils';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card } from '../ui/Card';
import { Target } from 'lucide-react';

interface AgentActionProps {
  stall: Stall;
  mode: 'collect' | 'sanction';
  sanctions: Sanction[];
  activeMission?: Mission | null; // Added mission context
  onCancel: () => void;
  onPayment: (amount: number) => void;
  onSanction: (infractionId: string) => void;
  isProcessing: boolean;
}

const AgentAction: React.FC<AgentActionProps> = ({ stall, mode, sanctions, activeMission, onCancel, onPayment, onSanction, isProcessing }) => {
  const [amount, setAmount] = useState<number>(stall.price);
  const [infractionId, setInfractionId] = useState('');

  const financials = useMemo(() => calculateStallDebt(stall, sanctions), [stall, sanctions]);

  return (
    <Card className="animate-fade-in shadow-xl border-t-4 border-t-current" style={{ color: mode === 'collect' ? '#2563EB' : '#DC2626' }}>
        {activeMission && (
            <div className="bg-yellow-50 p-2 text-center border-b border-yellow-200">
                <span className="text-xs font-bold text-yellow-800 flex items-center justify-center gap-2">
                    <Target className="w-3 h-3"/> MISSION EN COURS : {activeMission.title}
                </span>
            </div>
        )}
        
        <div className={`p-6 border-b border-gray-100 ${mode === 'collect' ? 'bg-blue-50' : 'bg-red-50'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-3xl font-black text-gray-900">{stall.number}</h3>
                    <p className="text-sm font-bold opacity-70 text-gray-600">{stall.occupantName || 'Inconnu'}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold uppercase text-gray-400">Dette Totale</p>
                    <p className="text-xl font-black text-gray-900">{formatCurrency(financials.totalDebt)}</p>
                </div>
            </div>
        </div>

        <div className="p-6 space-y-6">
            {mode === 'collect' ? (
                <>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between mb-2 text-sm">
                            <span className="text-gray-500">Loyer Mensuel</span>
                            <span className="font-bold">{formatCurrency(stall.price)}</span>
                        </div>
                        {financials.monthsUnpaid > 0 && (
                            <div className="flex justify-between mb-2 text-sm text-red-600 font-bold">
                                <span>Retard</span>
                                <span>{financials.monthsUnpaid} mois</span>
                            </div>
                        )}
                    </div>
                    <Input 
                        label="Montant Reçu (FCFA)" 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(Number(e.target.value))} 
                        className="text-2xl font-black text-center h-16 bg-blue-50 border-blue-200 text-blue-900"
                    />
                    <Button onClick={() => onPayment(amount)} isLoading={isProcessing} className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-700">
                        Valider Encaissement
                    </Button>
                </>
            ) : (
                <div className="space-y-4">
                    <Select label="Motif de l'infraction" value={infractionId} onChange={e => setInfractionId(e.target.value)}>
                        <option value="">Sélectionner dans le Code...</option>
                        {PREDEFINED_INFRACTIONS.map(i => (
                            <option key={i.id} value={i.id}>{i.label} - {formatCurrency(i.amount)}</option>
                        ))}
                    </Select>
                    <div className="p-4 bg-red-50 rounded-xl text-red-800 text-sm italic">
                        ⚠️ Une preuve photo sera demandée à l'étape suivante (Simulation).
                    </div>
                    <Button variant="danger" onClick={() => onSanction(infractionId)} disabled={!infractionId} isLoading={isProcessing} className="w-full py-4 text-lg">
                        Émettre Sanction
                    </Button>
                </div>
            )}
            
            <Button variant="ghost" onClick={onCancel} className="w-full text-gray-400 hover:text-gray-600">
                Annuler
            </Button>
        </div>
    </Card>
  );
};

export default AgentAction;
