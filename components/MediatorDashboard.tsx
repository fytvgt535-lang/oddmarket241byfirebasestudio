
import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle, XCircle, AlertTriangle, FileText, User, ShieldCheck, History, TrendingDown, Star, Landmark, Brain, Loader2, MessageSquareWarning, ShieldAlert } from 'lucide-react';
import { Sanction, Stall } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { formatCurrency } from '../utils/coreUtils';
import { Badge } from './ui/Badge';
import { analyzeAppealCredibility } from '../services/geminiService';
import toast from 'react-hot-toast';

interface MediatorDashboardProps {
  sanctions: Sanction[];
  stalls: Stall[];
  onResolveAppeal: (sanctionId: string, decision: 'accepted' | 'rejected') => Promise<void>;
}

const MediatorDashboard: React.FC<MediatorDashboardProps> = ({ sanctions, stalls, onResolveAppeal }) => {
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);
  const [iaInsight, setIaInsight] = useState<{ score: number; flag: boolean; advice: string } | null>(null);

  const getAgentIntegrity = (agentId: string) => {
      const totalByAgent = sanctions.filter(s => s.issuedBy === agentId).length;
      const cancelledByAgent = sanctions.filter(s => s.issuedBy === agentId && s.status === 'accepted').length;
      const ratio = totalByAgent > 0 ? (1 - (cancelledByAgent / totalByAgent)) * 100 : 100;
      return { score: Math.round(ratio), total: totalByAgent };
  };

  const runIAAnalysis = async (sanction: Sanction) => {
      setIsAnalyzingIA(true);
      try {
          const result = await analyzeAppealCredibility(sanction.appealReason || "", sanctions.filter(s => s.stallId === sanction.stallId));
          setIaInsight(result);
      } catch (e) {
          toast.error("Analyse IA indisponible.");
      } finally {
          setIsAnalyzingIA(false);
      }
  };

  useEffect(() => {
      if (selectedSanction && selectedSanction.status === 'pending_appeal') {
          runIAAnalysis(selectedSanction);
      } else {
          setIaInsight(null);
      }
  }, [selectedSanction?.id]);

  const appeals = sanctions.filter(s => s.status === 'pending_appeal');

  const handleDecision = async (decision: 'accepted' | 'rejected') => {
      if (!selectedSanction) return;
      setIsProcessing(true);
      try {
          await onResolveAppeal(selectedSanction.id, decision);
          toast.success(decision === 'accepted' ? "Sanction annulée (Clémence)" : "Maintien de la sanction");
          setSelectedSanction(null);
      } catch (e) { toast.error("Erreur serveur"); } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-xl rotate-3"><Scale className="w-8 h-8"/></div>
          <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Arbitrage Live</h2>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Commission de Médiation Municipale</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase px-2 mb-4">Appels en attente ({appeals.length})</h3>
              {appeals.length === 0 ? (
                  <div className="p-8 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center text-slate-300 font-bold italic">Aucun litige.</div>
              ) : appeals.map(appeal => (
                  <div key={appeal.id} onClick={() => setSelectedSanction(appeal)} className={`p-6 rounded-[2rem] border-4 cursor-pointer transition-all ${selectedSanction?.id === appeal.id ? 'border-purple-600 bg-white shadow-xl scale-[1.02]' : 'border-transparent bg-white shadow-sm hover:border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-black text-slate-900">Dossier #{appeal.id.slice(-4)}</span>
                         <Badge variant="warning">Recours</Badge>
                      </div>
                      <p className="text-2xl font-black text-red-600">{formatCurrency(appeal.amount)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 truncate">{appeal.reason}</p>
                  </div>
              ))}
          </div>

          <div className="lg:col-span-2">
              {selectedSanction ? (
                  <Card className="h-full space-y-6 rounded-[3rem] p-8 border-none shadow-2xl relative overflow-hidden">
                      {/* IA INSIGHT PANEL */}
                      {iaInsight && (
                          <div className={`p-5 rounded-3xl mb-4 flex items-start gap-4 border-2 animate-fade-in ${iaInsight.flag ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                              <div className={`p-3 rounded-2xl ${iaInsight.flag ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {iaInsight.flag ? <ShieldAlert className="w-6 h-6 animate-pulse"/> : <Brain className="w-6 h-6"/>}
                              </div>
                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <p className={`font-black uppercase text-[10px] tracking-widest ${iaInsight.flag ? 'text-red-700' : 'text-blue-700'}`}>Analyse IA : {iaInsight.flag ? 'ALERTE ABUS' : 'PROFIL CRÉDIBLE'}</p>
                                      <span className="text-[10px] font-black opacity-50">{iaInsight.score}% confiance</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-700 leading-tight">"{iaInsight.advice}"</p>
                              </div>
                          </div>
                      )}

                      <div className="p-6 bg-slate-900 text-white rounded-[2rem] flex justify-between items-center overflow-hidden relative border-b-8 border-purple-600/30">
                          <History className="absolute -right-4 -top-4 w-24 h-24 opacity-10"/>
                          <div>
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Audit Agent Émetteur</p>
                              <h4 className="font-black text-xl">Brigade ID: {selectedSanction.issuedBy.slice(0, 8)}</h4>
                          </div>
                          <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fiabilité Agent</p>
                              <div className="flex items-center gap-2 justify-end">
                                  <span className={`text-3xl font-black ${getAgentIntegrity(selectedSanction.issuedBy).score < 70 ? 'text-red-400' : 'text-green-400'}`}>{getAgentIntegrity(selectedSanction.issuedBy).score}%</span>
                                  <Star className={`w-5 h-5 ${getAgentIntegrity(selectedSanction.issuedBy).score < 70 ? 'text-red-400' : 'text-green-400 fill-current'}`}/>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-100">
                              <h5 className="font-black text-red-800 uppercase text-[10px] tracking-widest mb-4">Constat Agent</h5>
                              <p className="font-bold text-slate-700 leading-relaxed">"{selectedSanction.reason}"</p>
                          </div>
                          <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100">
                              <h5 className="font-black text-blue-800 uppercase text-[10px] tracking-widest mb-4">Défense Marchand</h5>
                              <p className="font-bold text-slate-700 italic leading-relaxed">"{selectedSanction.appealReason || "Aucun argument écrit."}"</p>
                          </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-6">
                          <Button variant="danger" className="flex-1 py-8 rounded-[2rem] font-black uppercase text-xs" onClick={() => handleDecision('rejected')}>MAINTENIR L'AMENDE</Button>
                          <Button className="flex-1 py-8 bg-green-600 rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-green-100" onClick={() => handleDecision('accepted')}>ACCORDER LA CLÉMENCE</Button>
                      </div>
                  </Card>
              ) : (
                  <div className="h-96 border-4 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center text-slate-300">
                      <Scale className="w-20 h-20 mb-6 opacity-20"/>
                      <p className="font-black uppercase text-xs tracking-[0.3em]">Arbitrage en attente</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default MediatorDashboard;
