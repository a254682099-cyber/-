import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ledgerService } from '../services/ledgerService';
import { 
  Users, 
  FileText, 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  History,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomerForm } from './CustomerForm';
import { OrderForm } from './OrderForm';
import { format } from 'date-fns';
import { UserRole } from '../types';

export const LedgerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'members' | 'logs'>('orders');
  
  const [ledger, setLedger] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Member State
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('collector');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubLedger = ledgerService.subscribeToLedger(id, setLedger);
    const unsubCustomers = ledgerService.subscribeToCustomers(id, setCustomers);
    const unsubOrders = ledgerService.subscribeToOrders(id, setOrders);
    const unsubLogs = ledgerService.subscribeToAuditLogs(id, setLogs);
    return () => {
      unsubLedger();
      unsubCustomers();
      unsubOrders();
      unsubLogs();
    };
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'pending_approval': return 'bg-amber-100 text-amber-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Clock;
      case 'overdue': return AlertCircle;
      case 'completed': return CheckCircle2;
      case 'pending_approval': return Clock;
      default: return Clock;
    }
  };

  const handleUpdateStatus = async (orderId: string, oldStatus: string, newStatus: string) => {
    if (!id) return;
    await ledgerService.updateOrderStatus(id, orderId, oldStatus, newStatus);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMemberEmail.trim()) return;
    setIsAddingMember(true);
    try {
      await ledgerService.addMemberByEmail(id, newMemberEmail, newMemberRole);
      setNewMemberEmail('');
    } catch (error: any) {
      alert(error.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  const filteredOrders = orders.filter(o => {
    const customer = customers.find(c => c.id === o.customerId);
    return customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors font-medium bg-white rounded-full shadow-sm border border-neutral-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">{ledger?.name || 'Loading...'}</h2>
            <p className="text-sm text-neutral-500">Ledger Details</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowCustomerForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-2xl transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Customer
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'customers' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Customers
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'members' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <Shield className="w-5 h-5" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'logs' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <History className="w-5 h-5" />
            Audit Logs
          </button>
        </div>

        {(activeTab === 'orders' || activeTab === 'customers') && (
          <div className="flex items-center gap-4 px-4 flex-1 max-w-md ml-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 gap-4"
          >
            {filteredOrders.map((order) => {
              const customer = customers.find(c => c.id === order.customerId);
              const StatusIcon = getStatusIcon(order.status);
              return (
                <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getStatusColor(order.status)} shrink-0`}>
                      <StatusIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900">{customer?.name || 'Unknown Customer'}</h4>
                      <p className="text-sm text-neutral-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Due {format(new Date(order.dueDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 md:gap-12">
                    <div className="text-right">
                      <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">Principal</p>
                      <p className="text-lg font-bold text-neutral-900">${order.principal.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">Interest</p>
                      <p className="text-lg font-bold text-emerald-600">+{order.interestRate}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </div>
                      
                      {/* Status Actions */}
                      <select 
                        className="ml-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, order.status, e.target.value)}
                      >
                        <option value="pending_approval">Pending</option>
                        <option value="active">Active</option>
                        <option value="overdue">Overdue</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className="py-20 text-center text-neutral-400">No orders found.</div>
            )}
          </motion.div>
        )}

        {activeTab === 'customers' && (
          <motion.div
            key="customers"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 group hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    <Users className="w-8 h-8" />
                  </div>
                  <button className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors">
                    <MoreVertical className="w-6 h-6" />
                  </button>
                </div>
                <h4 className="text-xl font-bold text-neutral-900 mb-1">{customer.name}</h4>
                <p className="text-sm text-neutral-500 mb-6">{customer.phone || 'No phone provided'}</p>
                
                <button
                  onClick={() => setSelectedCustomerForOrder(customer)}
                  className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  Create Loan
                </button>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="col-span-full py-20 text-center text-neutral-400">No customers found.</div>
            )}
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Add Member Form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add New Member
              </h3>
              <form onSubmit={handleAddMember} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">User Email</label>
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="ledger_admin">Ledger Admin</option>
                    <option value="auditor">Auditor</option>
                    <option value="collector">Collector</option>
                    <option value="readonly">Read Only</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </form>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="p-4 text-sm font-semibold text-neutral-600">Name / Email</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600">Role</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger?.ownerUid && (
                    <tr className="border-b border-neutral-50">
                      <td className="p-4">
                        <div className="font-medium text-neutral-900">Owner</div>
                        <div className="text-sm text-neutral-500">{ledger.ownerUid}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">
                          Owner
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-neutral-400 text-sm">Cannot remove</span>
                      </td>
                    </tr>
                  )}
                  {ledger?.members?.map((member: any, idx: number) => (
                    <tr key={idx} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-neutral-900">{member.name || 'Unknown'}</div>
                        <div className="text-sm text-neutral-500">{member.email || member.uid}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!ledger?.members || ledger.members.length === 0) && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-neutral-400">
                        No additional members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="p-4 text-sm font-semibold text-neutral-600">Timestamp</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600">User UID</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600">Action</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 text-sm text-neutral-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-4 text-sm font-mono text-neutral-500">
                      {log.uid.substring(0, 8)}...
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-neutral-600">
                      {log.oldValue && <span className="line-through text-neutral-400 mr-2">{log.oldValue}</span>}
                      {log.newValue && <span className="font-medium text-emerald-600">{log.newValue}</span>}
                      {!log.oldValue && !log.newValue && <span className="text-neutral-400">Target: {log.targetId}</span>}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-400">
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showCustomerForm && id && (
        <CustomerForm ledgerId={id} onClose={() => setShowCustomerForm(false)} />
      )}
      {selectedCustomerForOrder && id && (
        <OrderForm 
          ledgerId={id} 
          customerId={selectedCustomerForOrder.id} 
          customerName={selectedCustomerForOrder.name}
          onClose={() => setSelectedCustomerForOrder(null)} 
        />
      )}
    </div>
  );
};
