
import React, { useState } from 'react';
import { Shield, Radio, Wallet, CheckCircle, AlertTriangle, UserCheck, Plus, Target, X, Signal, Battery } from 'lucide-react';
import { Agent, Market, Mission, Stall } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select, TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/coreUtils';
import toast from 'react-hot-toast';
import { t } from '../../services/translations';

interface AgentManagerProps {
  agents: Agent[];
  markets: Market[];
  stalls: Stall[];
  missions?: Mission[];
  onAssignMission: (mission: Omit<Mission, 'id' | 'status' | 'createdAt'>) => void;
  onValidateCashDrop: (agentId: string, amount: number) => void;
  currentLanguage?: string;
}

const AgentManager: React.FC<AgentManagerProps> = ({ agents, markets, stalls, missions = [], onAssignMission, onValidateCashDrop, currentLanguage = 'fr' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'missions' | 'cash'>('overview');
  
  // Mission Form
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [missionForm, setMissionForm] = useState({ agentId: '', type: 'collection', title: '', description: '', priority: 'medium', targetStallId: '' });

  // --- DERIVED STATS & LIVE STATUS ---
  const getAgentStatus = (lastActive: number) => {
      const diffMinutes = (Date.now() - lastActive) / 1000 / 60;
      if (diffMinutes < 5) return { label: 'En Ligne', color: 'text-green-500', bg: 'bg-green-500', status: 'online' };
      if (diffMinutes < 30) return { label: 'Absent', color: 'text-orange-500', bg: 'bg-orange-500', status: 'away' };
      return { label: 'Hors Ligne', color: 'text-gray-400', bg: 'bg-gray-400', status: 'offline' };
  };

  const totalCashInHand = agents.reduce((acc, a) => acc + a.cashInHand, 0);
  const activeAgentsCount = agents.filter(a => getAgentStatus(a.lastActive).status === 'online').length;
  
  const handleCreateMission = (e: React.FormEvent) => {
      e.preventDefault();
      const agent = agents.find(a => a.id === missionForm.agentId);
      if (!agent) return;

      // Auto-title if stall is selected
      let finalTitle = missionForm.title;
      let finalDesc = missionForm.description;
      
      if (missionForm.targetStallId) {
          const targetStall = stalls.find(s => s.id === missionForm.targetStallId);
          if (targetStall) {
              if (!finalTitle) finalTitle = `${missionForm.type === 'collection' ? 'Recouvrement' : 'Inspection'} : Étal ${targetStall.number}`;
              if (!finalDesc) finalDesc = `Intervention requise sur la zone ${targetStall.zone}. Occupant: ${targetStall.occupantName || 'Inconnu'}.`;
          }
      }

      onAssignMission({
          agentId: missionForm.agentId,
          marketId: agent.marketId,
          type: missionForm.type as any,
          title: finalTitle,
          description: finalDesc,
          priority: missionForm.priority as any,
          targetStallId: missionForm.targetStallId || undefined
      });
      setIsMissionModalOpen(false);
      setMissionForm({ agentId: '', type: 'collection', title: '', description: '', priority: 'medium', targetStallId: '' });
      toast.success("Ordre de mission transmis au terminal.");
  };

  const handleCashValidation = (agentId: string, amount: number) => {
      if (confirm(`Confirmer la réception de ${formatCurrency(amount)} ?\nCette action est irréversible et sera auditée.`)) {
          onValidateCashDrop(agentId, amount);
          toast.success("Transaction validée et archivée.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* HEADER & TABS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400"/> {t(currentLanguage, 'agent_center')}</h2>
                    <p className="text-slate-400 text-sm">{t(currentLanguage, 'agent_subtitle')}</p>
                </div>
                <div className="flex gap-4 text-right">
                    <div className="hidden md:block">
                        <p className="text-xs font-bold text-slate-500 uppercase">{t(currentLanguage, 'agent_connected')}</p>
                        <p className="text-2xl font-black text-green-400 flex items-center justify-end gap-2">
                            <Signal className="w-4 h-4 animate-pulse"/> {activeAgentsCount} <span className="text-sm text-slate-500">/ {agents.length}</span>
                        </p>
                    </div>
                    <div className="w-px bg-slate-700 hidden md:block"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{t(currentLanguage, 'agent_cash_field')}</p>
                        <p className="text-2xl font-black text-yellow-400">{formatCurrency(totalCashInHand)}</p>
                    </div>
                </div>
            </div>
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                {[
                    { id: 'overview', label: t(currentLanguage, 'agent_radar'), icon: Radio },
                    { id: 'missions', label: t(currentLanguage, 'agent_ops'), icon: Target },
                    { id: 'cash', label: t(currentLanguage, 'agent_treasury'), icon: Wallet },
                    { id: 'roster', label: t(currentLanguage, 'agent_roster'), icon: UserCheck },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <tab.icon className="w-4 h-4"/> {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* --- TAB: OVERVIEW (RADAR) --- */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Simulated Map */}
                <Card className="lg:col-span-2 h-[500px] relative bg-slate-100 overflow-hidden flex items-center justify-center border-slate-300 shadow-inner group" noPadding>
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 opacity-30 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Map_of_Libreville.png')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"></div>
                    
                    {/* Grid Overlay for Tech Feel */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,100,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,100,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                    <div className="relative z-10 w-full h-full p-8">
                        {agents.map((agent, idx) => {
                            const status = getAgentStatus(agent.lastActive);
                            // Simulated positioning based on index to spread them out
                            const top = 20 + (idx % 3) * 25;
                            const left = 20 + (idx % 4) * 20;
                            
                            return (
                                <div key={agent.id} className="absolute flex flex-col items-center gap-1 transition-all duration-500 hover:scale-110 cursor-pointer" style={{ top: `${top}%`, left: `${left}%` }}>
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 shadow-lg text-white ${status.status === 'online' ? 'bg-blue-600 border-white' : 'bg-slate-500 border-slate-300 opacity-80'}`}>
                                            {agent.name.charAt(0)}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${status.bg} ${status.status === 'online' ? 'animate-pulse' : ''}`}></div>
                                    </div>
                                    <div className="bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm text-center border border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-900">{agent.name}</p>
                                        {agent.cashInHand > 0 && <p className="text-[9px] text-green-600 font-mono">{formatCurrency(agent.cashInHand)}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded-lg text-[10px] font-bold shadow border border-gray-200 space-y-1">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> En Ligne (< 5min)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Absent (5-30min)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Hors Ligne</div>
                    </div>
                </Card>

                {/* Activity Feed */}
                <Card className="flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-100 font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Radio className="w-4 h-4 text-blue-600"/> Flux Terrain</span>
                        <Badge variant="neutral" className="text-[10px]">Live</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {agents.flatMap(a => a.logs.map(l => ({ ...l, agentName: a.name }))).sort((a, b) => b.timestamp - a.timestamp).slice(0, 15).map((log, i) => (
                            <div key={i} className="flex gap-3 text-sm animate-slide-up">
                                <div className="flex-col items-center hidden sm:flex pt-1">
                                    <div className={`w-2 h-2 rounded-full ${log.actionType === 'payment_collected' ? 'bg-green-500' : log.actionType === 'sanction_issued' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                    <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800">{log.agentName}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-gray-600 mt-1 text-xs leading-relaxed">{log.details}</p>
                                    {log.amount && (
                                        <div className="mt-2 flex justify-end">
                                            <Badge variant={log.actionType === 'payment_collected' ? 'success' : 'danger'}>
                                                {log.actionType === 'payment_collected' ? '+' : '-'}{formatCurrency(log.amount)}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        )}

        {/* --- TAB: MISSIONS (OPERATIONS) --- */}
        {activeTab === 'missions' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                        <h3 className="font-bold text-blue-900 text-lg">{t(currentLanguage, 'agent_ops')}</h3>
                        <p className="text-sm text-blue-700">Assignez des tâches ciblées.</p>
                    </div>
                    <Button onClick={() => setIsMissionModalOpen(true)} leftIcon={Plus} className="bg-blue-600 hover:bg-blue-700 shadow-blue-200">{t(currentLanguage, 'agent_mission_new')}</Button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b uppercase text-xs">
                            <tr>
                                <th className="p-4">{t(currentLanguage, 'agent_mission_priority')}</th>
                                <th className="p-4">{t(currentLanguage, 'agent_mission_title')}</th>
                                <th className="p-4">{t(currentLanguage, 'agent_mission_assigned')}</th>
                                <th className="p-4">{t(currentLanguage, 'agent_mission_status')}</th>
                                <th className="p-4 text-right">Horodatage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {missions.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Aucune mission en cours.</td></tr>
                            ) : missions.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50 group">
                                    <td className="p-4">
                                        <Badge variant={m.priority === 'high' || m.priority === 'urgent' ? 'danger' : m.priority === 'medium' ? 'warning' : 'info'}>
                                            {m.priority.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-gray-900">{m.title}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{m.description}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {agents.find(a => a.id === m.agentId)?.name.charAt(0) || '?'}
                                            </div>
                                            <span className="font-medium text-gray-700">{agents.find(a => a.id === m.agentId)?.name || 'Inconnu'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {m.status === 'completed' ? (
                                            <div className="space-y-1">
                                                <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Terminé</span>
                                                <p className="text-xs text-gray-600 bg-gray-100 p-1.5 rounded border border-gray-200 italic">
                                                    "{m.report || 'Aucun rapport.'}"
                                                </p>
                                            </div>
                                        ) : (
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {m.status === 'in_progress' ? 'En Cours' : 'En Attente'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right text-gray-500 text-xs">
                                        <div>Créé: {new Date(m.createdAt).toLocaleTimeString()}</div>
                                        {m.completedAt && <div className="text-green-600 font-bold">Fini: {new Date(m.completedAt).toLocaleTimeString()}</div>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- TAB: CASH (TRÉSORERIE) --- */}
        {activeTab === 'cash' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-yellow-50 border-yellow-200 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-black text-yellow-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-6 h-6"/> {t(currentLanguage, 'agent_cash_unpaid')}</h3>
                        <p className="text-sm text-yellow-700 mb-6">Montant total détenu par les agents.</p>
                        <div className="text-5xl font-black text-slate-900 mb-4 tracking-tight">{formatCurrency(totalCashInHand)}</div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button variant="outline" className="bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100 flex-1">{t(currentLanguage, 'agent_audit_flash')}</Button>
                        <Button className="bg-yellow-600 hover:bg-yellow-700 text-white border-none shadow-yellow-200 flex-1">{t(currentLanguage, 'agent_force_deposit')}</Button>
                    </div>
                </Card>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    <h4 className="font-bold text-gray-700 uppercase text-xs sticky top-0 bg-gray-50 py-2">Détail par Agent</h4>
                    {agents.filter(a => a.cashInHand > 0).map(agent => (
                        <div key={agent.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{agent.name.charAt(0)}</div>
                                <div>
                                    <p className="font-bold text-gray-900">{agent.name}</p>
                                    <p className="text-xs text-gray-500">Dernier ping: {new Date(agent.lastActive).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-black text-lg text-gray-800">{formatCurrency(agent.cashInHand)}</span>
                                <Button size="sm" onClick={() => handleCashValidation(agent.id, agent.cashInHand)} className="bg-green-600 hover:bg-green-700 shadow-none h-9 px-4">Encaisser</Button>
                            </div>
                        </div>
                    ))}
                    {agents.filter(a => a.cashInHand > 0).length === 0 && (
                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
                            Tous les fonds ont été reversés. Trésorerie sécurisée.
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- TAB: ROSTER (EFFECTIFS) --- */}
        {activeTab === 'roster' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map(agent => {
                    const status = getAgentStatus(agent.lastActive);
                    return (
                        <Card key={agent.id} className={`border-t-4 transition-all hover:shadow-md ${status.status === 'online' ? 'border-t-green-500' : 'border-t-gray-300'}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${status.status === 'online' ? 'bg-blue-600' : 'bg-slate-400'}`}>
                                            {agent.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{agent.name}</h3>
                                            <p className="text-xs text-gray-500 capitalize">{agent.role}</p>
                                        </div>
                                    </div>
                                    <Badge className={`${status.color} bg-opacity-10 border-current`}>
                                        {status.label}
                                    </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-gray-50 p-2 rounded text-center border border-gray-100">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">{t(currentLanguage, 'agent_performance')}</p>
                                        <p className="font-black text-gray-800">{agent.performanceScore}/100</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded text-center border border-gray-100">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">{t(currentLanguage, 'agent_battery')}</p>
                                        <p className={`font-black flex items-center justify-center gap-1 ${status.status === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
                                            <Battery className="w-3 h-3"/> {status.status === 'online' ? '85%' : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                    <span className="text-xs font-bold text-slate-500">{t(currentLanguage, 'agent_assigned_market')}</span>
                                    <span className="text-sm font-medium text-slate-800">{markets.find(m => m.id === agent.marketId)?.name || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-3 flex gap-2">
                                <Button size="sm" variant="primary" className="flex-1 text-xs w-full" onClick={() => { setMissionForm(prev => ({...prev, agentId: agent.id})); setIsMissionModalOpen(true); }}>
                                    {t(currentLanguage, 'agent_assign')}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        )}

        {/* MISSION ASSIGNMENT MODAL (UPDATED WITH TARGETING) */}
        {isMissionModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-fade-in">
                <Card className="w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Target className="w-5 h-5 text-blue-600"/> {t(currentLanguage, 'agent_mission_new')}</h3>
                        <button onClick={() => setIsMissionModalOpen(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    <form onSubmit={handleCreateMission} className="p-6 space-y-4 overflow-y-auto">
                        
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 mb-2">
                            <p className="font-bold">Instructions :</p>
                            <ul className="list-disc pl-4 text-xs mt-1 space-y-1">
                                <li>Sélectionnez un étal pour lier les données (dette, historique).</li>
                                <li>L'agent recevra une notification prioritaire.</li>
                            </ul>
                        </div>

                        <Select label="Agent" required value={missionForm.agentId} onChange={e => setMissionForm({...missionForm, agentId: e.target.value})}>
                            <option value="">-- Sélectionner un agent --</option>
                            {agents.filter(a => getAgentStatus(a.lastActive).status === 'online').map(a => <option key={a.id} value={a.id}>🟢 {a.name} (En ligne)</option>)}
                            {agents.filter(a => getAgentStatus(a.lastActive).status !== 'online').map(a => <option key={a.id} value={a.id}>⚪ {a.name} (Hors ligne)</option>)}
                        </Select>

                        <Select label="Type de Mission" required value={missionForm.type} onChange={e => setMissionForm({...missionForm, type: e.target.value})}>
                            <option value="collection">💰 Recouvrement (Dette)</option>
                            <option value="inspection">🔍 Inspection Hygiène</option>
                            <option value="verification">📝 Vérification Administrative</option>
                            <option value="security">👮 Sécurité / Intervention</option>
                        </Select>

                        <Select label="Cible (Étal Spécifique)" value={missionForm.targetStallId} onChange={e => setMissionForm({...missionForm, targetStallId: e.target.value})}>
                            <option value="">-- Aucune cible spécifique --</option>
                            {stalls.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.number} - {s.occupantName || 'Libre'} ({s.zone})
                                </option>
                            ))}
                        </Select>

                        <Input label="Titre (Auto si cible choisie)" placeholder="Ex: Inspection Zone A" value={missionForm.title} onChange={e => setMissionForm({...missionForm, title: e.target.value})} />
                        <TextArea label="Instructions détaillées" placeholder="Détails..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                        
                        <Select label="Priorité" value={missionForm.priority} onChange={e => setMissionForm({...missionForm, priority: e.target.value})}>
                            <option value="low">Basse (À faire dans la journée)</option>
                            <option value="medium">Moyenne (Standard)</option>
                            <option value="high">Haute (Prioritaire)</option>
                            <option value="urgent">🔴 URGENTE (Immédiat)</option>
                        </Select>

                        <div className="pt-2">
                            <Button type="submit" className="w-full shadow-blue-200">Transmettre Ordre</Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}
    </div>
  );
};

export default AgentManager;
