
import React, { useState } from 'react';
import { Scale, CheckCircle, XCircle, AlertTriangle, FileText, User } from 'lucide-react';
import { Sanction, Stall } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { formatCurrency } from '../utils/coreUtils';
import toast from 'react-hot-toast';

interface MediatorDashboardProps {
  sanctions: Sanction[];
  stalls: Stall[];
  onResolveAppeal: (sanctionId: string, decision: 'accepted' | 'rejected') => Promise<void>;
}

const MediatorDashboard: React.FC<MediatorDashboardProps> = ({ sanctions, stalls, onResolveAppeal }) => {
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter only disputed sanctions
  const appeals = sanctions.filter(s => s.status === 'pending_appeal');

  const handleDecision = async (decision: 'accepted' | 'rejected') => {
      if (!selectedSanction) return;
      if (!confirm(decision === 'accepted' ? "Annuler définitivement cette amende ?" : "Confirmer la sanction et rejeter l'appel ?")) return;

      setIsProcessing(true);
      try {
          await onResolveAppeal(selectedSanction.id, decision);
          toast.success("Décision enregistrée.");
          setSelectedSanction(null);
      } catch (e: any) {
          toast.error("Erreur: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const getStallInfo = (stallId?: string) => {
      const s = stalls.find(st => st.id === stallId || st.occupantId === selectedSanction?.vendorId);
      return s ? `Étal ${s.number} (${s.zone})` : 'Étal Inconnu';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
              <Scale className="w-8 h-8"/>
          </div>
          <div>
              <h2 className="text-2xl font-black text-gray-900">Espace Médiation</h2>
              <p className="text-gray-500">Arbitrage des conflits Agent / Vendeur</p>
          </div>
          <div className="ml-auto bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
              <span className="text-2xl font-black text-purple-700">{appeals.length}</span>
              <span className="text-xs uppercase font-bold text-purple-400 block">Dossiers en attente</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTE DES APPELS */}
          <div className="lg:col-span-1 space-y-3">
              {appeals.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300"/>
                      <p className="text-gray-500">Aucun litige en cours.</p>
                  </div>
              )}
              {appeals.map(appeal => (
                  <div 
                    key={appeal.id} 
                    onClick={() => setSelectedSanction(appeal)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedSanction?.id === appeal.id ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-200'}`}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-800 text-sm">Dossier #{appeal.id.slice(-4)}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">Contesté</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{new Date(appeal.date).toLocaleDateString()}</p>
                      <div className="flex justify-between items-center">
                          <span className="font-black text-red-600">{formatCurrency(appeal.amount)}</span>
                          <span className="text-xs text-gray-400">Voir détails &rarr;</span>
                      </div>
                  </div>
              ))}
          </div>

          {/* DÉTAIL ET DÉCISION */}
          <div className="lg:col-span-2">
              {selectedSanction ? (
                  <Card className="h-full flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                      
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-xl font-bold text-gray-900">Analyse du Litige</h3>
                              <p className="text-sm text-gray-500">{getStallInfo(selectedSanction.id)}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-400 uppercase font-bold">Montant en jeu</p>
                              <p className="text-2xl font-black text-red-600">{formatCurrency(selectedSanction.amount)}</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          {/* POINT DE VUE AGENT */}
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-3 border-b border-gray-200 pb-2">
                                  <User className="w-4 h-4"/> Rapport Agent
                              </h4>
                              <p className="text-sm text-gray-800 mb-4 font-medium">"{selectedSanction.reason}"</p>
                              {selectedSanction.evidenceUrl ? (
                                  <div className="relative h-40 rounded-lg overflow-hidden border border-gray-300 group">
                                      <img src={selectedSanction.evidenceUrl} className="w-full h-full object-cover" alt="Preuve"/>
                                      <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs px-2 py-1">Preuve Photo</div>
                                  </div>
                              ) : (
                                  <div className="h-40 bg-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-xs">
                                      <AlertTriangle className="w-8 h-8 mb-2"/>
                                      Pas de preuve photo fournie
                                  </div>
                              )}
                          </div>

                          {/* POINT DE VUE VENDEUR */}
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                              <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3 border-b border-blue-200 pb-2">
                                  <FileText className="w-4 h-4"/> Défense Vendeur
                              </h4>
                              <p className="text-sm text-gray-800 italic">
                                  "{selectedSanction.appealReason || "Aucun commentaire fourni par le vendeur."}"
                              </p>
                              <div className="mt-4 p-3 bg-white/50 rounded-lg text-xs text-blue-700">
                                  <p className="font-bold mb-1">Historique :</p>
                                  <ul className="list-disc pl-4 space-y-1">
                                      <li>Sanction émise le : {new Date(selectedSanction.date).toLocaleDateString()}</li>
                                      <li>Contestée le : {selectedSanction.appealDate ? new Date(selectedSanction.appealDate).toLocaleDateString() : 'N/A'}</li>
                                  </ul>
                              </div>
                          </div>
                      </div>

                      <div className="mt-auto border-t border-gray-100 pt-6 flex gap-4">
                          <Button 
                            variant="danger" 
                            className="flex-1 py-4 text-lg shadow-red-200" 
                            onClick={() => handleDecision('rejected')}
                            isLoading={isProcessing}
                          >
                              <XCircle className="w-5 h-5 mr-2"/> Rejeter l'Appel
                              <span className="text-xs opacity-80 block ml-1 font-normal">(Confirmer l'amende)</span>
                          </Button>
                          <Button 
                            className="flex-1 py-4 text-lg bg-green-600 hover:bg-green-700 shadow-green-200 text-white" 
                            onClick={() => handleDecision('accepted')}
                            isLoading={isProcessing}
                          >
                              <CheckCircle className="w-5 h-5 mr-2"/> Accepter l'Appel
                              <span className="text-xs opacity-80 block ml-1 font-normal">(Annuler l'amende)</span>
                          </Button>
                      </div>
                  </Card>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 min-h-[400px]">
                      <Scale className="w-20 h-20 mb-4 opacity-50"/>
                      <p className="font-medium">Sélectionnez un dossier à gauche pour l'analyser.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default MediatorDashboard;
