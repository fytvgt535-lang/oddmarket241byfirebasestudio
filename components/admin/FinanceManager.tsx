
import React, { useState, useEffect } from 'react';
import { TrendingUp, Wallet, Plus, Trash2, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Transaction, Expense, Market } from '../../types';
import toast from 'react-hot-toast';
import { fetchTransactions } from '../../services/supabaseService';
import { Area, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface FinanceManagerProps {
  markets: Market[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  loading?: boolean;
}

const FinanceManager: React.FC<FinanceManagerProps> = ({ markets, expenses, onAddExpense, onDeleteExpense, loading = false }) => {
  // DATE FILTERS
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // PAGINATION STATE
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [localLoading, setLocalLoading] = useState(false);

  // EXPENSE FORM
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'maintenance', amount: '', description: '', marketId: '', date: new Date().toISOString().split('T')[0] });
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const loadTransactions = async () => {
      setLocalLoading(true);
      try {
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          const result = await fetchTransactions(page, limit, start, end);
          setTransactions(result.transactions);
          setTotalTransactions(result.count);
      } catch (error) {
          console.error(error);
          toast.error("Erreur chargement transactions");
      } finally {
          setLocalLoading(false);
      }
  };

  useEffect(() => { loadTransactions(); }, [page, startDate, endDate]);

  const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netBalance = totalRevenue - totalExpenses;

  const handleAddExpense = (e: React.FormEvent) => {
      e.preventDefault();
      onAddExpense({
          category: expenseForm.category as any,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          marketId: expenseForm.marketId,
          date: new Date(expenseForm.date).getTime()
      });
      setIsExpenseModalOpen(false);
      toast.success("Dépense ajoutée");
  };

  const handleDeleteExpense = () => {
      if (deleteExpenseId) {
          onDeleteExpense(deleteExpenseId);
          setDeleteExpenseId(null);
          toast.success("Dépense supprimée");
      }
  };

  const isAnyLoading = loading || localLoading;

  return (
    <div className="space-y-6 animate-fade-in">
        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-green-500">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Recettes (Période)</p>
                {isAnyLoading ? <div className="h-9 w-24 bg-gray-200 animate-pulse rounded"></div> : <h3 className="text-3xl font-black text-green-600">{totalRevenue.toLocaleString()} F</h3>}
            </Card>
            <Card className="p-5 border-l-4 border-l-red-500">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Dépenses Totales</p>
                {isAnyLoading ? <div className="h-9 w-24 bg-gray-200 animate-pulse rounded"></div> : <h3 className="text-3xl font-black text-red-600">{totalExpenses.toLocaleString()} F</h3>}
            </Card>
            <Card className="p-5 border-l-4 border-l-blue-500">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Solde Net</p>
                {isAnyLoading ? <div className="h-9 w-24 bg-gray-200 animate-pulse rounded"></div> : <h3 className={`text-3xl font-black ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{netBalance.toLocaleString()} F</h3>}
            </Card>
        </div>

        {/* Controls */}
        <Card className="p-4 flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="flex gap-4 items-end w-full md:w-auto">
                <Input label="Du" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40"/>
                <Input label="Au" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40"/>
                <Button variant="ghost" onClick={loadTransactions} title="Actualiser" className="mb-0.5 h-[46px]"><RefreshCw className={`w-5 h-5 ${isAnyLoading ? 'animate-spin' : ''}`}/></Button>
            </div>
            <Button variant="outline" leftIcon={Download}>Export CSV</Button>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600"/> Évolution Recettes</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={transactions.slice(0, 20).reverse()}>
                            <CartesianGrid stroke="#f5f5f5" />
                            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} hide/>
                            <YAxis />
                            <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()}/>
                            <Area type="monotone" dataKey="amount" fill="#8884d8" stroke="#8884d8" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-red-600"/> Dépenses</h3>
                    <Button size="sm" variant="danger" leftIcon={Plus} onClick={() => setIsExpenseModalOpen(true)}>Ajouter</Button>
                </div>
                <div className="overflow-y-auto flex-1 max-h-64 space-y-2">
                    {expenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <p className="font-bold text-gray-900 text-sm capitalize">{exp.category}</p>
                                <p className="text-xs text-gray-500">{exp.description}</p>
                                <p className="text-[10px] text-gray-400">{new Date(exp.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-red-600">-{exp.amount.toLocaleString()} F</p>
                                <button onClick={() => setDeleteExpenseId(exp.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* Transactions Table */}
        <Card className="overflow-hidden">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                    <tr><th className="p-4">Date</th><th className="p-4">Réf</th><th className="p-4">Type</th><th className="p-4">Étal</th><th className="p-4 text-right">Montant</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {isAnyLoading ? <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500"/></td></tr> : 
                     transactions.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucune transaction.</td></tr> :
                     transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                            <td className="p-4 text-gray-500">{new Date(t.date).toLocaleString()}</td>
                            <td className="p-4 font-mono text-xs text-gray-600">{t.reference}</td>
                            <td className="p-4"><Badge variant="info">{t.type}</Badge></td>
                            <td className="p-4 font-bold text-gray-800">{t.stallNumber || '-'}</td>
                            <td className="p-4 text-right font-black text-green-700">+{t.amount.toLocaleString()} F</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs text-gray-500">Page {page} / {Math.ceil(totalTransactions / limit)}</span>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                    <Button size="sm" variant="outline" disabled={page * limit >= totalTransactions} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
            </div>
        </Card>

        {/* Modals */}
        {isExpenseModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-gray-900">Nouvelle Dépense</h3>
                    <form onSubmit={handleAddExpense} className="space-y-5">
                        <Select label="Marché" value={expenseForm.marketId} onChange={e => setExpenseForm({...expenseForm, marketId: e.target.value})}>
                            <option value="">Choisir Marché...</option>
                            {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <Select label="Catégorie" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value as any})}>
                            <option value="maintenance">Maintenance</option><option value="cleaning">Nettoyage</option>
                            <option value="security">Sécurité</option><option value="electricity">Électricité</option><option value="staff">Personnel</option>
                        </Select>
                        <Input label="Montant" type="number" required placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}/>
                        <Input label="Description" placeholder="Détails..." value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}/>
                        <Input label="Date" type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}/>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)} className="flex-1">Annuler</Button>
                            <Button type="submit" variant="danger" className="flex-1">Ajouter</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {deleteExpenseId && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Confirmer suppression ?</h3>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setDeleteExpenseId(null)} className="flex-1">Annuler</Button>
                        <Button variant="danger" onClick={handleDeleteExpense} className="flex-1">Supprimer</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default FinanceManager;
