
import React from 'react';
import { ShieldCheck, Zap, BarChart3, Users, ArrowRight, X, Smartphone, Map, Gavel, CheckCircle2, TrendingUp, Landmark } from 'lucide-react';
import { Button } from '../ui/Button';

interface StrategicOverviewProps {
  onClose: () => void;
}

const StrategicOverview: React.FC<StrategicOverviewProps> = ({ onClose }) => {
  const pillars = [
    {
      title: "Souveraineté Numérique",
      desc: "Chaque commerçant reçoit une identité numérique certifiée (Badge QR). L'État reprend le contrôle de son fichier marchand.",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Intégrité des Recettes",
      desc: "Numérisation totale des flux financiers. Les paiements mobiles et reçus SMS éliminent les caisses noires et la corruption.",
      icon: Zap,
      color: "text-yellow-600",
      bg: "bg-yellow-50"
    },
    {
      title: "Géo-Intelligence",
      desc: "Suivi GPS des agents de collecte en temps réel. Validation de présence physique obligatoire pour chaque transaction.",
      icon: Map,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      title: "War Room IA",
      desc: "Pilotage par la donnée. L'Intelligence Artificielle analyse les tendances et optimise les budgets municipaux.",
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-fade-in font-sans">
      {/* Header Institutionnel */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-900 rounded-lg">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter">MarchéConnect <span className="text-blue-600">Gabon</span></span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest mb-6">
          <ShieldCheck className="w-4 h-4" /> Vision Stratégique 2024
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tighter">
          Moderniser le commerce de proximité,<br/> <span className="text-blue-600">Sécuriser l'avenir urbain.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Une plateforme souveraine pour transformer nos marchés municipaux en écosystèmes intelligents, transparents et performants.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-slate-900 px-8" onClick={onClose}>Accéder à la Plateforme</Button>
          <Button size="lg" variant="outline" className="px-8 border-slate-200">Consulter le Rapport Impact</Button>
        </div>
      </header>

      {/* Les 4 Piliers (Comment ça marche) */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Le Mécanisme Opérationnel</h2>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pillars.map((p, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-2 group">
                <div className={`w-14 h-14 ${p.bg} ${p.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <p.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{p.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Processus Flow (Visualiser le changement) */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-12 uppercase">Parcours de Transformation</h2>
        <div className="space-y-12 relative">
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-100 hidden md:block"></div>
          
          {[
            { step: "01", title: "Recensement Biométrique", detail: "Identification faciale des commerçants selon la loi APDP Gabon.", icon: Smartphone },
            { step: "02", title: "Collecte de Proximité", detail: "Agents municipaux équipés de terminaux sécurisés, sans manipulation d'espèces risquée.", icon: Map },
            { step: "03", title: "Arbitrage & Médiation", detail: "Un système de contestation transparent pour les commerçants, géré par l'Hôtel de Ville.", icon: Gavel },
            { step: "04", title: "Expansion Économique", detail: "Accès au micro-crédit facilité par l'historique numérique des paiements.", icon: TrendingUp }
          ].map((item, i) => (
            <div key={i} className="flex gap-8 items-start relative z-10 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-16 h-16 shrink-0 bg-white border-4 border-blue-600 rounded-full flex items-center justify-center font-black text-xl text-blue-600 shadow-lg">
                {item.step}
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-1">
                <h4 className="font-black text-lg mb-1 text-slate-900">{item.title}</h4>
                <p className="text-slate-500 text-sm font-medium">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Closing */}
      <section className="bg-blue-600 py-20 px-6 text-center text-white">
        <div className="max-w-3xl mx-auto">
          <Landmark className="w-16 h-16 mx-auto mb-8 opacity-50" />
          <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tighter">Prêt pour le déploiement national.</h2>
          <p className="text-blue-100 text-lg mb-10 opacity-90">
            MarchéConnect est prêt à accompagner les municipalités gabonaises dans leur mutation numérique dès aujourd'hui.
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-10 font-black" onClick={onClose}>
            Démarrez le Pilotage
          </Button>
        </div>
      </section>
    </div>
  );
};

export default StrategicOverview;
