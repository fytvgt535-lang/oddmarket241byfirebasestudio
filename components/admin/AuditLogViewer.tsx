
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Shield, User, Clock, Search, RefreshCw, Loader2, Eye, Activity, Database, AlertCircle, Smartphone, Monitor, Globe, Info, Terminal } from 'lucide-react';
import { AuditLog, User as UserType } from '../../types';
import { fetchAuditLogs, subscribeToTable } from '../../services/supabaseService';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';

interface AuditLogViewerProps {
    users?: UserType[];
    loading?: boolean;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ users = [], loading = false }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedActorId, setSelectedActorId] = useState<string | 'all'>('all');
  const [isLive, setIsLive] = useState(false);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
        const data = await fetchAuditLogs();
        setLogs(data);
    } catch (e) {
        console.error("Erreur chargement logs", e);
    } finally {
        if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    
    const sub1 = subscribeToTable('audit_logs', (payload) => {
        if (payload.eventType === 'INSERT') {
            toast("Nouvelle activité détectée", { icon: '👁️', position: 'bottom-right', style: { background: '#000', color: '#fff' } });
            setIsLive(true);
            loadLogs(true);
        }
    }, 'audit_viewer_unique_channel');

    return () => {
        sub1.unsubscribe();
    };
  }, [loadLogs]);

  useEffect(() => {
      if (isLive) {
          const t = setTimeout(() => setIsLive(false), 2000);
          return () => clearTimeout(t);
      }
  }, [isLive]);

  const actors = useMemo(() => {
      const actorIds = Array.from(new Set(logs.map(l => l.actorId)));
      return actorIds.map(id => {
          const user = users.find(u => u.id === id);
          const logEntry = logs.find(l => l.actorId === id);
          return { 
              id, 
              name: user ? user.name : (logEntry?.actorName || 'Utilisateur Inconnu'), 
              role: user?.role,
              photoUrl: user?.photoUrl
          };
      });
  }, [logs, users]);

  const filteredLogs = useMemo(() => {
      return logs.filter(l => {
          const matchesSearch = l.action.toLowerCase().includes(search.toLowerCase()) || l.targetId.includes(search);
          const matchesActor = selectedActorId === 'all' || l.actorId === selectedActorId;
          return matchesSearch && matchesActor;
      });
  }, [logs, search, selectedActorId]);

  const getDeviceIcon = (meta: any) => {
      if (!meta) return <Globe className="w-3 h-3 text-gray-400"/>;
      const device = meta.device || '';
      if (device === 'Mobile' || device === 'Tablette') return <Smartphone className="w-3 h-3 text-purple-500"/>;
      return <Monitor className="w-3 h-3 text-blue-500"/>;
  };

  const getHumanReadableDiff = (log: AuditLog) => {
      if (log.action.includes('LOGIN')) return "Connexion sécurisée au portail.";
      if (log.action.includes('LOGOUT')) return "Fermeture de session.";
      
      const newVal = (log.newValue as any) || {};
      const displayKeys = Object.keys(newVal).filter(k => k !== '_meta' && k !== 'passwordHash' && k !== 'id');
      
      if (displayKeys.length === 0) return log.reason || "Action système.";
      
      return (
          <div className="flex flex-wrap gap-1 mt-1">
              {displayKeys.map(k => (
                  <span key={k} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono">
                      {k}: {String(newVal[k]).substring(0, 30)}
                  </span>
              ))}
          </div>
      );
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <div className="p-2 bg-slate-900 rounded-lg relative overflow-hidden">
                        <Eye className="w-6 h-6 text-white relative z-10"/>
                        {isLive && <div className="absolute inset-0 bg-green-500 opacity-20 animate-pulse"></div>}
                    </div>
                    L'Oeil de Dieu
                </h3>
                <p className="text-sm text-gray-500">Journal d'Audit & Preuves Numériques</p>
            </div>
            <div className="flex gap-2">
                <Input 
                    leftIcon={Search} 
                    placeholder="Rechercher IP, Action..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="w-64 bg-gray-50 border-transparent focus:bg-white"
                />
                <button onClick={() => loadLogs(false)} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}/>
                </button>
            </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
            <Card className="w-1/3 flex flex-col bg-white border border-gray-200 shadow-sm" noPadding>
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2"><User className="w-4 h-4"/> Acteurs Identifiés ({actors.length})</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    <button 
                        onClick={() => setSelectedActorId('all')}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${selectedActorId === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                        <span className="font-bold">Vue Globale</span>
                        <Activity className="w-4 h-4"/>
                    </button>
                    {actors.map(actor => (
                        <button 
                            key={actor.id} 
                            onClick={() => setSelectedActorId(actor.id)}
                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${selectedActorId === actor.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-gray-700'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden ${selectedActorId === actor.id ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}`}>
                                {actor.photoUrl ? <img src={actor.photoUrl} className="w-full h-full object-cover"/> : actor.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-sm truncate">{actor.name}</p>
                                <p className={`text-[10px] opacity-80 ${selectedActorId === actor.id ? 'text-blue-100' : 'text-gray-400'}`}>{actor.role || 'Utilisateur'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            <Card className="flex-1 flex flex-col bg-slate-50 border border-gray-200 shadow-inner relative overflow-hidden" noPadding>
                {(isLoading || loading) && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-800"/></div>}
                
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm flex justify-between items-center">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-blue-600"/>
                        Flux d'Activité
                    </h4>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">{filteredLogs.length} events</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Shield className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                            <p>Aucune trace trouvée pour ce filtre.</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => {
                            const meta = log.metadata || {};
                            
                            let borderClass = 'border-l-4 border-l-gray-300';
                            if (log.action.includes('LOGIN')) borderClass = 'border-l-4 border-l-green-500';
                            if (log.action.includes('DELETE')) borderClass = 'border-l-4 border-l-red-500';
                            if (log.action.includes('UPDATE')) borderClass = 'border-l-4 border-l-orange-500';

                            return (
                                <div key={log.id} className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${borderClass} relative animate-slide-up hover:shadow-md transition-shadow`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(log.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1">
                                                <span className="font-bold text-slate-900">{actors.find(a=>a.id===log.actorId)?.name || 'Système'}</span> : {getHumanReadableDiff(log)}
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-1 ml-4">
                                            {meta.device && (
                                                <div className="flex items-center gap-1 text-[10px] bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-indigo-600 font-bold">
                                                    {getDeviceIcon(meta)}
                                                    <span>{meta.device} • {meta.os}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded">
                                                <Globe className="w-3 h-3"/> {meta.ip || '127.0.0.1'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {log.reason && (
                                        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-500 italic">
                                            <Info className="w-3 h-3 text-blue-400"/>
                                            Note: {log.reason}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>
        </div>
    </div>
  );
};

export default AuditLogViewer;
