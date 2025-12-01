
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, ZoomIn, Loader2, Move, MousePointer2 } from 'lucide-react';
import getCroppedImg from '../utils/cropImage';

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number; // 1 for square/circle, 4/3 for products
  cropShape?: 'rect' | 'round';
  onCancel: () => void;
  onComplete: (croppedBlob: Blob) => void;
  isLoading?: boolean;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ 
  imageSrc, 
  aspect = 1, 
  cropShape = 'rect', 
  onCancel, 
  onComplete,
  isLoading = false
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        onComplete(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-black text-white p-4 flex justify-between items-center z-10">
        <button onClick={onCancel} className="text-white p-2 hover:bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg">Ajuster l'image</span>
        <button 
          onClick={handleSave} 
          disabled={isLoading}
          className="text-green-400 font-bold p-2 flex items-center gap-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-6 h-6" />}
          Valider
        </button>
      </div>

      {/* Cropper Area */}
      <div className="relative flex-1 bg-gray-900 w-full overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
        
        {/* Overlay Instructions */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-50">
            <div className="border-2 border-white/30 rounded-xl p-4 flex flex-col items-center">
                <Move className="w-8 h-8 text-white mb-2"/>
                <p className="text-white font-bold text-shadow text-center">Glissez pour centrer</p>
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black p-6 pb-10 z-10 space-y-4">
        <div className="flex justify-center gap-6 text-gray-400 text-xs font-bold uppercase mb-2">
            <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3"/> Déplacer avec le doigt</span>
            <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3"/> Zoomer en bas</span>
        </div>
        
        <div className="flex items-center gap-4 max-w-sm mx-auto">
          <ZoomIn className="w-5 h-5 text-gray-400" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
