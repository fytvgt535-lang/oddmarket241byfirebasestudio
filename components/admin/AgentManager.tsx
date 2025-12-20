
import React, { useState, useMemo } from 'react';
import { Agent, User, Market, Stall, Mission } from '../../types';
import { Loader2, UserCheck, Phone, Battery, Locate } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface AgentManagerProps {
    agents: Agent[];
    users: User[];
    markets: Market[];
    stalls: Stall[];
    missions: Mission[];
    onAssignMission: (mission: any) => void;
    onValidateCashDrop: (agentId: string, amount: number) => void;
    currentLanguage: string;
}

const AgentManager: React.FC<AgentManagerProps> = ({ users, markets }) => {
    const [activeTab, setActiveTab] = useState('roster');
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    // Filter agents from users
    const agentUsers = useMemo(() => users.filter(u => u.role === 'agent'), [users]);
    const liveAgents = agentUsers.filter(u => u.agentStats?.isShiftActive).map(u => ({ ...u, ...u.agentStats }));

    // Group by first letter for roster
    const rosterData = useMemo(() => {
        const groups: Record<string, User[]> = {};
        agentUsers.forEach(u => {
            const letter = u.name.charAt(0).toUpperCase();
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(u);
        });
        return groups;
    }, [agentUsers]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {users.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500"/>
                        <p>Chargement de l'annuaire...</p>
                    </div>
                ) : Object.keys(rosterData).length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                        <p className="mb-2 font-bold text-gray-600">Aucun agent trouvé.</p>
                        <p className="text-xs opacity-70 max-w-xs mx-auto">
                            Vérifiez dans l'onglet "Utilisateurs" que vos agents ont bien le rôle 
                            <span className="font-bold text-blue-600 mx-1">Agent</span> 
                            attribué.
                        </p>
                    </div>
                ) : Object.keys(rosterData).sort().map(letter => (
                    <div key={letter} id={`roster-group-${letter}`} className="animate-fade-in">
                        <div className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-2 border-b border-gray-200 mb-2">
                            <h4 className="text-sm font-black text-gray-500 w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg">{letter}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rosterData[letter].map(user => {
                                // Merge with live data
                                // @ts-ignore
                                const liveData = liveAgents.find(a => a.id === user.id);
                                const isOnline = liveData ? liveData.isShiftActive : false;
                                const market = markets.find(m => m.id === user.marketId);

                                return (
                                    <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-300 transition-all shadow-sm group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}>
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 leading-tight">{user.name}</h4>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        {isOnline ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>}
                                                        {isOnline ? 'En service' : 'Hors ligne'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => toast(`Appel ${user.phone}`)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors">
                                                <Phone className="w-4 h-4"/>
                                            </button>
                                        </div>
                                        
                                        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs">
                                            <span className="text-gray-500 font-medium">{market?.name || 'Non assigné'}</span>
                                            {liveData && liveData.batteryLevel && (
                                                <span className="flex items-center gap-1 text-gray-400">
                                                    <Battery className={`w-3 h-3 ${liveData.batteryLevel === 'active' ? 'text-green-500' : 'text-orange-500'}`}/>
                                                    {liveData.batteryLevel === 'active' ? 'High' : 'Eco'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {liveData && (
                                            <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="ghost" className="w-full h-8 text-xs bg-gray-50" onClick={() => { setActiveTab('overview'); setSelectedAgentId(user.id); }}>
                                                    <Locate className="w-3 h-3 mr-1"/> Localiser
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AgentManager;
