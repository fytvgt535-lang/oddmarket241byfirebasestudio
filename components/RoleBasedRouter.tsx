
import React, { Suspense } from 'react';
import { User, Market, Stall, Product, Transaction, Expense, ClientOrder, Sanction, AppNotification, Mission, Agent, Receipt, PaymentPlan } from '../types';
import * as SupabaseService from '../services/supabaseService';

// Lazy Components
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const VendorDashboard = React.lazy(() => import('./VendorDashboard'));
const ClientDashboard = React.lazy(() => import('./ClientDashboard'));
const AgentFieldTool = React.lazy(() => import('./AgentFieldTool'));
const MediatorDashboard = React.lazy(() => import('./MediatorDashboard'));

interface RoleBasedRouterProps {
    currentUser: User;
    data: {
        markets: Market[];
        stalls: Stall[];
        reports: any[];
        recentTransactions: Transaction[];
        receipts: Receipt[];
        agents: Agent[];
        expenses: Expense[];
        paymentPlans: PaymentPlan[];
        notifications: AppNotification[];
        sanctions: Sanction[];
        users: User[];
        orders: ClientOrder[];
        missions: Mission[];
        products: Product[];
        financialStats: any; 
    };
    loadingStates: any;
    lazyLoaders: any;
    actions: any;
    currentLanguage: string;
    onUpdateProfile: (updates: Partial<User>) => Promise<void>;
    onSignOut?: () => void;
}

const RoleBasedRouter: React.FC<RoleBasedRouterProps> = ({ 
    currentUser, data, loadingStates, lazyLoaders, actions, currentLanguage, onUpdateProfile, onSignOut 
}) => {

    if (currentUser.role === 'admin') {
        return (
            <AdminDashboard 
                markets={data.markets} stalls={data.stalls} reports={data.reports} 
                transactions={data.recentTransactions} receipts={data.receipts} agents={data.agents} 
                expenses={data.expenses} paymentPlans={data.paymentPlans} notifications={data.notifications} 
                sanctions={data.sanctions} users={data.users} orders={data.orders} 
                missions={data.missions}
                
                financialStats={data.financialStats} 

                loadingStates={loadingStates}
                onLoadFinance={lazyLoaders.loadFinance}
                onLoadUsers={lazyLoaders.loadUsers}
                onLoadMissions={lazyLoaders.loadMissions}
                currentLanguage={currentLanguage}

                onSendSms={() => {}} 
                onApprovePlan={actions.approvePaymentPlan} // Connected
                onAddMarket={actions.createMarket} 
                onUpdateMarket={actions.updateMarket} 
                onDeleteMarket={actions.deleteMarket} 
                onCreateStall={actions.createStall} 
                onBulkCreateStalls={actions.bulkCreateStalls} 
                onDeleteStall={actions.deleteStall} 
                onAddExpense={actions.createExpense} 
                onDeleteExpense={actions.deleteExpense} 
                onUpdateUserStatus={actions.updateUserStatus}
                onAssignMission={actions.assignMission}
                onValidateCashDrop={actions.validateCashDrop}
            />
        );
    }

    if (currentUser.role === 'vendor') {
        const currentVendorProfile = {
            ...currentUser,
            hygieneScore: 4.5, // Mock if missing
            subscriptionPlan: 'standard' as const
        };

        return (
            <VendorDashboard 
                profile={currentVendorProfile} 
                transactions={data.recentTransactions} 
                receipts={data.receipts} 
                myStall={data.stalls.find(s => s.occupantId === currentUser.id)} 
                stalls={data.stalls} 
                markets={data.markets} // Passed markets for reservation context
                myReports={data.reports} 
                sanctions={data.sanctions} 
                products={data.products} 
                orders={data.orders} 
                notifications={data.notifications} 
                
                onAddProduct={actions.createProduct} 
                onUpdateProduct={actions.updateProduct} 
                onDeleteProduct={actions.deleteProduct} 
                onUpdateOrderStatus={actions.updateOrderStatus} 
                onUpdateProfile={onUpdateProfile} 
                onToggleLogistics={() => Promise.resolve()} 
                onReserve={(id, p, prio) => SupabaseService.reserveStall(id, currentUser.id).then(() => actions.updateMarket(id, {}))} 
                onContestSanction={(id, r) => SupabaseService.contestSanction(id, r)}
                onRequestPlan={actions.requestPaymentPlan} // Connected
            />
        );
    }

    if (currentUser.role === 'client') {
        return (
            <ClientDashboard 
                stalls={data.stalls} 
                markets={data.markets} 
                products={data.products} 
                orders={data.orders.filter(o => o.customerId === currentUser.id)}
                onCreateOrder={actions.createOrder} 
                onSignOut={onSignOut}
            />
        );
    }

    if (currentUser.role === 'agent') {
        const currentAgent = {
            ...currentUser,
            marketId: 'm1',
            cashInHand: currentUser.agentStats?.cashInHand || 0,
            isShiftActive: !!currentUser.agentStats?.isShiftActive,
            logs: []
        };
        const agentMissions = data.missions.filter(m => m.agentId === currentUser.id);
        const agentTransactions = data.recentTransactions.filter(t => t.collectedBy === currentUser.id);

        return (
            <AgentFieldTool 
                stalls={data.stalls} 
                sanctions={data.sanctions} 
                agentLogs={currentAgent.logs} 
                missions={agentMissions}
                transactions={agentTransactions}
                cashInHand={currentAgent.cashInHand} 
                isShiftActive={currentAgent.isShiftActive} 
                onCollectPayment={(id, amt) => SupabaseService.createTransaction({ marketId: 'm1', amount: amt, type: 'rent', provider: 'cash', stallId: id, collectedBy: currentUser.id }).then(() => {})} 
                onIssueSanction={(id, t, r, a) => SupabaseService.createSanction({ marketId: 'm1', stallId: id, type: t, reason: r, amount: a, issuedBy: currentUser.id }).then(() => {})} 
                onShiftAction={(action) => {
                    if (action === 'start') SupabaseService.updateUserProfile(currentUser.id, { agentStats: { ...currentAgent, isShiftActive: true } });
                    else if (action === 'end') SupabaseService.updateUserProfile(currentUser.id, { agentStats: { ...currentAgent, isShiftActive: false } });
                    else if (action === 'sos') SupabaseService.updateUserProfile(currentUser.id, { agentStats: { ...currentAgent, status: 'SOS' } });
                }} 
                onUpdateMissionStatus={actions.updateMissionStatus}
            />
        );
    }

    if (currentUser.role === 'mediator') {
        return (
            <MediatorDashboard 
                sanctions={data.sanctions} 
                stalls={data.stalls}
                onResolveAppeal={(id, decision) => SupabaseService.resolveSanctionAppeal(id, decision).then(()=> {})}
            />
        );
    }

    return <div>Rôle inconnu</div>;
};

export default RoleBasedRouter;
