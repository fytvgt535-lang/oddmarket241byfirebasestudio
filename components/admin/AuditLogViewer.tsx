
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Shield, User, Clock, Search, RefreshCw, Loader2, Eye, Activity, Smartphone, Monitor, Globe, Info, Terminal, ScanFace, ArrowRight, FileText } from 'lucide-react';
import { AuditLog, User as UserType } from '../../types';
import { fetchAuditLogs, subscribeToTable } from '../../services/supabaseService';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';
import { t } from '../../services/translations';

interface AuditLogViewerProps {
    users?: UserType[];
    loading?: boolean;
    currentLanguage?: string;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ users = [], loading = false, currentLanguage = 'fr' }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedActorId, setSelectedActorId] = useState<string | 'all'>('all');
  const [isLive, setIsLive] = useState(false);
  
  const [alphaFilter, setAlphaFilter] = useState<string | null>(null);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
        const data = await fetchAuditLogs();
        setLogs(data);
    } catch (e: any) {
        console.error("Erreur chargement logs", e.message || e);
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
          const actor = actors.find(a => a.id === l.actorId);
          const actorName = actor?.name || 'Inconnu';

          const matchesSearch = l.action.toLowerCase().includes(search.toLowerCase()) || l.targetId.includes(search);
          const matchesActor = selectedActorId === 'all' || l.actorId === selectedActorId;
          const matchesAlpha = alphaFilter ? actorName.toUpperCase().startsWith(alphaFilter) : true;

          return matchesSearch && matchesActor && matchesAlpha;
      });
  }, [logs, search, selectedActorId, alphaFilter, actors]);

  const getDeviceIcon = (meta: any) => {
      if (!meta) return <Globe className="w-3 h-3 text-gray-400"/>;
      const device = meta.device || '';
      if (device === 'Mobile' || device === 'Tablette') return <Smartphone className="w-3 h-3 text-purple-500"/>;
      return <Monitor className="w-3 h-3 text-blue-500"/>;
  };

  // --- DIFFERENTIAL RENDERING (THE CORE OF "GOD'S EYE") ---
  const renderDiff = (log: AuditLog) => {
      const newValue = log.newValue || {};
      const oldValue = log.oldValue || {};
      
      const keys = new Set([...Object.keys(newValue), ...Object.keys(oldValue)]);
      const diffKeys = Array.from(keys).filter(k => 
          k !== '_meta' && k !== 'passwordHash' && k !== 'id' && 
          JSON.stringify(newValue[k]) !== JSON.stringify(oldValue[k])
      );

      if (diffKeys.length === 0) {
          // No Diff available or purely new creation
          if (!log.oldValue && log.newValue) {
             const displayKeys = Object.keys(newValue).filter(k => k !== '_meta');
             return (
                 <div className="mt-1 flex flex-wrap gap-1">
                     {displayKeys.slice(0, 3).map(k => (
                         <span key={k} className="text-[10px] bg-green-50 px-2 py-0.5 rounded border border-green-100 text-green-700 font-mono">
                             + {k}: {String(newValue[k]).substring(0, 20)}
                         </span>
                     ))}
                 </div>
             );
          }
          return <span className="text-gray-400 italic text-xs">Pas de modification de valeur détectée.</span>;
      }

      return (
          <div className="mt-2 space-y-1">
              {diffKeys.map(k => (
                  <div key={k} className="flex items-center gap-2 text-xs font-mono bg-slate-50 p-1 rounded border border-slate-200">
                      <span className="font-bold text-slate-500 w-24 truncate">{k}</span>
                      <span className="text-red-500 bg-red-50 px-1 rounded line-through decoration-red-500 opacity-70">
                          {oldValue[k] !== undefined ? String(oldValue[k]).substring(0, 20) : 'N/A'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400"/>
                      <span className="text-green-600 bg-green-50 px-1 rounded font-bold">
                          {newValue[k] !== undefined ? String(newValue[k]).substring(0, 20) : 'Supprimé'}
                      </span>
                  </div>
              ))}
          </div>
      );
  };

  const getHumanReadableAction = (log: AuditLog) => {
      if (log.newValue?.verification_method === 'qr_handshake') {
          return (
              <span className="flex items-center gap-1 text-green-700 font-bold bg-green-50 px-2 py-1 rounded border border-green-200 w-fit">
                  <ScanFace className="w-4 h-4"/>
                  Validation Bi-Latérale (QR Handshake)
              </span>
          );
      }
      if (log.action === 'VIEW_SENSITIVE_DATA') {
          return (
              <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200 w-fit">
                  <Eye className="w-4 h-4"/>
                  Accès Donnée Sensible
              </span>
          );
      }
      return renderDiff(log);
  };

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] animate-fade-in relative">
        
        {/* ALPHABET KIT SIDEBAR */}
        <div className="w-12 shrink-0 flex flex-col gap-1 sticky top-0 h-fit py-4 overflow-y-auto no-scrollbar max-h-full">
            <button 
                onClick={() => setAlphaFilter(null)} 
                className={`w-10 h-10 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${!alphaFilter ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
            >
                ALL
            </button>
            <div className="w-10 h-[1px] bg-gray-200 my-1"></div>
            {alphabet.map(letter => (
                <button
                    key={letter}
                    onClick={() => setAlphaFilter(alphaFilter === letter ? null : letter)}
                    className={`w-10 h-8 rounded-md font-bold text-xs transition-colors ${alphaFilter === letter ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}
                >
                    {letter}
                </button>
            ))}
        </div>

        <div className="flex-1 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <div className="p-2 bg-slate-900 rounded-lg relative overflow-hidden">
                            <Eye className="w-6 h-6 text-white relative z-10"/>
                            {isLive && <div className="absolute inset-0 bg-green-500 opacity-20 animate-pulse"></div>}
                        </div>
                        {t(currentLanguage, 'audit_title')}
                    </h3>
                    <p className="text-sm text-gray-500">{t(currentLanguage, 'audit_subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Input 
                        leftIcon={Search} 
                        placeholder={t(currentLanguage, 'audit_search_placeholder')} 
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
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><User className="w-4 h-4"/> {t(currentLanguage, 'audit_actors')} ({actors.length})</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        <button 
                            onClick={() => setSelectedActorId('all')}
                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${selectedActorId === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                            <span className="font-bold">{t(currentLanguage, 'audit_global_view')}</span>
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
                            <div className="p-2 bg-slate-900 rounded-lg relative overflow-hidden">
                                <Activity className="w-4 h-4 text-white relative z-10"/>
                            </div>
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
                                if (log.action === 'VIEW_SENSITIVE_DATA') borderClass = 'border-l-4 border-l-blue-400 bg-blue-50/20';
                                
                                // Highlight Handshake Logs
                                const isHandshake = log.newValue?.verification_method === 'qr_handshake';
                                if (isHandshake) borderClass = 'border-l-4 border-l-blue-600 ring-1 ring-blue-100 bg-blue-50/30';

                                return (
                                    <div key={log.id} className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${borderClass} relative animate-slide-up hover:shadow-md transition-shadow`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(log.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="text-sm text-gray-700 mt-1">
                                                    <span className="font-bold text-slate-900">{actors.find(a=>a.id===log.actorId)?.name || 'Système'}</span>
                                                    <div className="mt-2">{getHumanReadableAction(log)}</div>
                                                </div>
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
                                                <span className="text-[8px] text-gray-300 font-mono">#{log.id.slice(-6)}</span>
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
    </div>
  );
};

export default AuditLogViewer;
