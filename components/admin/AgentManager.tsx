
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, Radio, Battery, Wallet, UserCheck, Plus, Target, X, MapPin, Activity, Satellite, Clock, Lock, AlertTriangle, FileText, CheckCircle, RotateCcw, Locate, ShieldAlert, Signal, SignalLow, ArrowRight, CornerDownRight, Siren, QrCode, Scan, ImageIcon, Eye, Grid, Calendar, User, ChevronRight, Filter } from 'lucide-react';
import { Agent, Market, Mission, Stall } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select, TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/coreUtils';
import { getDistrictFromCoordinates } from '../../utils/geoUtils';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { MARKET_ZONES_CONFIG } from '../../constants/appConstants'; // Import Constants

// Declare Leaflet global
declare const L: any;

interface AgentManagerProps {
  agents: Agent[];
  markets: Market[];
  stalls: Stall[];
  missions?: Mission[]; 
  onAssignMission: (mission: Omit<Mission, 'id' | 'status' | 'createdAt'>) => void;
  onValidateCashDrop: (agentId: string, amount: number) => void;
  currentLanguage: string;
}

// SEUILS DE SÉCURITÉ
const MAX_SAFE_CASH = 50000;
const STALE_THRESHOLD = 300000;

const AgentManager: React.FC<AgentManagerProps> = ({ agents: initialAgents, markets, stalls, missions = [], onAssignMission, onValidateCashDrop }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'missions' | 'cash'>('overview');
  const [liveAgents, setLiveAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'agents' | 'coverage'>('agents');
  
  // MISSIONS STATE
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [newMission, setNewMission] = useState({
      title: '',
      description: '',
      priority: 'medium',
      type: 'collection',
      agentId: '',
      targetStallId: '',
      marketId: ''
  });

  // SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // MAP REFS
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const stallMarkersRef = useRef<any[]>([]); 
  const vectorLayersRef = useRef<any[]>([]);
  const zoneLayersRef = useRef<any[]>([]);
  const trailsRef = useRef<{ [key: string]: any }>({});

  useEffect(() => { setLiveAgents(initialAgents); }, [initialAgents]);

  // --- ODD: REAL-TIME TRACKING SUBSCRIPTION ---
  useEffect(() => {
      const channel = supabase.channel('odd-tracking')
          .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'profiles' 
          }, (payload) => {
              const updatedProfile = payload.new;
              if (updatedProfile.role === 'agent' && updatedProfile.agent_stats) {
                  setLiveAgents(prev => prev.map(agent => {
                      if (agent.id === updatedProfile.id) {
                          const stats = updatedProfile.agent_stats;
                          if (stats.cashInHand > MAX_SAFE_CASH && agent.id !== selectedAgentId) {
                              toast(`ATTENTION: ${agent.name} dépasse le plafond de cash !`, { icon: '💰', duration: 5000 });
                          }
                          if (stats.status === 'SOS') {
                              toast.error(`ALERTE SOS : ${agent.name}`, { duration: 6000, icon: '🚨' });
                          }

                          return {
                              ...agent,
                              lat: stats.lat,
                              lng: stats.lng,
                              currentDistrict: stats.currentDistrict, 
                              lastActive: stats.lastActive || Date.now(),
                              cashInHand: stats.cashInHand || agent.cashInHand,
                              isShiftActive: stats.isShiftActive,
                              status: stats.status,
                              batteryLevel: stats.batteryLevel,
                              authorizedZones: stats.authorizedZones || agent.authorizedZones
                          } as any;
                      }
                      return agent;
                  }));
              }
          })
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [selectedAgentId]);

  // --- LEAFLET MAP INITIALIZATION & UPDATE ---
  useEffect(() => {
      if (activeTab !== 'overview' || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([0.392, 9.454], 14); 
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; CARTO',
              subdomains: 'abcd',
              maxZoom: 19
          }).addTo(map);
          L.control.zoom({ position: 'bottomright' }).addTo(map);

          Object.values(MARKET_ZONES_CONFIG).forEach(zone => {
              const center = [zone.lat, zone.lng];
              const circle = L.circle(center, {
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.05,
                  radius: zone.radius, 
                  weight: 1,
                  dashArray: '5, 10'
              }).addTo(map);
              zoneLayersRef.current.push(circle);
          });

          mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const activeAgents = liveAgents.filter(a => a.isShiftActive && a.lat && a.lng);
      const now = Date.now();

      vectorLayersRef.current.forEach(layer => map.removeLayer(layer));
      vectorLayersRef.current = [];
      
      if (mapMode === 'coverage') {
          stallMarkersRef.current.forEach(layer => map.removeLayer(layer));
          stallMarkersRef.current = [];
          
          stalls.forEach(stall => {
              if (!stall.coordinates) return;
              let color = '#94a3b8';
              const isPaidToday = stall.lastPaymentDate && (now - stall.lastPaymentDate < 86400000);
              const isVisited = isPaidToday || Math.random() > 0.8;

              if (isPaidToday) color = '#22c55e';
              else if (stall.healthStatus === 'critical') color = '#ef4444';
              else if (isVisited) color = '#3b82f6';
              
              const circle = L.circleMarker([stall.coordinates.lat, stall.coordinates.lng], {
                  radius: 4, fillColor: color, color: '#000', weight: 1, opacity: 1, fillOpacity: 0.8
              }).addTo(map);
              circle.bindPopup(`<b>Étal ${stall.number}</b><br/>Statut: ${isPaidToday ? 'Payé' : isVisited ? 'Visité' : 'Non vu'}`);
              stallMarkersRef.current.push(circle);
          });
      } else {
          stallMarkersRef.current.forEach(layer => map.removeLayer(layer));
          stallMarkersRef.current = [];
      }

      activeAgents.forEach(agent => {
          const isSOS = (agent as any).status === 'SOS';
          const isStale = (now - agent.lastActive) > STALE_THRESHOLD; 
          const isHighCash = agent.cashInHand > MAX_SAFE_CASH;
          const agentMission = missions.find(m => m.agentId === agent.id && m.status === 'in_progress');
          
          let markerColor = 'bg-green-500';
          let ringColor = '';
          
          if (isStale) markerColor = 'bg-gray-500';
          else if (isSOS) { markerColor = 'bg-red-600'; ringColor = 'border-red-600 animate-ping'; }
          else if (isHighCash) { markerColor = 'bg-purple-600'; ringColor = 'border-purple-500 animate-pulse'; }

          const iconHtml = `
            <div class="relative flex items-center justify-center ${isStale ? 'opacity-50 grayscale' : ''}">
                <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg ${markerColor}"></div>
                ${ringColor ? `<div class="absolute w-12 h-12 rounded-full border-4 ${ringColor} opacity-30"></div>` : ''}
                ${selectedAgentId === agent.id ? '<div class="absolute w-8 h-8 rounded-full border border-white animate-pulse opacity-100"></div>' : ''}
                ${isHighCash ? '<div class="absolute -top-6 bg-purple-600 text-white text-[9px] px-1 rounded font-bold">CASH</div>' : ''}
            </div>
          `;
          
          const customIcon = L.divIcon({ className: 'custom-marker', html: iconHtml, iconSize: [20, 20], iconAnchor: [10, 10] });

          if (markersRef.current[agent.id]) {
              markersRef.current[agent.id].setLatLng([agent.lat, agent.lng]).setIcon(customIcon);
          } else {
              const marker = L.marker([agent.lat, agent.lng], { icon: customIcon }).addTo(map);
              marker.on('click', () => setSelectedAgentId(agent.id));
              marker.bindTooltip(`${agent.name}`, { direction: 'top', offset: [0, -10] });
              markersRef.current[agent.id] = marker;
          }

          if (!trailsRef.current[agent.id]) {
              trailsRef.current[agent.id] = L.polyline([], { color: isHighCash ? '#9333ea' : '#10b981', weight: 2, opacity: 0.4 }).addTo(map);
          }
          trailsRef.current[agent.id].addLatLng([agent.lat, agent.lng]);
          
          if (agentMission && agentMission.targetStallId) {
              const targetStall = stalls.find(s => s.id === agentMission.targetStallId);
              if (targetStall && targetStall.coordinates) {
                  const vector = L.polyline([
                      [agent.lat, agent.lng],
                      [targetStall.coordinates.lat, targetStall.coordinates.lng]
                  ], {
                      color: '#f59e0b', weight: 2, opacity: 0.8, dashArray: '5, 5'
                  }).addTo(map);
                  vectorLayersRef.current.push(vector);
              }
          }

          if (isSOS) map.flyTo([agent.lat, agent.lng], 16);
      });

      Object.keys(markersRef.current).forEach(id => {
          if (!activeAgents.find(a => a.id === id)) {
              map.removeLayer(markersRef.current[id]);
              delete markersRef.current[id];
              if (trailsRef.current[id]) { map.removeLayer(trailsRef.current[id]); delete trailsRef.current[id]; }
          }
      });

  }, [activeTab, liveAgents, selectedAgentId, missions, stalls, mapMode]);

  const selectedAgent = liveAgents.find(a => a.id === selectedAgentId) || null;
  const isSelectedHighCash = selectedAgent ? selectedAgent.cashInHand > MAX_SAFE_CASH : false;
  const isSelectedStale = selectedAgent ? (Date.now() - selectedAgent.lastActive) > STALE_THRESHOLD : false;
  const totalCashInHand = liveAgents.reduce((acc, a) => acc + (a.cashInHand || 0), 0);
  const riskCash = liveAgents.filter(a => a.cashInHand > MAX_SAFE_CASH).reduce((acc, a) => acc + a.cashInHand, 0);

  const handleCreateMission = (e: React.FormEvent) => {
      e.preventDefault();
      onAssignMission({
          title: newMission.title,
          description: newMission.description,
          type: newMission.type as any,
          priority: newMission.priority as any,
          marketId: newMission.marketId,
          agentId: newMission.agentId,
          targetStallId: newMission.targetStallId || undefined
      });
      setIsMissionModalOpen(false);
      setNewMission({ title: '', description: '', priority: 'medium', type: 'collection', agentId: '', targetStallId: '', marketId: '' });
      toast.success("Mission assignée avec succès", { icon: '📡' });
  };

  const handleProcessScan = (dataString: string) => {
      try {
          const data = JSON.parse(dataString);
          if (data.type !== 'deposit') throw new Error("Type de QR invalide");
          onValidateCashDrop(data.agentId, data.amount);
          toast.success(`Dépôt de ${formatCurrency(data.amount)} validé !`);
          setIsScanning(false);
          setScanResult(null);
      } catch (e) {
          toast.error("QR Code invalide.");
      }
  };

  const handleSimulateScan = () => {
      const agentWithCash = liveAgents.find(a => a.cashInHand > 0);
      if (agentWithCash) {
          const data = JSON.stringify({
              type: 'deposit',
              agentId: agentWithCash.id,
              amount: agentWithCash.cashInHand
          });
          handleProcessScan(data);
      } else {
          toast("Aucun agent n'a de fond à verser pour la simulation.", { icon: 'ℹ️' });
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* HEADER & TABS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400"/> Centre de Commandement</h2>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Module ODD (Oeil de Dieu) v3.4 - PATROL
                    </p>
                </div>
                 <div className="flex gap-6 text-right items-center">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle className={`w-3 h-3 ${riskCash > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}/> Risque Cash
                        </p>
                        <p className={`text-xl font-black ${riskCash > 0 ? 'text-red-400' : 'text-gray-500'}`}>{formatCurrency(riskCash)}</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setIsScanning(true)}>
                        <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                            <QrCode className="w-3 h-3"/> Scanner Dépôt
                        </p>
                        <p className="text-2xl font-black text-white">{formatCurrency(totalCashInHand)}</p>
                    </div>
                </div>
            </div>
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                {[{ id: 'overview', label: 'Radar Tactique', icon: Radio }, { id: 'roster', label: 'Effectifs', icon: UserCheck }, { id: 'missions', label: 'Opérations', icon: Target }, { id: 'cash', label: 'Trésorerie', icon: Wallet }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                        <tab.icon className="w-4 h-4"/>{tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[600px] bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden shadow-2xl">
                    <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                    <div className="absolute top-4 left-4 z-[400] flex bg-black/50 backdrop-blur rounded-lg p-1 border border-white/10">
                        <button onClick={() => setMapMode('agents')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${mapMode === 'agents' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Satellite className="w-3 h-3"/> Agents
                        </button>
                        <button onClick={() => setMapMode('coverage')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${mapMode === 'coverage' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Grid className="w-3 h-3"/> Couverture
                        </button>
                    </div>
                </div>
                 <div className={`bg-white p-0 rounded-xl border shadow-sm flex flex-col h-[600px] overflow-hidden ${isSelectedHighCash ? 'border-purple-500 border-2' : 'border-gray-200'}`}>
                    {!selectedAgent && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center bg-gray-50/50">
                            <Satellite className="w-16 h-16 mb-4 opacity-20 text-slate-900"/>
                            <p className="font-bold text-gray-600">Sélectionnez une cible sur le Radar</p>
                        </div>
                    )}
                    {selectedAgent && (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-2xl text-gray-900">{selectedAgent.name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {selectedAgent.marketId || 'Secteur Inconnu'}</p>
                                    </div>
                                    <Badge variant={selectedAgent.isShiftActive ? 'success' : 'neutral'}>{selectedAgent.isShiftActive ? 'EN SERVICE' : 'OFF'}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Caisse Actuelle</p>
                                        <p className={`text-lg font-black ${isSelectedHighCash ? 'text-purple-600' : 'text-gray-800'}`}>{formatCurrency(selectedAgent.cashInHand)}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Dernier Ping</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isSelectedStale ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                            <p className="text-sm font-bold">{new Date(selectedAgent.lastActive).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase">Journal de bord</h4>
                                {selectedAgent.logs && selectedAgent.logs.length > 0 ? selectedAgent.logs.slice().reverse().map(log => (
                                    <div key={log.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1 relative">
                                        <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-gray-300"></div>
                                        <p className="font-bold text-gray-700">{log.details}</p>
                                        <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                )) : <p className="text-center text-gray-400 text-xs italic py-4">Aucune activité enregistrée</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* MISSIONS TAB - KANBAN STYLE */}
        {activeTab === 'missions' && (
            <div className="space-y-6 h-[calc(100vh-300px)] flex flex-col">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Target className="w-6 h-6"/></div>
                        <div>
                            <h3 className="font-bold text-gray-900">Tableau des Opérations</h3>
                            <p className="text-xs text-gray-500">Supervision en temps réel</p>
                        </div>
                    </div>
                    <Button onClick={() => setIsMissionModalOpen(true)} leftIcon={Plus} className="bg-blue-600 hover:bg-blue-700 shadow-blue-200">
                        Nouvelle Mission
                    </Button>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden min-h-0">
                    {/* COLUMN 1: PENDING */}
                    <div className="flex flex-col bg-gray-100 rounded-xl p-2 h-full">
                        <div className="flex justify-between items-center px-2 py-3">
                            <span className="font-bold text-gray-600 text-sm flex items-center gap-2"><Clock className="w-4 h-4"/> En Attente</span>
                            <Badge variant="neutral">{missions.filter(m => m.status === 'pending').length}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 p-1">
                            {missions.filter(m => m.status === 'pending').map(m => (
                                <Card key={m.id} className="p-3 border-l-4 border-l-gray-400 hover:shadow-md cursor-pointer transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${m.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {m.priority.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">{m.title}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{m.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-1.5 rounded">
                                        <User className="w-3 h-3"/>
                                        {liveAgents.find(a => a.id === m.agentId)?.name || 'Non assigné'}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 2: ACTIVE */}
                    <div className="flex flex-col bg-blue-50/50 rounded-xl p-2 h-full border border-blue-100">
                        <div className="flex justify-between items-center px-2 py-3">
                            <span className="font-bold text-blue-700 text-sm flex items-center gap-2"><Activity className="w-4 h-4"/> En Cours</span>
                            <Badge variant="info">{missions.filter(m => m.status === 'in_progress').length}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 p-1">
                            {missions.filter(m => m.status === 'in_progress').map(m => (
                                <Card key={m.id} className="p-3 border-l-4 border-l-blue-500 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="info" className="text-[10px]">ACTIVE</Badge>
                                        <span className="text-[10px] text-blue-400 animate-pulse font-bold">En cours...</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm mb-1">{m.title}</h4>
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center font-bold text-[9px]">
                                                {liveAgents.find(a => a.id === m.agentId)?.name.charAt(0)}
                                            </div>
                                            {liveAgents.find(a => a.id === m.agentId)?.name}
                                        </div>
                                        <MapPin className="w-3 h-3 text-gray-400"/>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 3: COMPLETED */}
                    <div className="flex flex-col bg-green-50/50 rounded-xl p-2 h-full border border-green-100">
                        <div className="flex justify-between items-center px-2 py-3">
                            <span className="font-bold text-green-700 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Terminées</span>
                            <Badge variant="success">{missions.filter(m => m.status === 'completed').length}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 p-1">
                            {missions.filter(m => m.status === 'completed').map(m => (
                                <Card key={m.id} className="p-3 border-l-4 border-l-green-500 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-800 text-sm line-through decoration-gray-400">{m.title}</h4>
                                        <CheckCircle className="w-4 h-4 text-green-500"/>
                                    </div>
                                    <p className="text-xs text-gray-500">{m.report || "Aucun rapport."}</p>
                                    <p className="text-[10px] text-gray-400 mt-2 text-right">Clôturé le {new Date(m.completedAt || Date.now()).toLocaleDateString()}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MISSION CREATION MODAL */}
        {isMissionModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600"/> Nouvelle Mission
                        </h3>
                        <button onClick={() => setIsMissionModalOpen(false)}><X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        <Input label="Titre de la mission" placeholder="Ex: Inspection Zone A" value={newMission.title} onChange={e => setNewMission({...newMission, title: e.target.value})} required/>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['collection', 'inspection', 'security', 'verification'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setNewMission({...newMission, type: t})}
                                            className={`py-2 text-xs font-bold rounded-lg border capitalize ${newMission.type === t ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priorité</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['low', 'medium', 'high', 'urgent'].map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => setNewMission({...newMission, priority: p})}
                                            className={`py-2 text-xs font-bold rounded-lg border capitalize ${newMission.priority === p ? (p === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-800 border-gray-300') : 'bg-white text-gray-400 border-gray-200'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cible (Étal ou Zone)</label>
                            <Select value={newMission.targetStallId} onChange={e => setNewMission({...newMission, targetStallId: e.target.value})}>
                                <option value="">Aucune cible spécifique</option>
                                {stalls.map(s => <option key={s.id} value={s.id}>Étal {s.number} - {s.occupantName}</option>)}
                            </Select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assigner à l'Agent</label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
                                {liveAgents.map(agent => {
                                    const load = missions.filter(m => m.agentId === agent.id && m.status === 'in_progress').length;
                                    return (
                                        <button 
                                            key={agent.id}
                                            onClick={() => setNewMission({...newMission, agentId: agent.id, marketId: agent.marketId})}
                                            className={`flex justify-between items-center p-3 rounded-lg border text-left transition-all ${newMission.agentId === agent.id ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{agent.name}</p>
                                                <p className="text-xs text-gray-500">{agent.marketId}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={load > 2 ? 'danger' : 'neutral'} className="text-[10px]">{load} missions actives</Badge>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <TextArea label="Instructions" placeholder="Détails pour l'agent..." rows={3} value={newMission.description} onChange={e => setNewMission({...newMission, description: e.target.value})} required/>
                    </div>

                    <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                        <Button variant="ghost" onClick={() => setIsMissionModalOpen(false)} className="flex-1">Annuler</Button>
                        <Button onClick={handleCreateMission} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg">Lancer Mission</Button>
                    </div>
                </div>
            </div>
        )}

        {/* SCANNER MODAL */}
        {isScanning && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative">
                    <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X className="w-6 h-6"/></button>
                    <div className="aspect-square bg-black relative">
                        <div className="absolute inset-0 border-2 border-white/20 m-8 rounded-xl"></div>
                        <div className="absolute inset-0 border-t-2 border-green-500 m-8 rounded-xl animate-scan"></div>
                        <p className="absolute bottom-4 w-full text-center text-white font-mono text-sm animate-pulse">RECHERCHE SIGNAL...</p>
                    </div>
                    <div className="p-6 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Scanner QR Agent</h3>
                        <p className="text-gray-400 text-sm mb-4">Visez le code de dépôt affiché sur le terminal de l'agent.</p>
                        <Button variant="secondary" onClick={handleSimulateScan} className="w-full">Simulation Test</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AgentManager;
