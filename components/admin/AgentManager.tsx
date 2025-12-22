
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Agent, User, Market, Stall, Mission } from '../../types';
import { Loader2, Phone, Battery, Locate, Map as MapIcon, ShieldAlert, AlertCircle, CheckCircle, WifiOff, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';
import { calculateDistance } from '../../utils/geoUtils';

interface AgentManagerProps {
    users: User[];
    markets: Market[];
    stalls: Stall[];
    missions: Mission[];
}

const AgentManager: React.FC<AgentManagerProps> = ({ users, markets }) => {
    const [activeTab, setActiveTab] = useState<'roster' | 'map'>('roster');
    const [mapError, setMapError] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});

    const liveAgents = useMemo(() => users.filter(u => u.role === 'agent' && u.agentStats?.isShiftActive), [users]);

    useEffect(() => {
        // @ts-ignore
        if (activeTab === 'map' && (!(window as any).L || (window as any).MAPS_AVAILABLE === false)) {
            setMapError(true); return;
        }

        if (activeTab === 'map' && mapRef.current && !mapInstance.current) {
            try {
                // @ts-ignore
                const L = (window as any).L;
                mapInstance.current = L.map(mapRef.current).setView([0.3944, 9.4536], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
            } catch (e) { setMapError(true); }
        }

        if (activeTab === 'map' && mapInstance.current) updateMarkers();

        return () => {
            if (mapInstance.current && activeTab !== 'map') {
                mapInstance.current.remove(); mapInstance.current = null; markersRef.current = {};
            }
        };
    }, [activeTab, liveAgents]);

    const updateMarkers = () => {
        // @ts-ignore
        const L = (window as any).L;
        if (!L || !mapInstance.current) return;

        liveAgents.forEach(agent => {
            const stats = agent.agentStats;
            if (stats?.lat && stats?.lng) {
                const market = markets.find(m => m.id === agent.marketId);
                // GEOFENCING: Alerte si l'agent est à plus de 500m de son marché
                const isOut = market && calculateDistance(stats.lat, stats.lng, market.lat, market.lng) > 500;

                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div class="w-10 h-10 rounded-2xl border-4 border-white shadow-2xl flex items-center justify-center font-black text-white transition-all transform hover:scale-110 ${isOut ? 'bg-red-600 animate-bounce' : 'bg-blue-600'}">${agent.name.charAt(0)}</div>`,
                    iconSize: [40, 40]
                });

                if (markersRef.current[agent.id]) {
                    markersRef.current[agent.id].setLatLng([stats.lat, stats.lng]).setIcon(icon);
                } else {
                    markersRef.current[agent.id] = L.marker([stats.lat, stats.lng], { icon })
                        .addTo(mapInstance.current)
                        .bindPopup(`<b>${agent.name}</b><br>${isOut ? '<span class="text-red-600 font-bold">HORS ZONE</span>' : stats.currentDistrict}`);
                }
            }
        });
    };

    return (
        <div className="flex h-[calc(100vh-250px)] flex-col gap-6 animate-fade-in">
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 w-fit shadow-sm">
                <button onClick={() => setActiveTab('roster')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'roster' ? 'bg-slate-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Annuaire Agents</button>
                <button onClick={() => { setActiveTab('map'); setMapError(false); }} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'map' ? 'bg-slate-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Radar Géographique</button>
            </div>

            {activeTab === 'map' ? (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    <Card className="flex-1 relative overflow-hidden bg-slate-100 rounded-[2.5rem] border-none shadow-2xl" noPadding>
                        {mapError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-white/80 backdrop-blur-md">
                                <WifiOff className="w-16 h-16 text-orange-500 mb-6 animate-pulse"/>
                                <h4 className="text-2xl font-black text-slate-900 uppercase">Cartographie Inactive</h4>
                                <p className="text-sm text-slate-500 max-w-xs mt-2">Le service Leaflet n'a pu être initialisé. Mode radar dégradé.</p>
                            </div>
                        ) : <div ref={mapRef} className="w-full h-full z-0" />}
                        
                        {!mapError && (
                            <div className="absolute bottom-6 left-6 z-10 bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 max-w-xs animate-slide-up">
                                <h4 className="font-black uppercase tracking-widest text-[10px] text-blue-400 mb-4 flex items-center gap-2"><Zap className="w-3 h-3"/> État de la Brigade</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold">En zone</span>
                                        <Badge variant="success" className="bg-green-500/20 text-green-400 border-none">Normal</Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold">Violation Geofence</span>
                                        <Badge variant="danger" className="bg-red-500/20 text-red-400 border-none animate-pulse">Alerte QG</Badge>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                    <Card className="w-80 overflow-y-auto bg-white rounded-[2.5rem] border border-gray-100 shadow-xl" noPadding>
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 sticky top-0 z-10"><h4 className="font-black text-slate-900 text-sm uppercase tracking-tighter">Flux Live</h4></div>
                        <div className="p-4 space-y-3">
                            {liveAgents.map(agent => (
                                <div key={agent.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-500 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black text-slate-900 text-sm">{agent.name}</span>
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                                        <span>{agent.agentStats?.currentDistrict}</span>
                                        <span className="text-blue-600">{agent.agentStats?.battery}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.filter(u => u.role === 'agent').map(agent => (
                        <Card key={agent.id} className="p-6 rounded-[2rem] border-gray-100 hover:shadow-2xl transition-all group">
                             <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-xl ${agent.agentStats?.isShiftActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                                        {agent.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 tracking-tighter">{agent.name}</h4>
                                        <Badge variant={agent.agentStats?.isShiftActive ? 'success' : 'neutral'} className="text-[9px]">{agent.agentStats?.isShiftActive ? 'EN SERVICE' : 'REPOS'}</Badge>
                                    </div>
                                </div>
                                <button className="p-3 bg-gray-50 text-slate-400 rounded-xl group-hover:bg-green-50 group-hover:text-green-600 transition-colors"><Phone className="w-5 h-5"/></button>
                             </div>
                             <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50">
                                <Button size="sm" variant="ghost" className="font-bold text-blue-600">Missions</Button>
                                <Button size="sm" variant="ghost" className="font-bold text-slate-400">Historique</Button>
                             </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AgentManager;
