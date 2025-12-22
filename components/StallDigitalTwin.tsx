
import React, { useState, useMemo, useEffect } from 'react';
import { X, FileText, Activity, DollarSign, Shield, Phone, User, MapPin, Loader2, Send, MessageSquare } from 'lucide-react';
import { Stall, Transaction, StallMessage, Sanction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { logViewAction } from '../services/supabaseService';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/coreUtils';
// Fix: Added missing Button and toast imports
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

interface StallDigitalTwinProps {
  stall: Stall;
  transactions: Transaction[];
  sanctions?: Sanction[];
  onClose: () => void;
}

const StallDigitalTwin: React.FC<StallDigitalTwinProps> = ({ stall, transactions, sanctions = [], onClose }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'docs' | 'finance' | 'history' | 'comms'>('identity');
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
      const { data: { user } } = (async () => await supabase.auth.getUser())() as any;
      if (user) logViewAction(user.id, `Digital Twin: ${stall.number}`, stall.id);
  }, [stall.id]);

  // RECTIFICATION : Calcul dynamique du score de conformité (Base 100, -10 par sanction active)
  const dynamicComplianceScore = useMemo(() => {
      const activeSanctions = sanctions.filter(s => s.stallId === stall.id && s.status === 'active').length;
      return Math.max(0, 100 - (activeSanctions * 10));
  }, [sanctions, stall.id]);

  const chartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun'];
    months.forEach(m => dataMap[m] = 0);

    transactions.filter(t => t.stallId === stall.id).forEach(tx => {
      const month = new Date(tx.date).toLocaleString('fr-FR', { month: 'short' });
      if (dataMap[month] !== undefined) dataMap[month] += tx.amount;
    });

    return months.map(m => ({ month: m, revenue: dataMap[m] }));
  }, [transactions, stall.id]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black">{stall.number}</div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">{stall.occupantName || 'Emplacement Libre'}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Digital Twin v2.1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X/></button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[
            { id: 'identity', label: 'ID', icon: User },
            { id: 'finance', label: 'Flux', icon: DollarSign },
            { id: 'history', label: 'Logs', icon: Activity },
            { id: 'comms', label: 'Contact', icon: MessageSquare }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-slate-900 text-slate-900 bg-white' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                <tab.icon className="w-4 h-4"/> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'identity' && (
            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
               <InfoTile label="Statut" value={stall.status} icon={Shield} color={stall.status === 'occupied' ? 'text-green-600' : 'text-blue-600'}/>
               <InfoTile label="Score Conformité" value={`${dynamicComplianceScore}%`} icon={Shield} color={dynamicComplianceScore > 70 ? 'text-green-600' : 'text-red-600'}/>
               <InfoTile label="Zone" value={stall.zone} icon={MapPin}/>
               <InfoTile label="Redevance" value={formatCurrency(stall.price)} icon={DollarSign}/>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="animate-fade-in space-y-6">
                <div className="h-64 bg-slate-50 rounded-3xl p-4 border border-slate-100 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                            <YAxis hide />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="revenue" fill="#0f172a" radius={[10, 10, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase mb-3">Audit des versements</h4>
                    {transactions.filter(t => t.stallId === stall.id).slice(0, 5).map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <span className="text-sm font-bold text-gray-800">{new Date(t.date).toLocaleDateString()}</span>
                            <span className="font-black text-green-600">{formatCurrency(t.amount)}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}
          
          {activeTab === 'comms' && (
              <div className="flex flex-col h-full space-y-4">
                  <div className="flex-1 bg-gray-50 rounded-3xl p-4 border border-gray-100 overflow-y-auto italic text-gray-400 text-center flex items-center justify-center">
                      Aucun message archivé pour cet étal.
                  </div>
                  <div className="flex gap-2">
                      <input className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900" placeholder="Avis administratif..." value={newMessage} onChange={e => setNewMessage(e.target.value)}/>
                      <Button className="bg-slate-900" onClick={() => { toast.success("Message envoyé au terminal commerçant"); setNewMessage(""); }}><Send className="w-5 h-5"/></Button>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoTile = ({ label, value, icon: Icon, color = "text-slate-900" }: any) => (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-2xl bg-slate-50 ${color}`}><Icon className="w-5 h-5"/></div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`font-black text-lg ${color}`}>{value}</p>
        </div>
    </div>
);

export default StallDigitalTwin;
