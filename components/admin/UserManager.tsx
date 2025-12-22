
import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Ban, CheckCircle, Clock, X, Users, Building2, ChevronLeft, ChevronRight, Loader2, Edit3, Fingerprint, ScanFace } from 'lucide-react';
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
  users: User[]; 
  stalls: Stall[];
  markets: Market[];
  sanctions: Sanction[];
  loading?: boolean;
  onUpdateUserStatus: (userId: string, updates: Partial<User>) => void;
  currentLanguage?: string;
}

const UserManager: React.FC<UserManagerProps> = ({ stalls, markets, sanctions, onUpdateUserStatus, currentLanguage = 'fr' }) => {
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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
          const { data, count } = await fetchProfiles({ page, limit: 50, role: roleFilter, search: search });
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
          setIsSecureModalOpen(false);
          loadUsers(); 
      }
  };

  return (
    <div className="flex gap-4 animate-fade-in relative">
        <SecureActionModal
            isOpen={isSecureModalOpen}
            onClose={() => setIsSecureModalOpen(false)}
            onConfirm={confirmStatusUpdate}
            title={t(currentLanguage, 'confirm')}
            description="Modification sensible de compte."
            email={currentUserEmail}
        />

        <div className="flex-1 space-y-6">
            <Card className="p-4 bg-gray-50 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex-1"><Input leftIcon={Search} placeholder="Chercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="bg-white"/></div>
                    <div><Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as any); setPage(1); }} className="bg-white"><option value="all">Tous les rôles</option><option value="vendor">Vendeur</option><option value="agent">Agent</option><option value="admin">Admin</option></Select></div>
                    <div><p className="font-black text-slate-900 text-lg">{totalCount} dossiers</p></div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500"/></div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b">
                            <tr>
                                <th className="p-4">Citoyen</th>
                                <th className="p-4">Accès & Sécurité</th>
                                <th className="p-4">Biométrie</th>
                                <th className="p-4">Rôle</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 overflow-hidden">
                                                {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover"/> : user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{user.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">ID: {user.id.slice(0,8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.isBanned ? <Badge variant="danger">BANNI</Badge> : <Badge variant="success">AUTORISÉ</Badge>}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <div title="Empreintes digitales" className={`p-1.5 rounded-lg border ${user.biometric?.enrolledFingers && user.biometric.enrolledFingers.length === 10 ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                                <Fingerprint className="w-4 h-4"/>
                                            </div>
                                            <div title="Reconnaissance faciale" className={`p-1.5 rounded-lg border ${user.biometric?.isFaceEnrolled ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                                <ScanFace className="w-4 h-4"/>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-xs uppercase text-slate-500">{user.role}</td>
                                    <td className="p-4 text-right">
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedUserForKYC(user)} className="text-blue-600 font-bold">Dossier</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="bg-gray-50 p-4 flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Page {page} / {Math.ceil(totalCount / 50)}</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                        <Button size="sm" variant="outline" disabled={page * 50 >= totalCount} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  );
};

export default UserManager;
