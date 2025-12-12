
import React, { useState } from 'react';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import { VendorProfile, Stall } from '../../types';
import { updateUserPassword, updateUserProfile } from '../../services/supabaseService';
import { ImageUploader } from '../ui/ImageUploader'; // NEW
import toast from 'react-hot-toast';

interface VendorSettingsProps {
  profile: VendorProfile;
  myStall?: Stall;
  onUpdateProfile: (updates: Partial<VendorProfile>) => void;
}

const VendorSettings: React.FC<VendorSettingsProps> = ({ profile, onUpdateProfile }) => {
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, bio: profile.bio || '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          await updateUserProfile(profile.id, form);
          onUpdateProfile(form);
          toast.success("Profil mis à jour");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleAvatarUpdate = async (url: string) => {
      await updateUserProfile(profile.id, { photoUrl: url });
      onUpdateProfile({ photoUrl: url });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
        {/* Avatar Section */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="w-32 h-32">
                <ImageUploader 
                    bucket="avatars"
                    aspectRatio={1}
                    currentImageUrl={profile.photoUrl}
                    onImageUploaded={handleAvatarUpdate}
                    className="h-full rounded-full overflow-hidden border-4 border-white shadow-lg"
                />
            </div>
            <p className="mt-4 text-xs font-bold text-gray-400">Photo de Profil</p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleUpdate} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 border-b border-gray-100 pb-2"><User className="w-5 h-5 text-blue-600"/> Mes Infos</h3>
            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Nom</label><input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-white text-gray-900 font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Téléphone</label><input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-3 bg-white text-gray-900 font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> Enregistrer</>}</button>
        </form>
    </div>
  );
};

export default VendorSettings;
