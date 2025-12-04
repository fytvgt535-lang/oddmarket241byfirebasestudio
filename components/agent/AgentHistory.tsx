
import React from 'react';
import { AgentLog } from '../../types';
import { Card } from '../ui/Card';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/coreUtils';

interface AgentHistoryProps {
  logs: AgentLog[];
}

const AgentHistory: React.FC<AgentHistoryProps> = ({ logs }) => {
  return (
    <Card noPadding className="h-full bg-gray-50 border-none shadow-none">
        <div className="p-4 sticky top-0 bg-gray-50 z-10">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Activité Récente</h3>
        </div>
        <div className="space-y-1 px-4 pb-20">
            {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">Aucune activité ce jour.</div>
            ) : logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm">
                    <div className={`p-2 rounded-full ${
                        log.actionType === 'payment_collected' ? 'bg-green-100 text-green-600' :
                        log.actionType === 'sanction_issued' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {log.actionType === 'payment_collected' && <CheckCircle className="w-5 h-5"/>}
                        {log.actionType === 'sanction_issued' && <AlertTriangle className="w-5 h-5"/>}
                        {log.actionType.includes('shift') && <Clock className="w-5 h-5"/>}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">{log.details}</p>
                        <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                    {log.amount && (
                        <span className={`font-black ${log.actionType === 'payment_collected' ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(log.amount)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    </Card>
  );
};

export default AgentHistory;
