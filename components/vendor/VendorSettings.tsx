
import React, { useState, useRef } from 'react';
import { User, Lock, AlertTriangle, Save, Loader2, Camera, X } from 'lucide-react';
import { VendorProfile } from '../../types';
import { updateUserPassword, updateUserProfile, deleteUserAccount, uploadFile } from '../../services/supabaseService';
import ImageCropper from '../ImageCropper';
import toast from 'react-hot-toast';

interface VendorSettingsProps {
  profile: VendorProfile;
  onUpdateProfile: (updates: Partial<VendorProfile>) => void;
}

const VendorSettings: React.FC<VendorSettingsProps> = ({ profile, onUpdateProfile }) => {
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, bio: profile.bio || '' });
  const [pass, setPass] = useState({ current: '', new: '', confirm: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deletePass, setDeletePass] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          await updateUserProfile(profile.id, { name: form.name, phone: form.phone, bio: form.bio });
          onUpdateProfile(form);
          toast.success("Profil mis à jour");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handlePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (pass.new !== pass.confirm) return toast.error("Mots de passe différents");
      setIsSaving(true);
      try {
          await updateUserPassword(pass.new, pass.current);
          toast.success("Mot de passe modifié");
          setPass({ current: '', new: '', confirm: '' });
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const reader = new FileReader();
          reader.onload = () => { setCropImage(reader.result as string); setIsCropping(true); };
          reader.readAsDataURL(e.target.files[0]);
          e.target.value = '';
      }
  };

  const handleCropComplete = async (blob: Blob) => {
      setIsUploading(true);
      try {
          // FORCE WEBP AVATAR
          const file = new File([blob], `avatar-${Date.now()}.webp`, { type: 'image/webp' });
          const url = await uploadFile(file, 'avatars');
          await updateUserProfile(profile.id, { photoUrl: url });
          onUpdateProfile({ photoUrl: url });
          toast.success("Photo mise à jour");
          setIsCropping(false);
          setCropImage(null);
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsUploading(false);
      }
  };

  const handleDelete = async () => {
      if (deleteInput !== 'SUPPRIMER') return toast.error("Écrivez SUPPRIMER pour confirmer");
      setIsDeleting(true);
      try {
          await deleteUserAccount(deletePass);
      } catch (e: any) {
          toast.error(e.message);
          setIsDeleting(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
        {isCropping && cropImage && <ImageCropper imageSrc={cropImage} aspect={1} cropShape="round" onCancel={() => { setIsCropping(false); setCropImage(null); }} onComplete={handleCropComplete} isLoading={isUploading}/>}

        {/* Photo Upload */}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
            <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                    {profile.photoUrl ? <img src={profile.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-2xl font-bold">{profile.name.charAt(0)}</div>}
                </div>
                <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-gray-200 group-hover:scale-110 transition-transform">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4 text-gray-600"/>}
                </div>
            </div>
            <p className="mt-3 text-xs text-gray-400 font-bold">Toucher pour changer</p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleUpdate} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 border-b border-gray-100 pb-2"><User className="w-5 h-5 text-blue-600"/> Mes Infos</h3>
            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Nom</label><input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-white text-gray-900 font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Téléphone</label><input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-3 bg-white text-gray-900 font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Bio</label><textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"/></div>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> Enregistrer</>}</button>
        </form>

        {/* Security Form */}
        <form onSubmit={handlePassword} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 border-b border-gray-100 pb-2"><Lock className="w-5 h-5 text-orange-600"/> Sécurité</h3>
            <input required type="password" placeholder="Mot de passe actuel" value={pass.current} onChange={e => setPass({...pass, current: e.target.value})} className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none"/>
            <input required type="password" placeholder="Nouveau" value={pass.new} onChange={e => setPass({...pass, new: e.target.value})} className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none"/>
            <input required type="password" placeholder="Confirmer" value={pass.confirm} onChange={e => setPass({...pass, confirm: e.target.value})} className="w-full p-3 bg-white text-gray-900 border border-gray-200 rounded-xl outline-none"/>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg">Changer Mot de Passe</button>
        </form>

        {/* Delete Zone */}
        <div className="pt-4 bg-red-50 p-6 rounded-3xl border border-red-100">
            <h3 className="font-bold text-red-800 text-lg flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5"/> Zone de Danger</h3>
            {!isDeleteOpen ? (
                <button type="button" onClick={() => setIsDeleteOpen(true)} className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-100">Supprimer mon compte</button>
            ) : (
                <div className="space-y-3 bg-white p-4 rounded-xl shadow-sm">
                    <p className="text-xs text-red-600 font-bold">Cette action est définitive.</p>
                    <input type="text" placeholder="Ecrivez SUPPRIMER" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} className="w-full p-2 border border-red-200 rounded text-red-600 font-bold bg-red-50"/>
                    <input type="password" placeholder="Votre mot de passe" value={deletePass} onChange={e => setDeletePass(e.target.value)} className="w-full p-2 border border-red-200 rounded text-red-600 bg-red-50"/>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setIsDeleteOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg">Annuler</button>
                        <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">{isDeleting ? "..." : "Confirmer"}</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default VendorSettings;
