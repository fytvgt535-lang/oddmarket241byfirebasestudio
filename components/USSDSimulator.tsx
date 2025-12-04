
import React, { useState } from 'react';
import { Phone, ArrowLeft, Send } from 'lucide-react';

interface USSDSimulatorProps {
  onClose: () => void;
}

const USSDSimulator: React.FC<USSDSimulatorProps> = ({ onClose }) => {
  const [screen, setScreen] = useState<'DIAL' | 'MENU' | 'STALLS' | 'PAYMENT' | 'SUCCESS'>('DIAL');
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');

  const handleDial = () => {
    if (input === '*123#') {
      setScreen('MENU');
      setInput('');
    } else {
      setMessage("Code invalide. Essayez *123#");
    }
  };

  const handleMenuInput = () => {
    if (screen === 'MENU') {
      if (input === '1') setScreen('STALLS');
      else if (input === '2') setScreen('PAYMENT');
      else setMessage("Choix invalide.");
      setInput('');
    } else if (screen === 'STALLS' || screen === 'PAYMENT') {
      setScreen('SUCCESS');
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-4 border-gray-700 rounded-3xl w-[320px] h-[600px] shadow-2xl flex flex-col relative overflow-hidden">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
        
        {/* Screen */}
        <div className="bg-green-900 h-2/3 p-6 pt-12 font-mono text-green-100 text-sm overflow-hidden flex flex-col relative">
          <div className="absolute top-2 right-4 text-xs opacity-70">4G | 85%</div>
          
          {screen === 'DIAL' && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="mb-4 text-green-300">Airtel Gabon</p>
              <input 
                type="text" 
                value={input}
                readOnly
                className="bg-transparent text-center text-3xl text-white border-b border-green-700 w-full outline-none"
                placeholder="Code USSD"
              />
              <p className="mt-4 text-red-400 text-xs">{message}</p>
            </div>
          )}

          {screen === 'MENU' && (
            <div className="flex-1">
              <p className="border-b border-green-700 pb-2 mb-2">-- MarchéConnect --</p>
              <p>1. Dispo Étals</p>
              <p>2. Payer Loyer</p>
              <p>3. Signaler Problème</p>
              <p>4. Mon Compte</p>
              <p className="mt-4 text-xs text-green-400">Répondre :</p>
            </div>
          )}

          {screen === 'STALLS' && (
            <div className="flex-1">
              <p className="border-b border-green-700 pb-2 mb-2">-- Étals Libres --</p>
              <p>Zone A: 3 étals (15k)</p>
              <p>Zone B: 1 étal (25k)</p>
              <p>0. Retour</p>
              <p className="mt-4 text-xs text-green-400">Choisir zone :</p>
            </div>
          )}

           {screen === 'SUCCESS' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-white font-bold mb-2">Succès !</p>
              <p>Votre demande a été traitée. Vous recevrez un SMS de confirmation.</p>
              <button type="button" onClick={() => setScreen('MENU')} className="mt-4 text-xs border border-green-500 px-2 py-1">OK</button>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="bg-gray-800 flex-1 grid grid-cols-3 gap-1 p-4">
          {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
            <button
              key={key}
              onClick={() => setInput(prev => prev + key)}
              className="bg-gray-700 rounded text-white font-bold hover:bg-gray-600 active:bg-gray-500 transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-gray-900 p-4 flex justify-between items-center px-8 pb-8">
           <button type="button" onClick={() => { setInput(''); if(screen !== 'DIAL') setScreen('DIAL'); else onClose(); }} className="p-3 bg-red-600 rounded-full text-white">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <button 
            type="button"
            onClick={screen === 'DIAL' ? handleDial : handleMenuInput}
            className="p-3 bg-green-600 rounded-full text-white shadow-lg shadow-green-900/50"
          >
             {screen === 'DIAL' ? <Phone className="w-5 h-5" /> : <Send className="w-5 h-5" />}
           </button>
        </div>
      </div>
    </div>
  );
};

export default USSDSimulator;