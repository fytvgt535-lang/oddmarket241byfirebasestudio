
import React, { useMemo, useState, useEffect } from 'react';
import { Market, Stall, Transaction, PredictiveInsight } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity, ShieldAlert, DollarSign, TrendingUp, Users, ArrowUpRight, Brain, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
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

    const runFullPrediction = async () => {
        setIsLoadingIA(true);
        const newInsights: Record<string, PredictiveInsight[]> = {};
        for (const m of markets) {
            const result = await predictMarketTrends(m, transactions.filter(t => t.marketId === m.id), reports);
            newInsights[m.id] = result;
        }
        setInsights(newInsights);
        setIsLoadingIA(false);
    };

    useEffect(() => {
        runFullPrediction();
    }, [markets.length]);

    const marketHealth = useMemo(() => {
        return markets.map(m => {
            const mStalls = stalls.filter(s => s.marketId === m.id);
            const mTx = transactions.filter(t => t.marketId === m.id).sort((a, b) => a.date - b.date);
            
            const occupancy = mStalls.length > 0 ? (mStalls.filter(s => s.status === 'occupied').length / mStalls.length) * 100 : 0;
            const revenue = mTx.reduce((acc, curr) => acc + curr.amount, 0);
            const hygieneIssues = mStalls.filter(s => s.healthStatus !== 'healthy').length;
            const trendData = mTx.slice(-10).map((t) => ({ val: t.amount }));
            const healthScore = Math.max(0, 100 - (hygieneIssues * 5) + (occupancy / 2));
            
            return { ...m, occupancy, revenue, hygieneIssues, healthScore, trendData };
        }).sort((a, b) => b.healthScore - a.healthScore);
    }, [markets, stalls, transactions]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* AI HEADER */}
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative">
                <Brain className="absolute -right-4 -top-4 w-32 h-32 text-blue-500/10"/>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg animate-pulse">
                        <Brain className="w-8 h-8 text-white"/>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Moteur Prédictif Actif</h3>
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">IA Gemini v3 • Analyse Temps-Réel</p>
                    </div>
                </div>
                <button 
                    onClick={runFullPrediction}
                    disabled={isLoadingIA}
                    className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 transition-all border border-white/5"
                >
                    {isLoadingIA ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                    RECALCULER PROJECTIONS
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketHealth.map(m => (
                    <Card key={m.id} className="relative overflow-hidden border-2 transition-all hover:border-blue-400 group bg-white" noPadding>
                        <div className={`h-2 w-full ${m.healthScore > 80 ? 'bg-green-500' : m.healthScore > 50 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                        
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tighter">{m.name}</h3>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Badge variant="neutral" className="text-[9px] uppercase">{m.city}</Badge>
                                        <Badge variant="neutral" className="text-[9px] uppercase">{m.neighborhood}</Badge>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Index</p>
                                    <p className={`text-3xl font-black ${m.healthScore > 80 ? 'text-green-600' : 'text-orange-600'}`}>{Math.round(m.healthScore)}</p>
                                </div>
                            </div>

                            {/* IA INSIGHT FOR THIS MARKET */}
                            {insights[m.id] && insights[m.id].length > 0 && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-fade-in">
                                    <p className="text-[9px] font-black text-blue-600 uppercase mb-2 flex items-center gap-1">
                                        <Brain className="w-3 h-3"/> Projection IA
                                    </p>
                                    <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                        "{insights[m.id][0].recommendation}"
                                    </p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[9px] text-slate-400 font-black uppercase">Risque: {insights[m.id][0].riskLevel}</span>
                                        <span className="text-[9px] text-blue-600 font-black uppercase">Attendu: {formatCurrency(insights[m.id][0].expectedRevenue)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Users className="w-3 h-3"/>
                                        <span className="text-[9px] font-black uppercase">Occupation</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <p className="font-black text-xl text-slate-800">{Math.round(m.occupancy)}%</p>
                                        <ArrowUpRight className="w-4 h-4 text-green-500 mb-1"/>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <DollarSign className="w-3 h-3"/>
                                        <span className="text-[9px] font-black uppercase">Recettes</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <p className="font-black text-lg text-slate-800 leading-none">{formatCurrency(m.revenue)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-16 w-full mb-6 opacity-50 group-hover:opacity-100 transition-opacity">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={m.trendData.length > 0 ? m.trendData : [{val:0}, {val:10}, {val:5}]}>
                                        <Area type="monotone" dataKey="val" stroke={m.healthScore > 80 ? '#22c55e' : '#f97316'} fill={m.healthScore > 80 ? '#f0fdf4' : '#fff7ed'} strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 flex items-center gap-2 font-bold">Alertes Actives</span>
                                    <Badge variant={m.hygieneIssues > 0 ? 'danger' : 'success'}>{m.hygieneIssues}</Badge>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${m.healthScore > 80 ? 'bg-green-500' : 'bg-orange-500'}`} 
                                        style={{ width: `${m.healthScore}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default WarRoom;
