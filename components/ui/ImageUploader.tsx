
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Image as ImageIcon, Loader2, Edit2, Trash2 } from 'lucide-react';
import { uploadFile } from '../../services/supabaseService';
import ImageCropper from '../ImageCropper';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  bucket: 'markets' | 'products' | 'avatars' | 'documents' | 'evidence';
  folder?: string;
  aspectRatio?: number; // 1 = Carré, 16/9 = Bannière, 4/3 = Produit
  label?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  currentImageUrl, 
  onImageUploaded, 
  bucket, 
  folder = '', 
  aspectRatio = 1,
  label = "Image",
  className = ""
}) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Cropper State
  const [selectedFileStr, setSelectedFileStr] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes ONLY if we are not currently uploading/previewing a new local file
  useEffect(() => {
    if (currentImageUrl && !isUploading) {
        setPreview(currentImageUrl);
    }
  }, [currentImageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFileStr(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsCropping(false);
    setIsUploading(true);
    
    // 1. UI OPTIMISTE : On affiche TOUT DE SUITE l'image locale.
    // L'utilisateur voit le changement instantanément, pas de frustration.
    const localPreviewUrl = URL.createObjectURL(croppedBlob);
    setPreview(localPreviewUrl);

    try {
      // 2. Upload silencieux en arrière-plan
      const file = new File([croppedBlob], `img_${Date.now()}.webp`, { type: 'image/webp' });
      
      // IMPORTANT: On skip la compression car le Cropper a déjà généré un WebP optimisé
      const publicUrl = await uploadFile(file, bucket, folder, { skipCompression: true });
      
      // 3. On notifie le parent avec la VRAIE URL serveur pour la sauvegarde en BDD
      onImageUploaded(publicUrl);
      toast.success("Image mise à jour !");
    } catch (err: any) {
      console.error(err);
      // En cas d'erreur fatale, on garde quand même l'image locale pour cette session
      // pour ne pas casser l'expérience utilisateur.
      toast.error("Sauvegarde cloud échouée, mais image locale active.");
      // On passe l'URL locale au parent en fallback ultime
      onImageUploaded(localPreviewUrl);
    } finally {
      setIsUploading(false);
      setSelectedFileStr(null);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Supprimer cette image ?")) {
      setPreview(null);
      onImageUploaded(''); // Vide l'URL dans le parent
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>}
      
      {/* Cropper Modal */}
      {isCropping && selectedFileStr && (
        <ImageCropper 
          imageSrc={selectedFileStr} 
          aspect={aspectRatio} 
          onCancel={() => { setIsCropping(false); setSelectedFileStr(null); }} 
          onComplete={handleCropComplete}
          isLoading={false} // Loading handled in parent now
        />
      )}

      {/* Upload Area */}
      <div 
        className={`relative rounded-2xl border-2 border-dashed overflow-hidden transition-all cursor-pointer group ${
          preview ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
        } ${aspectRatio > 1.5 ? 'h-48' : 'h-64'}`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png, image/jpeg, image/webp" 
          onChange={handleFileSelect}
        />

        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20">
             {/* On affiche quand même la preview en fond pendant l'upload */}
             {preview && <img src={preview} alt="Uploading" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm"/>}
            <div className="relative z-30 flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2"/>
                <p className="text-xs font-bold text-blue-600 animate-pulse bg-white/80 px-2 py-1 rounded">Sauvegarde...</p>
            </div>
          </div>
        ) : preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover"/>
            
            {/* Overlay Actions */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-4 transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
              <button className="p-3 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform shadow-lg" title="Modifier">
                <Edit2 className="w-5 h-5"/>
              </button>
              <button onClick={handleRemove} className="p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg" title="Supprimer">
                <Trash2 className="w-5 h-5"/>
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
            <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:shadow-md transition-shadow">
              <UploadCloud className="w-8 h-8"/>
            </div>
            <p className="text-sm font-bold">Cliquez pour importer</p>
            <p className="text-xs opacity-70 mt-1">JPG, PNG, WEBP (Max 5Mo)</p>
          </div>
        )}
      </div>
    </div>
  );
};
