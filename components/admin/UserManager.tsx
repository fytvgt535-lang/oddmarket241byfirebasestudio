
import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Ban, CheckCircle, Clock, X, Users, Building2, ChevronLeft, ChevronRight, Loader2, Edit3 } from 'lucide-react';
import { User, AppRole, Stall, Sanction, Market } from '../../types';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import SecureActionModal from '../ui/SecureActionModal';
import { supabase } from '../../supabaseClient';
import { calculateStallDebt } from '../../utils/coreUtils';
import { t } from '../../services/translations';
import { fetchProfiles } from '../../services/supabaseService';

interface UserManagerProps {
  users: User[]; // Legacy prop used for stats only
  stalls: Stall[];
  markets: Market[];
  sanctions: Sanction[];
  loading?: boolean;
  onUpdateUserStatus: (userId: string, updates: Partial<User>) => void;
  currentLanguage?: string;
}

const UserManager: React.FC<UserManagerProps> = ({ stalls, markets, sanctions, onUpdateUserStatus, currentLanguage = 'fr' }) => {
  // Server-side State
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [page, setPage] = useState(1);
  
  const [selectedUserForKYC, setSelectedUserForKYC] = useState<User | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<{ userId: string, updates: Partial<User> } | null>(null);
  const [isSecureModalOpen, setIsSecureModalOpen] = useState(false);

  useEffect(() => {
      supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email || ''));
  }, []);

  const loadUsers = async () => {
      setIsLoading(true);
      try {
          const { data, count } = await fetchProfiles({
              page,
              limit: 50,
              role: roleFilter,
              search: search
          });
          setPaginatedUsers(data);
          setTotalCount(count);
      } catch (e: any) {
          toast.error("Erreur chargement: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      const timer = setTimeout(() => loadUsers(), 500);
      return () => clearTimeout(timer);
  }, [page, roleFilter, search]);

  const initiateStatusUpdate = (userId: string, updates: Partial<User>) => {
      setPendingAction({ userId, updates });
      setIsSecureModalOpen(true);
  };

  const confirmStatusUpdate = async () => {
      if (pendingAction) {
          await onUpdateUserStatus(pendingAction.userId, pendingAction.updates);
          toast.success("Action validée et journalisée.");
          if (selectedUserForKYC?.id === pendingAction.userId) setSelectedUserForKYC(null);
          loadUsers(); // Refresh
      }
  };

  const getUserStatusDetails = (user: User) => {
      const userStall = stalls.find(s => s.occupantId === user.id);
      const { totalDebt } = calculateStallDebt(userStall, sanctions);
      
      if (user.isBanned) return { color: 'bg-red-600', pulse: false, text: t(currentLanguage, 'user_banned'), border: 'border-red-200' };
      if (totalDebt > 0) return { color: 'bg-orange-500', pulse: true, text: `Dette: ${totalDebt} F`, border: 'border-orange-200' };
      return { color: 'bg-green-500', pulse: false, text: t(currentLanguage, 'user_active'), border: 'border-white' };
  };

  return (
    <div className="flex gap-4 animate-fade-in relative">
        <SecureActionModal
            isOpen={isSecureModalOpen}
            onClose={() => setIsSecureModalOpen(false)}
            onConfirm={confirmStatusUpdate}
            title={t(currentLanguage, 'confirm')}
            description="Modification sensible de compte (Rôle/Statut)."
            email={currentUserEmail}
        />

        <div className="flex-1 space-y-6">
            <Card className="p-4 bg-gray-50 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{t(currentLanguage, 'search')}</label>
                        <Input leftIcon={Search} placeholder="..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="bg-white"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{t(currentLanguage, 'user_role')}</label>
                        <Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as any); setPage(1); }} className="bg-white">
                            <option value="all">Tous</option>
                            <option value="vendor">Vendeur</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                            <option value="client">Client</option>
                        </Select>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total</p>
                        <p className="font-bold text-gray-900 text-lg">{totalCount} utilisateurs</p>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500"/></div>
                ) : (
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
                            {paginatedUsers.map((user) => {
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
                                            {/* ROLE SELECTOR */}
                                            <div className="flex items-center gap-1 group relative w-fit">
                                                <select
                                                    className="appearance-none font-bold text-gray-800 capitalize bg-transparent border-b border-dashed border-gray-300 hover:border-blue-500 cursor-pointer text-sm py-0.5 outline-none transition-colors pr-4"
                                                    value={user.role}
                                                    onChange={(e) => initiateStatusUpdate(user.id, { role: e.target.value as any })}
                                                >
                                                    <option value="client">Client</option>
                                                    <option value="vendor">Vendeur</option>
                                                    <option value="agent">Agent</option>
                                                    <option value="mediator">Médiateur</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <Edit3 className="w-3 h-3 text-gray-400 absolute right-0 pointer-events-none"/>
                                            </div>
                                            
                                            {userMarket ? <span className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3"/> {userMarket.name}</span> : <span className="text-xs text-gray-400 italic mt-1">Non assigné</span>}
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
                )}
                
                {/* Pagination */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Page {page} / {Math.ceil(totalCount / 50)}</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                            <ChevronLeft className="w-4 h-4 mr-1"/> Précédent
                        </Button>
                        <Button size="sm" variant="outline" disabled={page * 50 >= totalCount} onClick={() => setPage(p => p + 1)}>
                            Suivant <ChevronRight className="w-4 h-4 ml-1"/>
                        </Button>
                    </div>
                </div>
            </Card>
        </div>

        {/* KYC Modal */}
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
