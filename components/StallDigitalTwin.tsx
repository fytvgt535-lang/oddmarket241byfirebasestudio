
import React, { useState, useMemo } from 'react';
import { X, FileText, Users, Activity, DollarSign, AlertTriangle, Send, MessageSquare, Shield, Calendar, Download, AlertCircle, Phone, Mail, UserCheck, Key, Image as ImageIcon, User, MapPin, Loader2 } from 'lucide-react';
import { Stall, Transaction, StallDocument, StallMessage, StallActivity, StallEmployee } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StallDigitalTwinProps {
  stall: Stall;
  transactions: Transaction[]; // Transactions liées à ce marché ou cet étal
  onClose: () => void;
}

const StallDigitalTwin: React.FC<StallDigitalTwinProps> = ({ stall, transactions, onClose }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'docs' | 'finance' | 'history' | 'comms'>('identity');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<StallMessage[]>(stall.messages || []); // State for direct messages
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Chart Data Preparation for Finance Tab
  const chartData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};
    const today = new Date();
    
    // Initialize for last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthYear = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
      dataMap[monthYear] = 0;
    }

    // Populate with actual transactions
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthYear = txDate.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
      if (dataMap.hasOwnProperty(monthYear)) {
        dataMap[monthYear] += tx.amount;
      }
    });

    return Object.keys(dataMap).map(key => ({
      month: key,
      revenue: dataMap[key]
    })).sort((a, b) => {
        // Sort chronologically for display
        const dateA = new Date(`1 ${a.month}`);
        const dateB = new Date(`1 ${b.month}`);
        return dateA.getTime() - dateB.getTime();
    });
  }, [transactions]);


  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSendingMessage(true);
    try {
        const newMsg: StallMessage = {
            id: `msg-${Date.now()}`,
            direction: 'outbound', // From Admin
            content: newMessage,
            date: Date.now(),
            read: false
        };
        // Simulate API call to send message and update stall
        // In a real app, this would involve a Supabase update for the stall's messages JSONB field
        const updatedMessages = [...messages, newMsg];
        setMessages(updatedMessages); // Optimistic UI update
        // await supabaseService.updateStall(stall.id, { messages: updatedMessages }); // Actual DB call
        setNewMessage('');
        // Also: Trigger a notification to the vendor
        alert(`Message envoyé au vendeur de l'étal ${stall.number} : "${newMsg.content}"`);
    } catch (error) {
        console.error("Failed to send message:", error);
        alert("Erreur lors de l'envoi du message.");
    } finally {
        setIsSendingMessage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-white/20`}>
              {stall.number.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-black">{stall.number}</h3>
              <p className="text-blue-100 text-sm">{stall.occupantName || 'Étal Libre'}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 border-b border-gray-200 shrink-0">
          {[
            { id: 'identity', label: 'Identité', icon: User, color: 'text-blue-600' },
            { id: 'docs', label: 'Documents', icon: FileText, color: 'text-green-600' },
            { id: 'finance', label: 'Finance', icon: DollarSign, color: 'text-purple-600' },
            { id: 'history', label: 'Historique', icon: Activity, color: 'text-orange-600' },
            { id: 'comms', label: 'Comms', icon: MessageSquare, color: 'text-pink-600' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center p-3 text-sm font-bold border-b-2 ${
                activeTab === tab.id ? `${tab.color} border-current bg-white` : 'text-gray-500 border-transparent hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5 mb-1" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity Tab */}
          {activeTab === 'identity' && (
            <div className="animate-fade-in space-y-4">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2"><User className="w-5 h-5 text-blue-600"/> Détails de l'Étal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoCard title="Statut" value={stall.status === 'occupied' ? 'Loué' : 'Libre'} color={stall.status === 'occupied' ? 'green' : 'gray'} icon={UserCheck}/>
                  <InfoCard title="Occupant" value={stall.occupantName || 'N/A'} icon={User}/>
                  <InfoCard title="Téléphone" value={stall.occupantPhone || 'N/A'} icon={Phone}/>
                  <InfoCard title="Type de Produit" value={stall.productType} icon={ImageIcon}/>
                  <InfoCard title="Zone du Marché" value={stall.zone} icon={MapPin}/>
                  <InfoCard title="Loyer Mensuel" value={`${stall.price.toLocaleString()} FCFA`} icon={DollarSign}/>
                  <InfoCard title="Score Conformité" value={`${stall.complianceScore}%`} color={stall.complianceScore > 70 ? 'green' : 'red'} icon={Shield}/>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'docs' && (
            <div className="animate-fade-in space-y-4">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-green-600"/> Documents & Conformité</h4>
              {stall.documents.length === 0 ? (
                <EmptyState message="Aucun document enregistré." icon={FileText}/>
              ) : (
                <div className="space-y-3">
                  {stall.documents.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <div className="animate-fade-in space-y-4">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-purple-600"/> Historique Financier</h4>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Revenus des 6 derniers mois (FCFA)</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                      <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Revenu']} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {transactions.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <h5 className="font-bold text-gray-800 mb-3">Dernières Transactions</h5>
                  <div className="space-y-2">
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{tx.type === 'rent' ? 'Loyer' : tx.type === 'fine' ? 'Amende' : 'Autre'}</span>
                        <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{tx.amount.toLocaleString()} FCFA</span>
                        <span className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="animate-fade-in space-y-4">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-orange-600"/> Journal d'Activités</h4>
              {stall.activityLog.length === 0 ? (
                <EmptyState message="Aucune activité enregistrée pour cet étal." icon={Activity}/>
              ) : (
                <div className="space-y-3">
                  {stall.activityLog.sort((a,b) => b.date - a.date).map(activity => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comms Tab */}
          {activeTab === 'comms' && (
            <div className="animate-fade-in space-y-4 flex flex-col h-full">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-pink-600"/> Messagerie Directe</h4>
              <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-y-auto space-y-3 border border-gray-100">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Aucun message pour cet étal.</p>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-xl shadow-sm ${
                        msg.direction === 'outbound' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 rounded-bl-none'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <span className={`text-[10px] mt-1 block ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'}`}>
                          {new Date(msg.date).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 shrink-0 pt-2">
                <input
                  type="text"
                  placeholder="Envoyer un message au vendeur..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                  disabled={isSendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                  className="bg-pink-600 text-white p-3 rounded-xl hover:bg-pink-700 disabled:bg-gray-300"
                >
                  {isSendingMessage ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StallDigitalTwin;


// --- Helper Components ---
interface InfoCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'gray';
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, icon: Icon, color = 'blue' }) => (
  <div className={`bg-${color}-50 p-4 rounded-xl border border-${color}-100 flex items-center gap-3`}>
    <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
      {Icon && <Icon className="w-5 h-5" />}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase">{title}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

interface DocumentCardProps {
  doc: StallDocument;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc }) => (
  <div className={`p-3 rounded-xl border flex items-center justify-between ${
    doc.status === 'expired' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
  }`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${doc.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div>
        <p className="font-bold text-gray-800 text-sm">{doc.type.replace('_', ' ').toUpperCase()}</p>
        <p className="text-xs text-gray-500">Expire le: {new Date(doc.expiryDate).toLocaleDateString()}</p>
      </div>
    </div>
    {doc.status === 'expired' ? (
      <span className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Expiré</span>
    ) : (
      <span className="text-xs font-bold text-green-600">Valide</span>
    )}
  </div>
);

interface ActivityCardProps {
  activity: StallActivity;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => (
  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
    <div className="p-2 rounded-full bg-gray-100 text-gray-600">
      {activity.type === 'payment' && <DollarSign className="w-5 h-5"/>}
      {activity.type === 'infraction' && <AlertTriangle className="w-5 h-5"/>}
      {activity.type === 'maintenance' && <Activity className="w-5 h-5"/>}
      {activity.type === 'message' && <MessageSquare className="w-5 h-5"/>}
      {(activity.type === 'document_update' || activity.type === 'inspection') && <FileText className="w-5 h-5"/>}
    </div>
    <div>
      <p className="font-bold text-gray-800 text-sm">{activity.description}</p>
      <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(activity.date).toLocaleDateString()}</p>
    </div>
  </div>
);

interface EmptyStateProps {
    message: string;
    icon: React.ElementType;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon: Icon }) => (
    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            {Icon && <Icon className="w-8 h-8"/>}
        </div>
        <p className="text-gray-500 font-medium">{message}</p>
    </div>
);
