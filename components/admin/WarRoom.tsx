
import React, { useMemo, useState, useEffect } from 'react';
import { Market, Stall, Transaction, PredictiveInsight } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Activity, ShieldAlert, DollarSign, TrendingUp, Users, ArrowUpRight, Brain, Loader2, RefreshCw, Zap, Landmark, Bell } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { predictMarketTrends } from '../../services/geminiService';

interface WarRoomProps {
    markets: Market[];
    stalls: Stall[];
    transactions: Transaction[];
    reports?: any[];
}

const WarRoom: React.FC<WarRoomProps> = ({ markets, stalls, transactions, reports = [] }) => {
    const [insights, setInsights] = useState<Record<string, PredictiveInsight[]>>({});
    const [isLoadingIA, setIsLoadingIA] = useState(false);
    const [liveTicker, setLiveTicker] = useState<Transaction[]>([]);

    const runFullPrediction = async () => {
        if (markets.length === 0) return;
        setIsLoadingIA(true);
        const newInsights: Record<string, PredictiveInsight[]> = {};
        for (const m of markets) {
            try {
                const result = await predictMarketTrends(m, transactions.filter(t => t.marketId === m.id), reports);
                newInsights[m.id] = result;
            } catch(e) {
                // Silent fail for UI stability
                console.warn("Prediction failed for market", m.id);
            }
        }
        setInsights(newInsights);
        setIsLoadingIA(false);
    };

    useEffect(() => {
        runFullPrediction();
        setLiveTicker(transactions.slice(0, 5));
    }, [markets.length, transactions.length]);

    const marketHealth = useMemo(() => {
        return markets.map(m => {
            const mStalls = stalls.filter(s => s.marketId === m.id);
            const mTx = transactions.filter(t => t.marketId === m.id).sort((a, b) => a.date - b.date);
            
            const occupancy = mStalls.length > 0 ? (mStalls.filter(s => s.status === 'occupied').length / mStalls.length) * 100 : 0;
            const revenue = mTx.reduce((acc, curr) => acc + curr.amount, 0);
            const hygieneIssues = mStalls.filter(s => s.healthStatus !== 'healthy').length;
            const trendData = mTx.slice(-10).map((t) => ({ val: t.amount, time: new Date(t.date).toLocaleTimeString() }));
            const healthScore = Math.max(0, 100 - (hygieneIssues * 8) + (occupancy / 4));
            
            return { ...m, occupancy, revenue, hygieneIssues, healthScore, trendData };
        }).sort((a, b) => b.healthScore - a.healthScore);
    }, [markets, stalls, transactions]);

    const globalRevenue = useMemo(() => transactions.reduce((a, b) => a + b.amount, 0), [transactions]);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* TOP BAR KPI DENSITY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-none p-6 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="w-20 h-20"/></div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Recettes Centrales</p>
                    <h4 className="text-4xl font-black tracking-tighter">{formatCurrency(globalRevenue)}</h4>
                    <div className="flex items-center gap-1 text-xs text-green-400 font-bold mt-2">
                        <TrendingUp className="w-4 h-4"/> +12.4% <span className="text-slate-500 font-normal ml-1">vs hier</span>
                    </div>
                </Card>
                <Card className="bg-slate-900 border-none p-6 text-white shadow-2xl">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Occupation Globale</p>
                    <h4 className="text-4xl font-black tracking-tighter">
                        {Math.round(stalls.length > 0 ? (stalls.filter(s=>s.status==='occupied').length/stalls.length)*100 : 0)}%
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-bold mt-2">
                        <Users className="w-4 h-4"/> {stalls.filter(s=>s.status==='occupied').length} marchands actifs
                    </div>
                </Card>
                <Card className="bg-slate-900 border-none p-6 text-white shadow-2xl relative">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Alertes Système</p>
                            <h4 className="text-4xl font-black tracking-tighter">{reports.length}</h4>
                        </div>
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-500 animate-pulse">
                            <Bell className="w-5 h-5"/>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tight">3 Signalements prioritaires</p>
                </Card>
                <Card className="bg-blue-600 border-none p-6 text-white shadow-2xl flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Intelligence Live</p>
                        <h4 className="text-xl font-black tracking-tighter leading-tight">Gemini v3 Pilotage</h4>
                    </div>
                    <Button 
                        onClick={runFullPrediction}
                        className="bg-white text-blue-600 font-black h-10 w-full rounded-xl text-[10px] uppercase border-none"
                        isLoading={isLoadingIA}
                    >
                        Sync IA
                    </Button>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LISTE DES MARCHÉS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-black text-slate-900 uppercase tracking-tighter text-2xl flex items-center gap-3">
                            <Landmark className="w-6 h-6 text-blue-600"/> Dashboard Territorial
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Données Live</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {marketHealth.map(m => (
                            <Card key={m.id} className="relative overflow-hidden border-4 transition-all hover:border-blue-500 group bg-white rounded-[2.5rem] shadow-sm" noPadding>
                                <div className={`h-2 w-full ${m.healthScore > 80 ? 'bg-green-500' : m.healthScore > 50 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                                
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tighter leading-none">{m.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">{m.city} • {m.neighborhood}</p>
                                        </div>
                                        <div className={`p-3 rounded-2xl ${m.healthScore > 80 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'} flex flex-col items-center min-w-[60px]`}>
                                            <span className="text-xs font-black">PULSE</span>
                                            <span className="text-xl font-black">{Math.round(m.healthScore)}</span>
                                        </div>
                                    </div>

                                    {/* IA PROJECTED REVENUE */}
                                    {insights[m.id] && insights[m.id].length > 0 && (
                                        <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl animate-fade-in relative overflow-hidden border-l-4 border-blue-400">
                                            <Brain className="absolute -right-2 -bottom-2 w-12 h-12 opacity-10"/>
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Brain className="w-3 h-3"/> Projection Gemini
                                                </p>
                                                <span className="text-[9px] font-mono text-blue-300">ATTENDU: {formatCurrency(insights[m.id][0].expectedRevenue)}</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">
                                                "{insights[m.id][0].recommendation}"
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Occupation</span>
                                            <p className="font-black text-2xl text-slate-800">{Math.round(m.occupancy)}%</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Collecte</span>
                                            <p className="font-black text-lg text-slate-800 leading-none">{formatCurrency(m.revenue)}</p>
                                        </div>
                                    </div>

                                    <div className="h-16 w-full mb-4 group-hover:scale-105 transition-transform">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={m.trendData.length > 0 ? m.trendData : [{val:0}, {val:10}, {val:5}]}>
                                                <Tooltip content={({active, payload}) => {
                                                    if(active && payload?.length) return <div className="bg-slate-900 text-white p-2 rounded text-[10px] font-bold shadow-xl border border-white/10">{formatCurrency(payload[0].value as number)}</div>;
                                                    return null;
                                                }}/>
                                                <Area type="monotone" dataKey="val" stroke={m.healthScore > 80 ? '#22c55e' : '#f97316'} fill={m.healthScore > 80 ? '#f0fdf4' : '#fff7ed'} strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* LIVE TICKER / RECENT ACTIVITY */}
                <div className="space-y-6">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter text-2xl px-2">Ticker Réseau</h3>
                    <div className="bg-slate-950 rounded-[3rem] p-8 border border-slate-800 shadow-2xl min-h-[600px] flex flex-col">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-900/50">
                                <Zap className="w-6 h-6 animate-pulse"/>
                            </div>
                            <div>
                                <h4 className="font-black text-white text-sm uppercase tracking-widest">Flux Transactions</h4>
                                <p className="text-[9px] text-green-500 font-bold uppercase animate-pulse">Temps Réel Actif</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {liveTicker.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-20">
                                    <Activity className="w-12 h-12 text-white mb-4 animate-bounce"/>
                                    <p className="text-white font-black text-xs uppercase">Initialisation...</p>
                                </div>
                            ) : liveTicker.map(tx => (
                                <div key={tx.id} className="group relative bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] border border-white/5 transition-all animate-slide-up">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-[10px]">
                                                {tx.stallNumber}
                                            </div>
                                            <p className="text-xs font-black text-white uppercase truncate max-w-[100px]">{tx.collectedByName || 'Agent'}</p>
                                        </div>
                                        <Badge className="bg-green-600/10 text-green-400 border-none text-[8px] uppercase">{tx.provider}</Badge>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(tx.amount)}</p>
                                        <span className="text-[10px] text-slate-500 font-mono">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                            <button className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                                Consulter le Grand Livre &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarRoom;
