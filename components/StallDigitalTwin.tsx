
import React, { useState } from 'react';
import { X, FileText, Users, Activity, DollarSign, AlertTriangle, Send, MessageSquare, Shield, Calendar, Download, AlertCircle } from 'lucide-react';
import { Stall, Transaction, StallDocument, StallMessage } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StallDigitalTwinProps {
  stall: Stall;
  transactions: Transaction[];
  onClose: () => void;
}

const StallDigitalTwin: React.FC<StallDigitalTwinProps> = ({ stall, transactions, onClose }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'docs' | 'finance' | 'history' | 'comms'>('identity');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<StallMessage[]>(stall.messages || []);

  // Chart Data Preparation
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('fr-FR', { month: 'short' });
  }).reverse();

  const chartData = last6Months.map(month => ({
    name: month,
    amount: transactions
      .filter(t => new Date(t.date).toLocaleString('fr-FR', { month: 'short' }) === month)
      .reduce((acc, curr) => acc + curr.amount, 0)
  }));

  const getDocStatusColor = (status: StallDocument['status']) => {
    switch(status) {
      case 'valid': return 'text-green-600 bg-green-50 border-green-200';
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      case 'missing': return 'text-gray-500 bg-gray-50 border-gray-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  const getDocLabel = (type: StallDocument['type']) => {
    switch(type) {
      case 'lease_agreement': return 'Contrat de Bail';
      case 'insurance': return 'Assurance Incendie';
      case 'hygiene_cert': return 'Certificat Hygiène';
      case 'tax_clearance': return 'Quitus Fiscal';
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const msg: StallMessage = {
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      content: newMessage,
      date: Date.now(),
      read: true
    };
    
    setMessages([...messages, msg]);
    setNewMessage('');
    // In a real app, this would trigger an API call to send SMS
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-fade-in backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
        
        {/* Header Section */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">Étal {stall.number}</h2>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                  ${stall.status === 'occupied' ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {stall.status === 'occupied' ? 'Occupé' : 'Vacant'}
                </span>
                {stall.healthStatus === 'critical' && (
                  <span className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded text-xs font-bold uppercase animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Action Requise
                  </span>
                )}
              </div>
              <p className="text-slate-400 mt-1">{stall.zone} • {stall.size} • {stall.surfaceArea}m²</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
                <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20">
                    <AlertCircle className="w-4 h-4" /> Signaler
                </button>
            </div>
          </div>

          {/* AI Compliance Score */}
          <div className="flex items-center justify-between bg-white/10 p-3 rounded-lg border border-white/10">
              <div className="flex gap-4">
                  <div>
                      <span className="text-xs text-slate-400 block">Score IA</span>
                      <span className={`text-xl font-bold ${stall.complianceScore > 80 ? 'text-green-400' : stall.complianceScore > 50 ? 'text-orange-400' : 'text-red-400'}`}>
                        {stall.complianceScore}/100
                      </span>
                  </div>
                  <div className="w-px bg-white/20 h-full"></div>
                  <div>
                      <span className="text-xs text-slate-400 block">Dette</span>
                      <span className="text-xl font-bold text-white">0 FCFA</span>
                  </div>
              </div>
              {stall.healthStatus !== 'healthy' && (
                  <div className="text-xs text-orange-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Attention: Dossier Incomplet
                  </div>
              )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 mt-6 border-b border-slate-700 overflow-x-auto">
            {[
              { id: 'identity', label: 'Identité', icon: Users },
              { id: 'comms', label: 'Messagerie', icon: MessageSquare },
              { id: 'docs', label: 'Documents', icon: FileText },
              { id: 'finance', label: 'Finances', icon: DollarSign },
              { id: 'history', label: 'Journal', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap 
                  ${activeTab === tab.id ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 bg-gray-50 flex-1 overflow-y-auto">
          
          {/* TAB: IDENTITY */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600"/> Titulaire Légal
                </h3>
                {stall.occupantName ? (
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
                      {stall.occupantName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{stall.occupantName}</p>
                      <p className="text-gray-500 font-mono">{stall.occupantPhone || 'N/A'}</p>
                      <div className="mt-2 flex gap-2">
                         <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">Contrat Actif</span>
                         {stall.isPriority && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold border border-purple-100">Vulnérable</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 italic">Aucun titulaire assigné.</div>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600"/> Personnel sur Place
                </h3>
                {stall.employees.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {stall.employees.map(emp => (
                      <div key={emp.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${emp.isRegistered ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">{emp.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{emp.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-gray-500">{emp.phone}</p>
                          {!emp.isRegistered && <span className="text-[10px] text-red-600 font-bold">Badge Manquant</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun employé déclaré.</p>
                )}
              </div>
            </div>
          )}

           {/* TAB: MESSAGING (DIRECT COMMS) */}
           {activeTab === 'comms' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Fil de Discussion</h3>
                    <span className="text-xs text-gray-500">Avec {stall.occupantName} ({stall.occupantPhone})</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                            <p>Aucun message échangé.</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.direction === 'outbound' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {new Date(msg.date).toLocaleDateString()} {new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex gap-2">
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrire un message..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg">
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
               {stall.documents.map(doc => (
                 <div key={doc.id} className={`flex items-center justify-between p-4 bg-white rounded-xl border-l-4 shadow-sm ${getDocStatusColor(doc.status)}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <FileText className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{getDocLabel(doc.type)}</h4>
                        <div className="flex items-center gap-2 text-sm mt-1">
                           <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full border bg-white/50`}>{doc.status}</span>
                           <span className="text-gray-500 flex items-center gap-1">
                             <Calendar className="w-3 h-3" /> Exp: {new Date(doc.expiryDate).toLocaleDateString()}
                           </span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                 </div>
               ))}
               
               <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                 <h4 className="font-bold text-blue-800 mb-2">Ajouter un Document</h4>
                 <p className="text-sm text-blue-600 mb-4">Uploadez un scan (PDF/JPG) pour mettre à jour le dossier.</p>
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700">Scanner / Uploader</button>
               </div>
            </div>
          )}

          {/* TAB: FINANCE */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Tendance des Paiements (6 Mois)</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} />
                       <YAxis axisLine={false} tickLine={false} />
                       <Tooltip cursor={{fill: '#f3f4f6'}} />
                       <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                   <p className="text-sm text-gray-500">Loyer Actuel</p>
                   <p className="text-2xl font-bold text-gray-800">{stall.price.toLocaleString()} FCFA</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                   <p className="text-sm text-gray-500">Dernier Paiement</p>
                   <p className={`text-xl font-bold ${!stall.lastPaymentDate ? 'text-red-500' : 'text-green-600'}`}>
                     {stall.lastPaymentDate ? new Date(stall.lastPaymentDate).toLocaleDateString() : 'Jamais'}
                   </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50">
                 <h3 className="font-bold text-gray-800">Journal d'Activité (Audit Log)</h3>
               </div>
               <div className="divide-y divide-gray-100">
                 {stall.activityLog.map(log => (
                   <div key={log.id} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center">
                        <div className="h-full w-px bg-gray-200 mb-1"></div>
                        <div className={`w-3 h-3 rounded-full 
                          ${log.type === 'infraction' ? 'bg-red-500' : log.type === 'payment' ? 'bg-green-500' : 'bg-blue-500'}
                        `}></div>
                        <div className="h-full w-px bg-gray-200 mt-1"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-gray-800 text-sm capitalize">{log.type}</p>
                          <span className="text-xs text-gray-400">{new Date(log.date).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                        {log.agentName && (
                          <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                            <Shield className="w-3 h-3"/> Agent: {log.agentName}
                          </p>
                        )}
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StallDigitalTwin;
