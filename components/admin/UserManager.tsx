
import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, Ban, CheckCircle, Clock, X, Users, Activity, Lock, AlertTriangle, Building2, Tag } from 'lucide-react';
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
  onUpdateUserStatus: (userId: string, updates: Partial<User>) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, stalls, markets, sanctions, onUpdateUserStatus }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  
  const [selectedUserForKYC, setSelectedUserForKYC] = useState<User | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Secure Modal State
  const [pendingAction, setPendingAction] = useState<{ userId: string, updates: Partial<User> } | null>(null);
  const [isSecureModalOpen, setIsSecureModalOpen] = useState(false);

  React.useEffect(() => {
      supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email || ''));
  }, []);

  const filteredUsers = useMemo(() => {
      return users.filter(u => {
          // Identify Stall for Sector/Market filtering
          const userStall = stalls.find(s => s.occupantId === u.id);
          
          const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
          const matchRole = roleFilter === 'all' || u.role === roleFilter;
          // Filter by Market (either assigned directly or via Stall)
          const matchMarket = marketFilter === 'all' || (u.marketId === marketFilter) || (userStall?.marketId === marketFilter);
          // Filter by Sector (Product Type of the Stall)
          const matchSector = sectorFilter === 'all' || (userStall?.productType === sectorFilter);

          return matchSearch && matchRole && matchMarket && matchSector;
      });
  }, [users, stalls, search, roleFilter, marketFilter, sectorFilter]);

  // Trigger Secure Modal
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

  const activeCount = users.filter(u => !u.isBanned).length;
  const bannedCount = users.filter(u => u.isBanned).length;

  // ROBUST ONLINE CHECK
  const isOnline = (user: User) => {
      if (user.email === currentUserEmail) return true;
      if (!user.lastSeenAt) return false;
      return (Date.now() - user.lastSeenAt) < 5 * 60 * 1000; 
  };

  const getLastSeenText = (user: User) => {
      if (user.email === currentUserEmail) return 'En ligne (Vous)';
      if (!user.lastSeenAt) return 'Jamais';
      const diff = Date.now() - user.lastSeenAt;
      if (diff < 60000) return 'À l\'instant';
      if (diff < 3600000) return `Il y a ${Math.floor(diff/60000)} min`;
      if (diff < 86400000) return `Il y a ${Math.floor(diff/3600000)} h`;
      return new Date(user.lastSeenAt).toLocaleDateString();
  };

  const getUserStatusDetails = (user: User) => {
      const userStall = stalls.find(s => s.occupantId === user.id);
      const { totalDebt } = calculateStallDebt(userStall, sanctions);
      const online = isOnline(user);
      
      const hasIssues = totalDebt > 0 || user.isBanned;

      if (hasIssues) {
          return {
              color: 'bg-red-600',
              pulse: true, 
              text: totalDebt > 0 ? `Dette: ${totalDebt} F` : 'Banni',
              border: 'border-red-200'
          };
      }
      
      if (online) {
          return {
              color: 'bg-green-500',
              pulse: true, 
              text: user.email === currentUserEmail ? 'En ligne (Vous)' : 'En ligne',
              border: 'border-white'
          };
      }

      return {
          color: 'bg-gray-300',
          pulse: false,
          text: getLastSeenText(user),
          border: 'border-white'
      };
  };

  const sectors: ProductType[] = ['vivres', 'textile', 'electronique', 'divers'];

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* Secure Modal */}
        <SecureActionModal
            isOpen={isSecureModalOpen}
            onClose={() => setIsSecureModalOpen(false)}
            onConfirm={confirmStatusUpdate}
            title="Validation Requise"
            description="Vous êtes sur le point de modifier un compte utilisateur. Cette action est sensible."
            email={currentUserEmail}
            confirmText="Confirmer Modification"
        />

        {/* Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3 border-blue-200 bg-blue-50">
                <div className="p-2 bg-blue-200 text-blue-700 rounded-full"><Users className="w-5 h-5"/></div>
                <div><p className="text-xs font-bold text-blue-800 uppercase">Total Comptes</p><h3 className="text-2xl font-black text-blue-900">{users.length}</h3></div>
            </Card>
            <Card className="p-4 flex items-center gap-3 border-green-200 bg-green-50">
                <div className="p-2 bg-green-200 text-green-700 rounded-full"><CheckCircle className="w-5 h-5"/></div>
                <div><p className="text-xs font-bold text-green-800 uppercase">Actifs</p><h3 className="text-2xl font-black text-green-900">{activeCount}</h3></div>
            </Card>
            <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50">
                <div className="p-2 bg-red-200 text-red-700 rounded-full"><Ban className="w-5 h-5"/></div>
                <div><p className="text-xs font-bold text-red-800 uppercase">Bannis</p><h3 className="text-2xl font-black text-red-900">{bannedCount}</h3></div>
            </Card>
        </div>

        {/* Advanced Filters */}
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
                        <option value="client">Client</option>
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
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Secteur</label>
                    <Select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="bg-white">
                        <option value="all">Tous Secteurs</option>
                        {sectors.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </Select>
                </div>
            </div>
        </Card>

        {/* User Table */}
        <Card className="overflow-hidden">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                    <tr>
                        <th className="p-4">Utilisateur & Statut</th>
                        <th className="p-4">Localisation (Marché/Sec)</th>
                        <th className="p-4">Rôle</th>
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
                                        <div 
                                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${status.color} ${status.pulse ? 'animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.3)]' : ''}`} 
                                            title={status.text}
                                        ></div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 flex items-center gap-1">
                                            {user.name}
                                            {user.email === currentUserEmail && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded-full border border-slate-200">Vous</span>}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <span className="truncate max-w-[120px]">{user.email}</span>
                                            <span className="text-gray-300 mx-1">•</span>
                                            {status.color.includes('red') ? (
                                                <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {status.text}</span>
                                            ) : (
                                                <span className={`${status.color.includes('green') ? 'text-green-600 font-bold' : ''}`}>{status.text}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                {userMarket ? (
                                    <div>
                                        <div className="flex items-center gap-1 font-bold text-gray-800 text-xs">
                                            <Building2 className="w-3 h-3 text-gray-400"/> {userMarket.name}
                                        </div>
                                        {userStall && (
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5 ml-4">
                                                <Tag className="w-3 h-3"/> {userStall.productType} (Zone {userStall.zone})
                                            </div>
                                        )}
                                    </div>
                                ) : <span className="text-gray-400 text-xs italic">Non assigné</span>}
                            </td>
                            <td className="p-4">
                                <div className="relative group w-32">
                                    <select 
                                        value={user.role} 
                                        onChange={(e) => initiateStatusUpdate(user.id, { role: e.target.value as AppRole })}
                                        className="appearance-none w-full bg-white border border-gray-200 text-gray-700 py-1.5 px-3 rounded-lg font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-gray-300 capitalize shadow-sm pr-8"
                                    >
                                        <option value="client">Client</option>
                                        <option value="vendor">Vendeur</option>
                                        <option value="agent">Agent</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <Lock className="w-3 h-3 text-gray-400 absolute right-2 top-2 pointer-events-none"/>
                                </div>
                            </td>
                            <td className="p-4">
                                {user.kycStatus === 'verified' ? <Badge variant="success"><ShieldCheck className="w-3 h-3 mr-1"/> Validé</Badge> :
                                 user.kycStatus === 'pending' ? <Button size="sm" variant="outline" onClick={() => setSelectedUserForKYC(user)} className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 h-8"><Clock className="w-3 h-3 mr-1"/> En Attente</Button> : <span className="text-gray-400 text-xs italic">Non Requis</span>}
                            </td>
                            <td className="p-4 text-right">
                                {user.isBanned ? 
                                    <button onClick={() => initiateStatusUpdate(user.id, { isBanned: false })} className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1 rounded text-xs font-bold transition-colors">Débannir</button> : 
                                    <button onClick={() => initiateStatusUpdate(user.id, { isBanned: true })} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold transition-colors">Bannir</button>
                                }
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </Card>

        {/* KYC Modal */}
        {selectedUserForKYC && selectedUserForKYC.kycDocument && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
                    <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Validation d'Identité</h3>
                        <button onClick={() => setSelectedUserForKYC(null)}><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">{selectedUserForKYC.name.charAt(0)}</div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-800">{selectedUserForKYC.name}</h4>
                                <p className="text-gray-500 text-sm">Document: <span className="uppercase font-bold">{selectedUserForKYC.kycDocument.type}</span></p>
                                <p className="text-gray-400 text-xs">N°: {selectedUserForKYC.kycDocument.number}</p>
                            </div>
                        </div>
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
