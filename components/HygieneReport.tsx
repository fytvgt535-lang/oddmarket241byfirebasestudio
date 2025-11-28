import React, { useState } from 'react';
import { Camera, MapPin, Send, Trash2, Droplets, Bug, Construction, EyeOff, Eye, Mic } from 'lucide-react';
import { HygieneReport, Language } from '../types';
import { t } from '../services/translations';

interface HygieneReportProps {
  onSubmit: (report: Omit<HygieneReport, 'id' | 'timestamp' | 'status' | 'marketId'>) => void;
  language: Language;
}

const HygieneReportForm: React.FC<HygieneReportProps> = ({ onSubmit, language }) => {
  const [category, setCategory] = useState<HygieneReport['category']>('waste');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Allée Principale');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ category, description, location, isAnonymous, hasAudio });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDescription('');
      setCategory('waste');
      setIsAnonymous(false);
      setHasAudio(false);
    }, 3000);
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasAudio(true); // Simulate successful recording
    } else {
      setIsRecording(true);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-fade-in">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">{t(language, 'send')} !</h3>
        <p className="text-green-700">Merci. Référence #GAB-24</p>
      </div>
    );
  }

  const categories = [
    { id: 'waste', label: t(language, 'waste'), icon: Trash2, color: 'text-orange-500' },
    { id: 'water', label: t(language, 'water'), icon: Droplets, color: 'text-blue-500' },
    { id: 'pest', label: t(language, 'pest'), icon: Bug, color: 'text-red-500' },
    { id: 'infrastructure', label: t(language, 'infrastructure'), icon: Construction, color: 'text-gray-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Camera className="w-5 h-5 text-blue-600" />
        {t(language, 'report_issue')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Catégorie</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                  ${category === cat.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
                `}
              >
                <cat.icon className={`w-6 h-6 mb-1 ${cat.color}`} />
                <span className="text-[10px] md:text-xs font-medium text-gray-600 text-center">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option>Allée Principale</option>
              <option>Vivres Frais</option>
              <option>Textile</option>
              <option>Parking</option>
            </select>
          </div>
        </div>

        {/* Voice Recording Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description / Vocal</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleVoiceRecord}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all
                ${isRecording ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 
                  hasAudio ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-600'}
              `}
            >
              <Mic className="w-5 h-5" />
              {isRecording ? "Enregistrement..." : hasAudio ? "Message enregistré" : t(language, 'voice_record')}
            </button>
          </div>
          {!hasAudio && !isRecording && (
             <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ou écrire ici..."
              className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
            />
          )}
        </div>

        {/* Anonymity Toggle */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <button
            type="button"
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAnonymous ? 'bg-green-600' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAnonymous(!isAnonymous)}>
            {isAnonymous ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
            <span className={`text-sm font-medium ${isAnonymous ? 'text-gray-900' : 'text-gray-500'}`}>
              {t(language, 'anonymous')}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {t(language, 'send')}
        </button>
      </form>
    </div>
  );
};

export default HygieneReportForm;