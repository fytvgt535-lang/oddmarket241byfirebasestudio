import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, ZoomIn, Loader2 } from 'lucide-react';
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
        <button onClick={onCancel} className="text-white p-2">
          <X className="w-6 h-6" />
        </button>
        <span className="font-bold">Ajuster l'image</span>
        <button 
          onClick={handleSave} 
          disabled={isLoading}
          className="text-green-400 font-bold p-2 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-6 h-6" />}
          Valider
        </button>
      </div>

      {/* Cropper Area */}
      <div className="relative flex-1 bg-gray-900 w-full">
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
      </div>

      {/* Controls */}
      <div className="bg-black p-6 pb-10 z-10">
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