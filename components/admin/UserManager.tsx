
import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, Ban, CheckCircle, Clock, X, Users, Activity, Lock, AlertTriangle, Building2, Tag, ArrowUpDown, Filter } from 'lucide-react';
import { User, AppRole, Stall, Sanction, Market, ProductType } from '../../types';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import SecureActionModal from '../ui/SecureActionModal';
import { supabase } from '../../supabaseClient';
import { calculateStallDebt } from '../../utils/coreUtils';

interface UserManagerProps {
  users: User[];
  stalls: Stall[];
  markets: Market[];
  sanctions: Sanction[];
  loading?: boolean;
  onUpdateUserStatus: (userId: string, updates: Partial<User>) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, stalls, markets, sanctions, loading, onUpdateUserStatus }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'alpha' | 'role' | 'date'>('alpha');
  
  const [selectedUserForKYC, setSelectedUserForKYC] = useState<User | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  const [pendingAction, setPendingAction] = useState<{ userId: string, updates: Partial<User> } | null>(null);
  const [isSecureModalOpen, setIsSecureModalOpen] = useState(false);

  React.useEffect(() => {
      supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email || ''));
  }, []);

  const filteredUsers = useMemo(() => {
      let filtered = users.filter(u => {
          const userStall = stalls.find(s => s.occupantId === u.id);
          const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
          const matchRole = roleFilter === 'all' || u.role === roleFilter;
          const matchMarket = marketFilter === 'all' || (u.marketId === marketFilter) || (userStall?.marketId === marketFilter);
          return matchSearch && matchRole && matchMarket;
      });

      // SORTING LOGIC
      return filtered.sort((a, b) => {
          if (sortBy === 'alpha') return a.name.localeCompare(b.name);
          if (sortBy === 'role') return a.role.localeCompare(b.role);
          if (sortBy === 'date') return (b.createdAt || 0) - (a.createdAt || 0);
          return 0;
      });
  }, [users, stalls, search, roleFilter, marketFilter, sortBy]);

  const initiateStatusUpdate = (userId: string, updates: Partial<User>) => {
      setPendingAction({ userId, updates });
      setIsSecureModalOpen(true);
  };

  const confirmStatusUpdate = async () => {
      if (pendingAction) {
          await onUpdateUserStatus(pendingAction.userId, pendingAction.updates);
          toast.success("Action validée et journalisée.");
          if (selectedUserForKYC?.id === pendingAction.userId) setSelectedUserForKYC(null);
      }
  };

  const isOnline = (user: User) => {
      if (user.email === currentUserEmail) return true;
      if (!user.lastSeenAt) return false;
      return (Date.now() - user.lastSeenAt) < 5 * 60 * 1000; 
  };

  const getLastSeenText = (user: User) => {
      if (user.email === currentUserEmail) return 'En ligne';
      if (!user.lastSeenAt) return 'Jamais';
      const diff = Date.now() - user.lastSeenAt;
      if (diff < 60000) return 'À l\'instant';
      if (diff < 3600000) return `Il y a ${Math.floor(diff/60000)} min`;
      return new Date(user.lastSeenAt).toLocaleDateString();
  };

  const getUserStatusDetails = (user: User) => {
      const userStall = stalls.find(s => s.occupantId === user.id);
      const { totalDebt } = calculateStallDebt(userStall, sanctions);
      const online = isOnline(user);
      
      if (user.isBanned) return { color: 'bg-red-600', pulse: false, text: 'Banni', border: 'border-red-200' };
      if (totalDebt > 0) return { color: 'bg-orange-500', pulse: true, text: `Dette: ${totalDebt} F`, border: 'border-orange-200' };
      if (online) return { color: 'bg-green-500', pulse: true, text: 'En ligne', border: 'border-white' };

      return { color: 'bg-gray-300', pulse: false, text: getLastSeenText(user), border: 'border-white' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <SecureActionModal
            isOpen={isSecureModalOpen}
            onClose={() => setIsSecureModalOpen(false)}
            onConfirm={confirmStatusUpdate}
            title="Validation Requise"
            description="Modification de compte utilisateur. Cette action est sensible."
            email={currentUserEmail}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3 border-blue-200 bg-blue-50">
                <div className="p-2 bg-blue-200 text-blue-700 rounded-full"><Users className="w-5 h-5"/></div>
                <div><p className="text-xs font-bold text-blue-800 uppercase">Comptes</p><h3 className="text-2xl font-black text-blue-900">{users.length}</h3></div>
            </Card>
            <Card className="p-4 flex items-center gap-3 border-green-200 bg-green-50">
                <div className="p-2 bg-green-200 text-green-700 rounded-full"><CheckCircle className="w-5 h-5"/></div>
                <div><p className="text-xs font-bold text-green-800 uppercase">Actifs</p><h3 className="text-2xl font-black text-green-900">{users.filter(u=>!u.isBanned).length}</h3></div>
            </Card>
            <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50">
                <div className="p-2 bg-red-200 text-red-700 rounded-full"><Ban className="w-5 h-5"/></div>
                <div><p className="text-xs font-bold text-red-800 uppercase">Bannis</p><h3 className="text-2xl font-black text-red-900">{users.filter(u=>u.isBanned).length}</h3></div>
            </Card>
        </div>

        <Card className="p-4 bg-gray-50 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Recherche</label>
                    <Input leftIcon={Search} placeholder="Nom, Email..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Rôle</label>
                    <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="bg-white">
                        <option value="all">Tous Rôles</option>
                        <option value="vendor">Vendeur</option>
                        <option value="agent">Agent</option>
                        <option value="admin">Admin</option>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Marché</label>
                    <Select value={marketFilter} onChange={e => setMarketFilter(e.target.value)} className="bg-white">
                        <option value="all">Tous Marchés</option>
                        {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Trier par</label>
                    <div className="flex bg-white rounded-xl border border-gray-200 p-1">
                        <button onClick={() => setSortBy('alpha')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sortBy === 'alpha' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>A-Z</button>
                        <button onClick={() => setSortBy('role')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sortBy === 'role' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Rôle</button>
                        <button onClick={() => setSortBy('date')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sortBy === 'date' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Récent</button>
                    </div>
                </div>
            </div>
        </Card>

        <Card className="overflow-hidden">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                    <tr>
                        <th className="p-4">Utilisateur</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4">Rôle & Lieu</th>
                        <th className="p-4">KYC</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                        const status = getUserStatusDetails(user);
                        const userStall = stalls.find(s => s.occupantId === user.id);
                        const userMarket = markets.find(m => m.id === (user.marketId || userStall?.marketId));

                        return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${user.role === 'admin' ? 'bg-slate-800' : user.role === 'vendor' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${status.color} ${status.pulse ? 'animate-pulse' : ''}`}></div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <Badge className={`${status.color.replace('bg-', 'text-').replace('500', '700').replace('600', '800')} bg-opacity-20 border-transparent`}>
                                    {status.text}
                                </Badge>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 capitalize">{user.role}</span>
                                    {userMarket ? <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3"/> {userMarket.name}</span> : <span className="text-xs text-gray-400 italic">Non assigné</span>}
                                </div>
                            </td>
                            <td className="p-4">
                                {user.kycStatus === 'verified' ? <Badge variant="success"><ShieldCheck className="w-3 h-3 mr-1"/> Validé</Badge> :
                                 user.kycStatus === 'pending' ? <Button size="sm" variant="outline" onClick={() => setSelectedUserForKYC(user)} className="text-orange-600 border-orange-200 bg-orange-50 h-8"><Clock className="w-3 h-3 mr-1"/> En Attente</Button> : <span className="text-gray-400 text-xs italic">Non Requis</span>}
                            </td>
                            <td className="p-4 text-right">
                                {user.isBanned ? 
                                    <button onClick={() => initiateStatusUpdate(user.id, { isBanned: false })} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded text-xs font-bold border border-green-200">Débannir</button> : 
                                    <button onClick={() => initiateStatusUpdate(user.id, { isBanned: true })} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold border border-red-200">Bannir</button>
                                }
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </Card>

        {/* KYC Modal remains same... */}
        {selectedUserForKYC && selectedUserForKYC.kycDocument && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
                    <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Validation d'Identité</h3>
                        <button onClick={() => setSelectedUserForKYC(null)}><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6">
                        <div className="bg-gray-100 rounded-xl p-2 mb-6 border-2 border-dashed border-gray-300">
                            <img src={selectedUserForKYC.kycDocument.fileUrl} className="w-full h-64 object-contain rounded-lg" alt="ID Document"/>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => initiateStatusUpdate(selectedUserForKYC.id, { kycStatus: 'rejected' })} className="flex-1 text-red-600 border-red-200 hover:bg-red-50">Rejeter</Button>
                            <Button variant="primary" onClick={() => initiateStatusUpdate(selectedUserForKYC.id, { kycStatus: 'verified' })} className="flex-1 bg-green-600 hover:bg-green-700">Valider</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserManager;
