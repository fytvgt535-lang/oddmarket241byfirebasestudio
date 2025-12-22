
import React from 'react';
import { ShieldCheck, Gavel, Eye, FileText, Lock, Users } from 'lucide-react';
import { Card } from '../ui/Card';

const LegalCenter: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-xl">
        <ShieldCheck className="absolute top-[-20px] right-[-20px] w-48 h-48 opacity-10"/>
        <h2 className="text-3xl font-black mb-2">Conformité & Transparence</h2>
        <p className="text-slate-400 max-w-xl">
          Gestion du cadre légal de l'application conformément à la loi n°001/2011 relative à la protection des données à caractère personnel au Gabon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Gavel className="w-5 h-5 text-indigo-600"/> Cadre Réglementaire</h3>
            <p className="text-sm text-gray-600">
                Toutes les transactions financières et collectes de taxes sont régies par les arrêtés municipaux en vigueur. 
                L'application n'est qu'un outil de facilitation de recouvrement.
            </p>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-800">Dernière mise à jour CGU</span>
                    <span className="text-indigo-600">12 Mai 2024</span>
                </div>
                <button className="w-full py-2 bg-white text-indigo-700 rounded-lg text-xs font-bold shadow-sm">Éditer les CGU</button>
            </div>
        </Card>

        <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-green-600"/> Protection des Données (APDP)</h3>
            <p className="text-sm text-gray-600">
                Les numéros de téléphone et pièces d'identité des commerçants sont cryptés et ne sont accessibles qu'aux agents certifiés "Régisseur".
            </p>
            <ul className="text-xs space-y-2 text-gray-500">
                <li className="flex items-center gap-2"><Eye className="w-3 h-3"/> Droit d'accès et de rectification actif</li>
                <li className="flex items-center gap-2"><Lock className="w-3 h-3"/> Hébergement souverain ou cloud certifié</li>
            </ul>
        </Card>
      </div>
      
      <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl flex gap-4 items-start">
          <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 shadow-sm"><FileText className="w-6 h-6"/></div>
          <div>
              <h4 className="font-black text-orange-900">Rapport d'Audit Indélébile</h4>
              <p className="text-sm text-orange-800 mb-4">
                  Toute modification de loyer ou annulation d'amende est enregistrée de manière immuable pour prévenir la corruption.
              </p>
              <button className="text-xs font-black uppercase text-orange-700 hover:underline">Consulter le registre God's Eye &rarr;</button>
          </div>
      </div>
    </div>
  );
};

export default LegalCenter;
