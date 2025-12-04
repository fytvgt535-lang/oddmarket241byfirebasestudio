
import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, Ban, CheckCircle, Clock, X } from 'lucide-react';
import { User, AppRole } from '../../types';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface UserManagerProps {
  users: User[];
  onUpdateUserStatus: (userId: string, updates: Partial<User>) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, onUpdateUserStatus }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [selectedUserForKYC, setSelectedUserForKYC] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
      return users.filter(u => {
          const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
          const matchRole = roleFilter === 'all' || u.role === roleFilter;
          return matchSearch && matchRole;
      });
  }, [users, search, roleFilter]);

  const handleStatusUpdate = (userId: string, updates: Partial<User>) => {
      onUpdateUserStatus(userId, updates);
      toast.success("Statut utilisateur mis à jour");
      if (selectedUserForKYC?.id === userId) setSelectedUserForKYC(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'client', 'vendor', 'agent', 'admin'] as const).map(role => (
                    <button key={role} onClick={() => setRoleFilter(role)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${roleFilter === role ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                        {role === 'all' ? 'Tous' : role}
                    </button>
                ))}
            </div>
            <div className="w-full md:w-64">
                <Input leftIcon={Search} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
        </div>

        {/* User Table */}
        <Card className="overflow-hidden">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                    <tr><th className="p-4">Utilisateur</th><th className="p-4">Rôle</th><th className="p-4">KYC</th><th className="p-4">Statut</th><th className="p-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
                                    <div><p className="font-bold text-gray-800">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                                </div>
                            </td>
                            <td className="p-4 capitalize"><Badge variant="neutral">{user.role}</Badge></td>
                            <td className="p-4">
                                {user.kycStatus === 'verified' ? <Badge variant="success"><ShieldCheck className="w-3 h-3 mr-1"/> Validé</Badge> :
                                 user.kycStatus === 'pending' ? <Button size="sm" variant="outline" onClick={() => setSelectedUserForKYC(user)} className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"><Clock className="w-3 h-3 mr-1"/> En Attente</Button> : <span className="text-gray-400 text-xs">Non Requis</span>}
                            </td>
                            <td className="p-4">
                                {user.isBanned ? <Badge variant="danger"><Ban className="w-3 h-3 mr-1"/> Banni</Badge> : <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1"/> Actif</Badge>}
                            </td>
                            <td className="p-4 text-right">
                                {user.isBanned ? 
                                    <button onClick={() => handleStatusUpdate(user.id, { isBanned: false })} className="text-green-600 hover:underline text-xs font-bold">Débannir</button> : 
                                    <button onClick={() => handleStatusUpdate(user.id, { isBanned: true })} className="text-red-600 hover:underline text-xs font-bold">Bannir</button>
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>

        {/* KYC Modal */}
        {selectedUserForKYC && selectedUserForKYC.kycDocument && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                    <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold">Validation d'Identité</h3>
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
                            <Button variant="outline" onClick={() => handleStatusUpdate(selectedUserForKYC.id, { kycStatus: 'rejected' })} className="flex-1 text-red-600 border-red-200 hover:bg-red-50">Rejeter</Button>
                            <Button variant="primary" onClick={() => handleStatusUpdate(selectedUserForKYC.id, { kycStatus: 'verified' })} className="flex-1 bg-green-600 hover:bg-green-700">Valider</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserManager;
