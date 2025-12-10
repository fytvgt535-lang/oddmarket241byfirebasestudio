
import React, { useState } from 'react';
import { Shield, Radio, Battery, Wallet, UserCheck, Plus, Target, X, MapPin } from 'lucide-react';
import { Agent, Market, Mission, Stall } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select, TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/coreUtils';
import toast from 'react-hot-toast';

interface AgentManagerProps {
  agents: Agent[];
  markets: Market[];
  stalls: Stall[];
  missions?: Mission[]; 
  onAssignMission: (mission: Omit<Mission, 'id' | 'status' | 'createdAt'>) => void;
  onValidateCashDrop: (agentId: string, amount: number) => void;
  currentLanguage: string;
}

// Bounding Box approx for Libreville (to map GPS to CSS %)
const LBV_BOUNDS = {
    minLat: 0.35, maxLat: 0.45,
    minLng: 9.40, maxLng: 9.50
};

const gpsToPercentage = (lat?: number, lng?: number) => {
    if (!lat || !lng) return { top: '50%', left: '50%' };
    // Map latitude to Top (inverse because higher latitude is up, but higher top is down)
    const top = ((LBV_BOUNDS.maxLat - lat) / (LBV_BOUNDS.maxLat - LBV_BOUNDS.minLat)) * 100;
    // Map longitude to Left
    const left = ((lng - LBV_BOUNDS.minLng) / (LBV_BOUNDS.maxLng - LBV_BOUNDS.minLng)) * 100;
    
    // Clamp values to keep inside box
    return {
        top: `${Math.max(5, Math.min(95, top))}%`,
        left: `${Math.max(5, Math.min(95, left))}%`
    };
};

const AgentManager: React.FC<AgentManagerProps> = ({ agents, markets, missions = [], onAssignMission, onValidateCashDrop }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'missions' | 'cash'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // Mission Form
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [missionForm, setMissionForm] = useState({ agentId: '', type: 'collection', title: '', description: '', priority: 'medium' });

  // --- STATS ---
  const totalCashInHand = agents.reduce((acc, a) => acc + (a.cashInHand || 0), 0);
  const activeAgents = agents.filter(a => a.isShiftActive).length;
  
  const handleCreateMission = (e: React.FormEvent) => {
      e.preventDefault();
      const agent = agents.find(a => a.id === missionForm.agentId);
      if (!agent) return;

      onAssignMission({
          agentId: missionForm.agentId,
          marketId: agent.marketId,
          type: missionForm.type as any,
          title: missionForm.title,
          description: missionForm.description,
          priority: missionForm.priority as any
      });
      setIsMissionModalOpen(false);
      setMissionForm({ agentId: '', type: 'collection', title: '', description: '', priority: 'medium' });
      toast.success("Mission transmise à l'agent.");
  };

  const handleCashValidation = (agentId: string, amount: number) => {
      if (confirm(`Confirmer la réception de ${formatCurrency(amount)} ?`)) {
          onValidateCashDrop(agentId, amount);
          toast.success("Fonds encaissés en trésorerie centrale.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* HEADER & TABS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400"/> Centre de Commandement</h2>
                    <p className="text-slate-400 text-sm">Gestion opérationnelle des équipes terrain</p>
                </div>
                <div className="flex gap-4 text-right">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Effectif Actif</p>
                        <p className="text-2xl font-black text-green-400">{activeAgents} <span className="text-sm text-slate-500">/ {agents.length}</span></p>
                    </div>
                    <div className="w-px bg-slate-700"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Fonds Terrain</p>
                        <p className="text-2xl font-black text-yellow-400">{formatCurrency(totalCashInHand)}</p>
                    </div>
                </div>
            </div>
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                {[
                    { id: 'overview', label: 'Radar', icon: Radio },
                    { id: 'roster', label: 'Effectifs', icon: UserCheck },
                    { id: 'missions', label: 'Missions', icon: Target },
                    { id: 'cash', label: 'Trésorerie', icon: Wallet },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                    >
                        <tab.icon className="w-4 h-4"/>
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* --- TAB: RADAR (REAL-TIME MAP) --- */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[500px] bg-slate-100 rounded-xl border border-slate-300 relative overflow-hidden group shadow-inner">
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Libreville_OpenStreetMap.png')] bg-cover bg-center opacity-50 grayscale hover:grayscale-0 transition-all duration-700"></div>
                    
                    {/* Radar Grid Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    <div className="absolute inset-0 border-2 border-green-500/20 rounded-xl pointer-events-none"></div>
                    
                    {/* Rotating Radar Scanner Effect */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[600px] h-[600px] rounded-full border border-green-500/10 animate-ping"></div>
                    </div>

                    {/* Agent Dots */}
                    {agents.map(agent => {
                        const pos = gpsToPercentage(agent.lat, agent.lng);
                        const hasCash = agent.cashInHand > 0;
                        const isSelected = selectedAgent?.id === agent.id;

                        return (
                            <div 
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent)}
                                className={`absolute cursor-pointer transition-all duration-500 ease-out hover:scale-125 hover:z-20 ${isSelected ? 'z-30 scale-125' : 'z-10'}`}
                                style={{ top: pos.top, left: pos.left }}
                            >
                                <div className={`relative flex items-center justify-center w-4 h-4`}>
                                    {/* Pulse Ring */}
                                    <div className={`absolute w-8 h-8 rounded-full opacity-50 animate-ping ${hasCash ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    {/* Dot */}
                                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${agent.isShiftActive ? (hasCash ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-400'}`}></div>
                                    
                                    {/* Tooltip Label */}
                                    <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {agent.name}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Details */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                    <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Détails Agent</h3>
                    {selectedAgent ? (
                        <div className="flex-1 space-y-4 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg">
                                    {selectedAgent.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900">{selectedAgent.name}</h4>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Badge variant={selectedAgent.isShiftActive ? 'success' : 'neutral'}>
                                            {selectedAgent.isShiftActive ? 'En Service' : 'Hors Ligne'}
                                        </Badge>
                                        <span className="text-gray-500 flex items-center gap-1"><Battery className="w-3 h-3"/> 85%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Marché Assigné</span>
                                    <span className="font-bold">{markets.find(m => m.id === selectedAgent.marketId)?.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Dernier Contact</span>
                                    <span className="font-bold">{new Date(selectedAgent.lastActive).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Fonds Terrain</span>
                                    <span className="font-bold text-yellow-600">{formatCurrency(selectedAgent.cashInHand)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button 
                                    className="w-full" 
                                    variant="outline" 
                                    onClick={() => {
                                        setMissionForm(prev => ({...prev, agentId: selectedAgent.id}));
                                        setIsMissionModalOpen(true);
                                    }}
                                >
                                    <Target className="w-4 h-4 mr-2"/> Assigner Mission
                                </Button>
                                {selectedAgent.cashInHand > 0 && (
                                    <Button 
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white border-none" 
                                        onClick={() => handleCashValidation(selectedAgent.id, selectedAgent.cashInHand)}
                                    >
                                        <Wallet className="w-4 h-4 mr-2"/> Valider Dépôt
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                            <MapPin className="w-12 h-12 mb-2 opacity-20"/>
                            <p>Sélectionnez un agent sur le radar.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- TAB: ROSTER (LIST) --- */}
        {activeTab === 'roster' && (
            <Card noPadding>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-gray-500">
                        <tr>
                            <th className="p-4">Agent</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4">Zone</th>
                            <th className="p-4 text-right">Performance</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {agents.map(agent => (
                            <tr key={agent.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-900">{agent.name}</td>
                                <td className="p-4">
                                    <Badge variant={agent.isShiftActive ? 'success' : 'neutral'}>
                                        {agent.isShiftActive ? 'Actif' : 'Inactif'}
                                    </Badge>
                                </td>
                                <td className="p-4 text-gray-600">{markets.find(m => m.id === agent.marketId)?.name}</td>
                                <td className="p-4 text-right font-bold">{agent.performanceScore}%</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => { setSelectedAgent(agent); setActiveTab('overview'); }} className="text-blue-600 hover:underline">Voir Radar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        )}

        {/* --- TAB: MISSIONS --- */}
        {activeTab === 'missions' && (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button onClick={() => setIsMissionModalOpen(true)} leftIcon={Plus}>Nouvelle Mission</Button>
                </div>
                {missions.length === 0 ? (
                    <div className="text-center py-10 bg-white border rounded-xl border-dashed">
                        <p className="text-gray-400">Aucune mission en cours.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {missions.map(m => (
                            <Card key={m.id} className="p-4 border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{m.title}</h4>
                                        <p className="text-xs text-gray-500">Assigné à: {agents.find(a => a.id === m.agentId)?.name || 'Inconnu'}</p>
                                    </div>
                                    <Badge variant={m.status === 'completed' ? 'success' : m.status === 'in_progress' ? 'info' : 'warning'}>
                                        {m.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{m.description}</p>
                                <div className="text-xs text-gray-400 flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                    <span>Priorité: {m.priority}</span>
                                    <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- TAB: CASH --- */}
        {activeTab === 'cash' && (
            <Card noPadding>
                <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-800 font-bold">
                        <Wallet className="w-5 h-5"/> Fonds à Récupérer
                    </div>
                    <span className="text-xl font-black text-yellow-700">{formatCurrency(totalCashInHand)}</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {agents.filter(a => a.cashInHand > 0).map(agent => (
                        <div key={agent.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                    {agent.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{agent.name}</p>
                                    <p className="text-xs text-gray-500">Dernière activité: {new Date(agent.lastActive).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-black text-lg text-gray-800">{formatCurrency(agent.cashInHand)}</span>
                                <Button size="sm" variant="primary" onClick={() => handleCashValidation(agent.id, agent.cashInHand)}>
                                    Valider Dépôt
                                </Button>
                            </div>
                        </div>
                    ))}
                    {agents.filter(a => a.cashInHand > 0).length === 0 && (
                        <div className="p-8 text-center text-gray-400">Tous les fonds ont été reversés.</div>
                    )}
                </div>
            </Card>
        )}

        {/* MISSION MODAL */}
        {isMissionModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Nouvelle Mission</h3>
                        <button onClick={() => setIsMissionModalOpen(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    <form onSubmit={handleCreateMission} className="space-y-4">
                        <Select label="Agent" value={missionForm.agentId} onChange={e => setMissionForm({...missionForm, agentId: e.target.value})} required>
                            <option value="">Choisir un agent...</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.isShiftActive ? 'Actif' : 'Off'})</option>)}
                        </Select>
                        <Select label="Type" value={missionForm.type} onChange={e => setMissionForm({...missionForm, type: e.target.value})}>
                            <option value="collection">Collecte Dette</option>
                            <option value="inspection">Inspection Hygiène</option>
                            <option value="verification">Vérification Admin</option>
                            <option value="security">Sécurité</option>
                        </Select>
                        <Input label="Titre" value={missionForm.title} onChange={e => setMissionForm({...missionForm, title: e.target.value})} placeholder="Ex: Recouvrer Stand A12" required/>
                        <TextArea label="Description" value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} placeholder="Détails..." rows={3}/>
                        <Select label="Priorité" value={missionForm.priority} onChange={e => setMissionForm({...missionForm, priority: e.target.value})}>
                            <option value="low">Basse</option>
                            <option value="medium">Moyenne</option>
                            <option value="high">Haute</option>
                            <option value="urgent">Urgente</option>
                        </Select>
                        <Button type="submit" className="w-full mt-4">Assigner</Button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AgentManager;
