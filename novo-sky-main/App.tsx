import React, { useState } from 'react';
import Layout from './components/Layout';
import { AppProvider, useApp } from './store/AppContext';
import Dashboard from './views/Dashboard';
import Pipeline from './views/Pipeline';
import MarketingAI from './views/MarketingAI';
import Team from './views/Team';
import Calculators from './views/Calculators';
import Customers from './views/Customers';
import RoutesIA from './views/RoutesIA';
import Products from './views/Products';
import Orders from './views/Orders';
import Settings from './views/Settings';
import CalendarView from './views/Calendar';
import Referral414 from './views/Referral414';
import Inventory from './views/Inventory';
import CustomerPipeline from './views/CustomerPipeline';
import Records from './views/Records';
import ConsentBanner from './components/ConsentBanner';

import Auth from './views/Auth';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Root />
      <ConsentBanner />
    </AppProvider>
  );
};

const Root: React.FC = () => {
  const { session, loading } = useApp();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-bold">Carregando sua base de dados...</div>
  }

  return session ? <AppContent /> : <Auth />;
}

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'pipeline': return <Pipeline />;
      case 'customer-pipeline-million': return <CustomerPipeline type="million" />;
      case 'customer-pipeline-sky': return <CustomerPipeline type="sky" />;
      case 'customer-pipeline-dign': return <CustomerPipeline type="dign" />;
      case 'referral414': return <Referral414 />;
      case 'inventory': return <Inventory />;
      case 'marketing': return <MarketingAI />;
      case 'team': return <Team />;
      case 'calculators': return <Calculators />;
      case 'customers': return <Customers />;
      case 'routes': return <RoutesIA />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'calendar': return <CalendarView />;
      case 'settings': return <Settings />;
      case 'records': return <Records />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;