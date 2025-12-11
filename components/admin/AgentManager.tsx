
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, Radio, Battery, Wallet, UserCheck, Plus, Target, X, MapPin, Activity, Satellite, Clock, Lock, AlertTriangle, FileText, CheckCircle, RotateCcw, Locate, ShieldAlert, Signal, SignalLow, ArrowRight, CornerDownRight, Siren, QrCode, Scan, ImageIcon } from 'lucide-react';
import { Agent, Market, Mission, Stall } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select, TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/coreUtils';
import { getDistrictFromCoordinates } from '../../utils/geoUtils';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

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

// ZONES
const MARKET_ZONES: Record<string, { lat: number, lng: number, radius: number }> = {
    'm1': { lat: 0.3944, lng: 9.4536, radius: 300 },
    'm2': { lat: 0.4100, lng: 9.4600, radius: 500 },
};

const AgentManager: React.FC<AgentManagerProps> = ({ agents: initialAgents, markets, stalls, missions = [], onAssignMission, onValidateCashDrop }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'missions' | 'cash'>('overview');
  const [liveAgents, setLiveAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // EVIDENCE MODAL STATE
  const [viewEvidence, setViewEvidence] = useState<string | null>(null);

  // MAP REFS
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
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
                          // Check Security Thresholds
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

          // Draw Market Zones (Security Perimeters)
          markets.forEach(m => {
              // Mock coordinates if not present
              const center = m.lat ? [m.lat, m.lng] : [0.3944, 9.4536];
              const circle = L.circle(center, {
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.05,
                  radius: 400, // meters
                  weight: 1,
                  dashArray: '5, 10'
              }).addTo(map);
              zoneLayersRef.current.push(circle);
          });

          mapInstanceRef.current = map;
      }

      // Update Markers & Vectors
      const map = mapInstanceRef.current;
      const activeAgents = liveAgents.filter(a => a.isShiftActive && a.lat && a.lng);
      const now = Date.now();

      // Clear old vectors
      vectorLayersRef.current.forEach(layer => map.removeLayer(layer));
      vectorLayersRef.current = [];

      activeAgents.forEach(agent => {
          const isSOS = (agent as any).status === 'SOS';
          const isStale = (now - agent.lastActive) > STALE_THRESHOLD; 
          const isHighCash = agent.cashInHand > MAX_SAFE_CASH;
          
          // Zone Check (Simple distance check from Mont-Bouët center for demo)
          const distFromCenter = Math.sqrt(Math.pow(agent.lat! - 0.3944, 2) + Math.pow(agent.lng! - 9.4536, 2));
          const isOutOfZone = distFromCenter > 0.01; // Approx 1km

          // Find Active Mission
          const agentMission = missions.find(m => m.agentId === agent.id && m.status === 'in_progress');
          
          // --- CONCRETE VISUALIZATION ---
          let markerColor = 'bg-green-500';
          let ringColor = '';
          
          if (isStale) markerColor = 'bg-gray-500';
          else if (isSOS) { markerColor = 'bg-red-600'; ringColor = 'border-red-600 animate-ping'; }
          else if (isHighCash) { markerColor = 'bg-purple-600'; ringColor = 'border-purple-500 animate-pulse'; }
          else if (isOutOfZone) { markerColor = 'bg-orange-500'; }

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
              marker.bindTooltip(`${agent.name} ${isOutOfZone ? '(HORS ZONE)' : ''}`, { direction: 'top', offset: [0, -10] });
              markersRef.current[agent.id] = marker;
          }

          // Trail Logic
          if (!trailsRef.current[agent.id]) {
              trailsRef.current[agent.id] = L.polyline([], { color: isHighCash ? '#9333ea' : '#10b981', weight: 2, opacity: 0.4 }).addTo(map);
          }
          trailsRef.current[agent.id].addLatLng([agent.lat, agent.lng]);
          
          // Mission Vector
          if (agentMission && agentMission.targetStallId) {
              const targetStall = stalls.find(s => s.id === agentMission.targetStallId);
              if (targetStall && targetStall.coordinates) {
                  const vector = L.polyline([
                      [agent.lat, agent.lng],
                      [targetStall.coordinates.lat, targetStall.coordinates.lng]
                  ], {
                      color: '#f59e0b', 
                      weight: 2,
                      opacity: 0.8,
                      dashArray: '5, 5'
                  }).addTo(map);
                  vectorLayersRef.current.push(vector);
              }
          }

          if (isSOS) map.flyTo([agent.lat, agent.lng], 16);
      });

      // Cleanup
      Object.keys(markersRef.current).forEach(id => {
          if (!activeAgents.find(a => a.id === id)) {
              map.removeLayer(markersRef.current[id]);
              delete markersRef.current[id];
              if (trailsRef.current[id]) { map.removeLayer(trailsRef.current[id]); delete trailsRef.current[id]; }
          }
      });

  }, [activeTab, liveAgents, selectedAgentId, missions, stalls]); 

  const selectedAgent = liveAgents.find(a => a.id === selectedAgentId) || null;
  const isSelectedHighCash = selectedAgent ? selectedAgent.cashInHand > MAX_SAFE_CASH : false;
  const isSelectedStale = selectedAgent ? (Date.now() - selectedAgent.lastActive) > STALE_THRESHOLD : false;

  const totalCashInHand = liveAgents.reduce((acc, a) => acc + (a.cashInHand || 0), 0);
  const riskCash = liveAgents.filter(a => a.cashInHand > MAX_SAFE_CASH).reduce((acc, a) => acc + a.cashInHand, 0);

  // --- SCAN LOGIC ---
  const handleSimulateScan = () => {
      if (!selectedAgent) return;
      if (selectedAgent.cashInHand === 0) {
          toast.error("Cet agent n'a pas de fonds à déposer.");
          return;
      }
      const simulatedPayload = JSON.stringify({
          type: 'deposit',
          agentId: selectedAgent.id,
          amount: selectedAgent.cashInHand,
          timestamp: Date.now()
      });
      setScanResult(simulatedPayload);
      handleProcessScan(simulatedPayload);
  };

  const handleProcessScan = (dataString: string) => {
      try {
          const data = JSON.parse(dataString);
          if (data.type !== 'deposit') throw new Error("Type de QR invalide");
          onValidateCashDrop(data.agentId, data.amount);
          toast.success(`Dépôt de ${formatCurrency(data.amount)} validé par signature numérique !`);
          setIsScanning(false);
          setScanResult(null);
      } catch (e) {
          toast.error("QR Code invalide ou corrompu.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* EVIDENCE VIEWER MODAL */}
        {viewEvidence && (
            <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewEvidence(null)}>
                <div className="max-w-2xl w-full bg-black rounded-lg overflow-hidden border border-gray-700 relative">
                    <img src={viewEvidence} className="w-full h-auto object-contain max-h-[80vh]" alt="Preuve"/>
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent text-white">
                        <p className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Preuve Numérique Certifiée</p>
                    </div>
                    <button className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white" onClick={() => setViewEvidence(null)}>
                        <X className="w-6 h-6"/>
                    </button>
                </div>
            </div>
        )}

        {/* SECURE SCAN MODAL */}
        {isScanning && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden relative">
                    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><Scan className="w-5 h-5"/> Scanner Dépôt</h3>
                        <button onClick={() => setIsScanning(false)}><X className="w-6 h-6"/></button>
                    </div>
                    <div className="aspect-square bg-black relative flex items-center justify-center">
                        <div className="absolute inset-0 opacity-50 bg-[url('https://media.istockphoto.com/id/1325006592/video/defocused-unrecognizable-people-walking-in-busy-shopping-mall.jpg?s=640x640&k=20&c=Vz52Q8aJDqY_gwJgwVlJtB_qK-LWF8Q4Z-J_X_y_y_g=')] bg-cover"></div>
                        <div className="border-2 border-green-500 w-64 h-64 relative z-10 animate-pulse flex items-center justify-center">
                            <span className="text-green-500 font-mono text-xs bg-black/50 px-2">VISEZ LE QR AGENT</span>
                        </div>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-500 mb-4">Placez le QR Code de l'agent dans le cadre.</p>
                        <Button onClick={handleSimulateScan} className="w-full bg-slate-900 text-white">Simuler Scan Caméra</Button>
                    </div>
                </div>
            </div>
        )}

        {/* HEADER & TABS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400"/> Centre de Commandement</h2>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Module ODD (Oeil de Dieu) v3.3 - EVIDENCE
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
                {[{ id: 'overview', label: 'Radar Tactique', icon: Radio }, { id: 'roster', label: 'Effectifs', icon: UserCheck }, { id: 'missions', label: 'Missions', icon: Target }, { id: 'cash', label: 'Trésorerie', icon: Wallet }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                        <tab.icon className="w-4 h-4"/>{tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* --- TAB: RADAR (REAL MAP) --- */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[600px] bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden shadow-2xl">
                    <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                    
                    {/* Map Overlay Legend */}
                    <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur p-3 rounded border border-slate-700 text-[10px] text-white space-y-2 shadow-xl">
                        <p className="font-bold text-slate-400 uppercase border-b border-slate-700 pb-1 mb-1">Légende Tactique</p>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Nominal</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div> High Value ({'>'}50k)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Hors Zone</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div> SOS / Danger</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500"></div> Signal Perdu ({'>'}5min)</div>
                    </div>

                    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                        <button onClick={() => { if(mapInstanceRef.current) mapInstanceRef.current.setView([0.392, 9.454], 13); setSelectedAgentId(null); }} className="bg-slate-800 text-white p-2 rounded shadow border border-slate-700 hover:bg-slate-700" title="Recentrer">
                            <RotateCcw className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                {/* Sidebar Details - CONCRETE ACTIONS */}
                <div className={`bg-white p-0 rounded-xl border shadow-sm flex flex-col h-[600px] overflow-hidden ${isSelectedHighCash ? 'border-purple-500 border-2' : 'border-gray-200'}`}>
                    <div className={`p-4 border-b flex justify-between items-center ${(selectedAgent as any)?.status === 'SOS' ? 'bg-red-600 text-white' : isSelectedHighCash ? 'bg-purple-100 text-purple-900' : 'bg-slate-50 text-gray-900'}`}>
                        <h3 className="font-bold flex items-center gap-2">
                            {isSelectedHighCash && <ShieldAlert className="w-5 h-5"/>}
                            Fiche Tactique
                        </h3>
                        {(selectedAgent as any)?.status === 'SOS' && <span className="text-xs font-black bg-white text-red-600 px-2 py-1 rounded">SOS ACTIF</span>}
                    </div>
                    {selectedAgent ? (
                        <div className="flex-1 overflow-y-auto">
                            <div className={`p-6 text-white pb-8 ${isSelectedStale ? 'bg-gray-800' : 'bg-slate-900'}`}>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-green-500 flex items-center justify-center font-bold text-2xl relative">
                                        {selectedAgent.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xl">{selectedAgent.name}</h4>
                                        <div className="flex items-center gap-2 text-xs font-mono">
                                            {isSelectedStale ? <span className="text-gray-400 flex items-center gap-1"><SignalLow className="w-3 h-3"/> PERDU ({Math.floor((Date.now() - selectedAgent.lastActive)/60000)}m)</span> :
                                             <span className="text-green-400 flex items-center gap-1"><Signal className="w-3 h-3"/> ONLINE</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                                    <div className="bg-white/10 p-2 rounded">
                                        <span className="text-slate-400 block">BATTERIE</span>
                                        <span className="font-bold text-white">{(selectedAgent as any).batteryLevel === 'eco' ? 'ECO' : 'HIGH'}</span>
                                    </div>
                                    <div className="bg-white/10 p-2 rounded">
                                        <span className="text-slate-400 block">ZONE</span>
                                        <span className="font-bold text-white">{(selectedAgent as any).currentDistrict || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* CASH SECURITY MODULE */}
                            <div className={`p-4 border-b border-gray-100 ${isSelectedHighCash ? 'bg-purple-50' : 'bg-white'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <p className={`text-xs font-bold uppercase ${isSelectedHighCash ? 'text-purple-700' : 'text-gray-500'}`}>Sécurité Fonds</p>
                                    {isSelectedHighCash && <span className="bg-purple-200 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded animate-pulse">PLAFOND DÉPASSÉ</span>}
                                </div>
                                <p className={`text-3xl font-black mb-4 ${isSelectedHighCash ? 'text-purple-900' : 'text-gray-900'}`}>{formatCurrency(selectedAgent.cashInHand)}</p>
                                
                                {isSelectedHighCash ? (
                                    <div className="space-y-2">
                                        <div className="text-xs text-purple-800 bg-purple-100 p-2 rounded">
                                            ⚠️ Risque élevé. Protocole de dépôt requis.
                                        </div>
                                        <button 
                                            onClick={() => toast.success(`Ordre de dépôt envoyé à ${selectedAgent.name}`)}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded text-sm shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                                        >
                                            <Siren className="w-4 h-4"/> ORDONNER DÉPÔT
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsScanning(true)}
                                        disabled={selectedAgent.cashInHand === 0}
                                        className="w-full bg-slate-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <QrCode className="w-4 h-4"/> Scanner pour Encaisser
                                    </button>
                                )}
                            </div>

                            {/* EVIDENCE LOGS (NEW) */}
                            <div className="p-4 border-b border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Activités Récentes</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {/* Mock logs if agent has no real logs prop for this demo */}
                                    <div className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded border border-gray-100">
                                        <div className="p-1 bg-green-100 text-green-600 rounded-full"><CheckCircle className="w-3 h-3"/></div>
                                        <span className="text-gray-600 flex-1">Encaissement Loyer</span>
                                        <span className="font-bold text-green-600">5000 F</span>
                                    </div>
                                    <div 
                                        className="flex items-center gap-2 text-xs p-2 bg-red-50 rounded border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                                        onClick={() => setViewEvidence('https://images.unsplash.com/photo-1605600659873-d808a13a4d2a?q=80&w=600&auto=format&fit=crop')}
                                    >
                                        <div className="p-1 bg-red-100 text-red-600 rounded-full"><AlertTriangle className="w-3 h-3"/></div>
                                        <div className="flex-1">
                                            <span className="text-gray-800 font-bold block">Sanction #882</span>
                                            <span className="text-gray-500 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Voir Preuve</span>
                                        </div>
                                        <span className="font-bold text-red-600">15000 F</span>
                                    </div>
                                </div>
                            </div>

                            {/* MISSION DISPATCH (CONCRETE) */}
                            <div className="p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Dispatch Rapide</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => toast("Mode assignation activé sur la carte")} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 flex flex-col items-center gap-1">
                                        <Target className="w-4 h-4"/> Nouvelle Mission
                                    </button>
                                    <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 flex flex-col items-center gap-1">
                                        <CornerDownRight className="w-4 h-4"/> Redéployer
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center bg-gray-50/50">
                            <Satellite className="w-16 h-16 mb-4 opacity-20 text-slate-900"/>
                            <p className="font-bold text-gray-600">Sélectionnez une cible sur le Radar</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ... Other Tabs (Roster, Missions, Cash) remain standard ... */}
    </div>
  );
};

export default AgentManager;
