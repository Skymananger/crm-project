import React from 'react';
import { useApp } from '../store/AppContext';

const Records: React.FC = () => {
  const { customers, leads, orders, appointments } = useApp();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-[#003459]">Registros</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-black text-[#003459] mb-4">Clientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3">Nome</th>
                <th scope="col" className="px-6 py-3">Telefone</th>
                <th scope="col" className="px-6 py-3">Cidade</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id} className="bg-white border-b">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{customer.name}</td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4">{customer.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-black text-[#003459] mb-4">Leads</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3">Nome</th>
                <th scope="col" className="px-6 py-3">Estágio</th>
                <th scope="col" className="px-6 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="bg-white border-b">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{lead.prospectName}</td>
                  <td className="px-6 py-4">{lead.stage}</td>
                  <td className="px-6 py-4">R$ {lead.estimatedValue.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-black text-[#003459] mb-4">Pedidos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3">Cliente</th>
                <th scope="col" className="px-6 py-3">Data</th>
                <th scope="col" className="px-6 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <tr key={order.id} className="bg-white border-b">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{customer?.name || 'Cliente não encontrado'}</td>
                    <td className="px-6 py-4">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">R$ {order.total.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-black text-[#003459] mb-4">Agendamentos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3">Título</th>
                <th scope="col" className="px-6 py-3">Cliente</th>
                <th scope="col" className="px-6 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(appointment => (
                <tr key={appointment.id} className="bg-white border-b">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{appointment.title}</td>
                  <td className="px-6 py-4">{appointment.client}</td>
                  <td className="px-6 py-4">{new Date(appointment.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Records;