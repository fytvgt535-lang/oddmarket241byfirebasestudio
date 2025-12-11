
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
    <div className="space-y-6">
        {mode === 'collect' && (
            <Card className="animate-fade-in shadow-xl border-t-4 border-blue-600">
                <div className="p-6 border-b border-gray-100 bg-blue-50">
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
                    <Button variant="ghost" onClick={onCancel} className="w-full text-gray-400 hover:text-gray-600">Annuler</Button>
                </div>
            </Card>
        )}

        {mode === 'sanction' && (
            <div className="space-y-4">
                {/* Only renders the form fields, Parent handles submission button for photo validation */}
                <Select label="Motif de l'infraction" value={infractionId} onChange={e => setInfractionId(e.target.value)}>
                    <option value="">Sélectionner dans le Code...</option>
                    {PREDEFINED_INFRACTIONS.map(i => (
                        <option key={i.id} value={i.id}>{i.label} - {formatCurrency(i.amount)}</option>
                    ))}
                </Select>
                
                {/* The Parent Component (AgentFieldTool) injects the Photo Upload UI here visually */}
                
                <Button variant="danger" onClick={() => onSanction(infractionId)} disabled={!infractionId} isLoading={isProcessing} className="w-full py-4 text-lg">
                    Confirmer Sanction (Preuve Requise)
                </Button>
                <Button variant="ghost" onClick={onCancel} className="w-full text-gray-400 hover:text-gray-600">Annuler</Button>
            </div>
        )}
    </div>
  );
};

export default AgentAction;
