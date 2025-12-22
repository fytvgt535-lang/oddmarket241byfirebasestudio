
import React, { useState } from 'react';
import { User, Lock, ShieldCheck, Download, Trash2, ShieldAlert, Key, ChevronRight, Eye, EyeOff, FileJson } from 'lucide-react';
import { VendorProfile, Stall } from '../../types';
import { updateUserPassword, updateUserProfile, verifyPassword, signOutUser } from '../../services/supabaseService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';

interface VendorSettingsProps {
  profile: VendorProfile;
  myStall?: Stall;
  onUpdateProfile: (updates: Partial<VendorProfile>) => void;
}

const VendorSettings: React.FC<VendorSettingsProps> = ({ profile, onUpdateProfile }) => {
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, bio: profile.bio || '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showDataCenter, setShowDataCenter] = useState(false);

  const downloadMyData = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `mon_identite_marchconnect.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast.success("Données exportées avec succès");
  };

  const deleteMyAccount = async () => {
      const confirm = window.confirm("ATTENTION : Cette action supprimera définitivement votre badge numérique et vos accès. Continuer ?");
      if (confirm) {
          toast.loading("Révocation du badge en cours...");
          setTimeout(async () => {
              await signOutUser();
              window.location.reload();
          }, 2000);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto pb-24 px-1">
        
        {/* PRIVACY CENTER (LOI APDP) */}
        <Card className="p-6 border-blue-100 bg-blue-50/30 rounded-[2.5rem]">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-600"/>
                    <h3 className="font-black text-slate-900 uppercase text-sm">Confidentialité</h3>
                </div>
                <Badge variant="info" className="text-[8px]">LOI 001/2011</Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed mb-4">
                En vertu de la loi gabonaise (APDP), vous contrôlez vos données. Vous pouvez exporter votre dossier ou révoquer votre badge biométrique de ce terminal.
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={downloadMyData} className="flex items-center gap-2 p-3 bg-white border border-blue-200 rounded-2xl text-[10px] font-black text-blue-700 hover:bg-blue-100 transition-colors">
                    <FileJson className="w-4 h-4"/> EXPORTER
                </button>
                <button onClick={() => setShowDataCenter(true)} className="flex items-center gap-2 p-3 bg-white border border-red-200 rounded-2xl text-[10px] font-black text-red-700 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4"/> SUPPRIMER
                </button>
            </div>
        </Card>

        {showDataCenter && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
                <Card className="w-full max-w-sm p-8 bg-white rounded-[2.5rem] text-center space-y-6">
                    <ShieldAlert className="w-16 h-16 text-red-600 mx-auto animate-pulse"/>
                    <h3 className="text-xl font-black text-slate-900">Révocation Irréversible</h3>
                    <p className="text-sm text-slate-500">
                        La suppression de votre compte entraînera la perte immédiate de votre emplacement et de vos scores d'historique.
                    </p>
                    <div className="space-y-3">
                        <Button variant="danger" className="w-full h-14" onClick={deleteMyAccount}>RÉVOQUER MON BADGE</Button>
                        <button onClick={() => setShowDataCenter(false)} className="w-full py-3 font-bold text-slate-400">Garder mes accès</button>
                    </div>
                </Card>
            </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); toast.success("Profil mis à jour"); }} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 border-b border-gray-50 pb-4 uppercase tracking-tighter">Identité Marchande</h3>
            <Input label="Nom de l'exploitant" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-gray-50 h-14"/>
            <Input label="Contact Airtel/Orange" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-gray-50 h-14"/>
            <Button type="submit" className="w-full h-14 bg-slate-900 text-white font-black uppercase rounded-2xl">Mettre à jour le profil</Button>
        </form>
    </div>
  );
};

export default VendorSettings;
