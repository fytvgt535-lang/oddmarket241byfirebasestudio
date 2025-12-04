

import React, { useState } from 'react';
import { Stall, PaymentProvider, ProductType, Language } from '../types';
import { t } from '../services/translations';
import { ShoppingBag, Smartphone, Baby, AlertCircle, Lock, QrCode, Scan, ShieldCheck, RefreshCw, MapPin } from 'lucide-react';

interface MarketMapProps {
  stalls: Stall[];
  onReserve: (stallId: string, provider: PaymentProvider, isPriority: boolean) => void;
  language: Language;
}

const MarketMap: React.FC<MarketMapProps> = ({ stalls, onReserve, language }) => {
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('orange');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<ProductType | 'all'>('all');
  const [isPriorityRequest, setIsPriorityRequest] = useState(false);
  
  // Secure Cash State
  const [agentScanned, setAgentScanned] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);

  const handleStallClick = (stall: Stall) => {
    if (stall.status === 'free') {
      setSelectedStall(stall);
      setIsPriorityRequest(false); // Reset priority
      setAgentScanned(false);
      setPaymentProvider('orange'); // Reset to default non-cash
    }
  };

  const handlePayment = () => {
    if (!selectedStall) return;
    setIsProcessing(true);
    setTimeout(() => {
      onReserve(selectedStall.id, paymentProvider, isPriorityRequest);
      setIsProcessing(false);
      setSelectedStall(null);
    }, 2000);
  };
  
  const handleScanAgent = () => {
      setIsScanMode(true);
      setTimeout(() => {
          setIsScanMode(false);
          setAgentScanned(true);
          setPaymentProvider('cash');
      }, 1500);
  };

  const filteredStalls = filter === 'all' 
    ? stalls 
    : stalls.filter(s => s.productType === filter);

  // Derive zones from data
  const zones = [...new Set(stalls.map(s => s.zone))];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-green-600" />
          {t(language, 'reserve_stall')}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {(['all', 'vivres', 'textile', 'divers'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${filter === type ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout representing Market Zones */}
      {zones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">Aucun étal disponible dans ce marché.</p>
          <p className="text-sm text-gray-400">Contactez l'administration pour plus d'informations.</p>
        </div>
      ) : zones.map(zone => (
        <div key={zone} className="mb-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">{zone}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredStalls.filter(s => s.zone === zone).map((stall) => (
                <button
                    key={stall.id}
                    onClick={() => handleStallClick(stall)}
                    disabled={stall.status !== 'free'}
                    className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center h-28
                    ${stall.status === 'free' 
                        ? 'border-green-200 bg-green-50 hover:border-green-500 cursor-pointer' 
                        : 'border-red-100 bg-red-50 opacity-60 cursor-not-allowed'}
                    ${selectedStall?.id === stall.id ? 'ring-2 ring-blue-500 border-transparent bg-blue-50' : ''}
                    `}
                >
                    <span className="font-bold text-gray-700 text-lg">{stall.number}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{stall.productType}</span>
                    <span className="text-xs font-semibold text-gray-600">{stall.price.toLocaleString()} FCFA</span>
                    
                    {/* Status Indicators */}
                    <div className="absolute top-2 right-2 flex gap-1">
                    <div className={`w-2 h-2 rounded-full ${stall.status === 'free' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    
                    {/* Size Badge */}
                    <span className="absolute bottom-2 left-2 text-[10px] bg-white border border-gray-200 px-1 rounded text-gray-500">
                    {stall.size}
                    </span>
                </button>
                ))}
            </div>
        </div>
      ))}

      {/* Reservation Modal */}
      {selectedStall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Réserver l'étal #{selectedStall.number}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Zone / Produit:</span>
                <span className="font-medium capitalize">{selectedStall.zone} ({selectedStall.productType})</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-green-700">
                <span>Loyer Mensuel:</span>
                <span>{selectedStall.price.toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Priority Option */}
            <div 
              onClick={() => setIsPriorityRequest(!isPriorityRequest)}
              className={`mb-6 p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors
                ${isPriorityRequest ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}
              `}
            >
              <div className={`p-2 rounded-full ${isPriorityRequest ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'}`}>
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{t(language, 'priority_request')}</p>
                <p className="text-xs text-gray-500">Je suis une personne âgée ou enceinte</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-semibold text-gray-700">Moyen de paiement :</p>
              <div className="grid grid-cols-4 gap-2">
                {(['orange', 'airtel', 'momo'] as PaymentProvider[]).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setPaymentProvider(provider)}
                    className={`p-2 border rounded-lg text-[10px] md:text-xs font-medium capitalize flex flex-col items-center gap-1
                      ${paymentProvider === provider ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}
                    `}
                  >
                    <Smartphone className="w-3 h-3" />
                    {provider}
                  </button>
                ))}
                
                {/* Secure Cash Button */}
                <button
                    onClick={() => agentScanned ? setPaymentProvider('cash') : null}
                    disabled={!agentScanned}
                    className={`p-2 border rounded-lg text-[10px] md:text-xs font-medium capitalize flex flex-col items-center gap-1 relative
                      ${paymentProvider === 'cash' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    {!agentScanned && <Lock className="w-3 h-3 absolute top-1 right-1"/>}
                    <Smartphone className="w-3 h-3" />
                    Espèces
                </button>
              </div>
              
              {!agentScanned && (
                  <div className="mt-2 bg-yellow-50 p-2 rounded border border-yellow-100 text-xs text-yellow-700 flex items-center justify-between">
                      <span>Payer en cash ? Scanner Agent requis.</span>
                      <button onClick={handleScanAgent} className="bg-yellow-200 px-2 py-1 rounded font-bold hover:bg-yellow-300 flex items-center gap-1">
                         {isScanMode ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Scan className="w-3 h-3"/>}
                         Scan
                      </button>
                  </div>
              )}
              {agentScanned && (
                  <div className="mt-2 bg-green-50 p-2 rounded border border-green-100 text-xs text-green-700 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-4 h-4"/> Agent Authentifié. Cash débloqué.
                  </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedStall(null)}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 flex justify-center items-center gap-2"
              >
                {isProcessing ? 'Traitement...' : 'Payer & Réserver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketMap;