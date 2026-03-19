import React, { useState, useEffect } from 'react';
import { ledgerService } from '../services/ledgerService';
import { Plus, ChevronRight, TrendingUp, Users, DollarSign, Clock, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format, isPast, isToday } from 'date-fns';

export const Dashboard: React.FC = () => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [showNewLedger, setShowNewLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = ledgerService.subscribeToLedgers(setLedgers);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Subscribe to orders and customers for all ledgers
    const unsubscribes: (() => void)[] = [];
    
    const fetchAggregatedData = () => {
      let tempOrders: any[] = [];
      let tempCustomers: any[] = [];
      
      ledgers.forEach(ledger => {
        const unsubOrders = ledgerService.subscribeToOrders(ledger.id, (orders) => {
          tempOrders = [...tempOrders.filter(o => o.ledgerId !== ledger.id), ...orders];
          setAllOrders([...tempOrders]);
        });
        
        const unsubCustomers = ledgerService.subscribeToCustomers(ledger.id, (customers) => {
          tempCustomers = [...tempCustomers.filter(c => c.ledgerId !== ledger.id), ...customers];
          setAllCustomers([...tempCustomers]);
        });
        
        unsubscribes.push(unsubOrders, unsubCustomers);
      });
    };

    if (ledgers.length > 0) {
      fetchAggregatedData();
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [ledgers]);

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName.trim()) return;
    await ledgerService.createLedger(newLedgerName);
    setNewLedgerName('');
    setShowNewLedger(false);
  };

  const totalCapital = allOrders.reduce((sum, order) => sum + (order.principal || 0), 0);
  const totalInterest = allOrders.reduce((sum, order) => sum + ((order.principal || 0) * (order.interestRate || 0) / 100), 0);
  const totalPaid = allOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
  const activeOrdersCount = allOrders.filter(o => o.status === 'active').length;
  
  const pendingTasks = allOrders.filter(o => 
    o.status === 'pending_approval' || 
    o.status === 'overdue' || 
    (o.status === 'active' && (isPast(new Date(o.dueDate)) || isToday(new Date(o.dueDate))))
  ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const stats = [
    { label: 'Total Capital', value: `$${totalCapital.toLocaleString()}`, icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Expected Interest', value: `$${totalInterest.toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Total Collected', value: `$${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'bg-purple-500' },
    { label: 'Pending Tasks', value: pendingTasks.length.toString(), icon: Clock, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Welcome back!</h1>
          <p className="text-neutral-500 mt-1">Here's what's happening across your ledgers today.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewLedger(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Ledger
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 flex items-center gap-5 group hover:shadow-md transition-all"
          >
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Ledgers Section */}
        <section className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-neutral-900">Your Ledgers</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ledgers.map((ledger) => (
              <Link
                key={ledger.id}
                to={`/ledger/${ledger.id}`}
                className="group bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 hover:border-emerald-200 hover:shadow-md transition-all relative overflow-hidden block"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                    <BookOpen className="text-emerald-600 w-6 h-6 group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-xl font-bold text-neutral-900 mb-2">{ledger.name}</h4>
                  <p className="text-sm text-neutral-500 mb-6">Created on {new Date(ledger.createdAt).toLocaleDateString()}</p>
                  
                  <div className="flex items-center justify-between text-emerald-600 font-semibold text-sm">
                    <span>View Details</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
            
            {ledgers.length === 0 && !showNewLedger && (
              <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="text-neutral-300 w-10 h-10" />
                </div>
                <p className="text-neutral-500 font-medium">No ledgers found. Create your first one to get started!</p>
              </div>
            )}
          </div>
        </section>

        {/* Pending Tasks Section */}
        <section className="xl:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-neutral-900">Pending Tasks</h3>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
            {pendingTasks.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-200 mb-3" />
                <p>All caught up! No pending tasks.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {pendingTasks.map(task => {
                  const customer = allCustomers.find(c => c.id === task.customerId);
                  const isOverdue = task.status === 'overdue' || isPast(new Date(task.dueDate));
                  
                  return (
                    <Link 
                      key={task.id} 
                      to={`/ledger/${task.ledgerId}`}
                      className="p-5 flex items-start gap-4 hover:bg-neutral-50 transition-colors block"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isOverdue ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">
                          {customer?.name || 'Unknown'} - ${task.principal.toLocaleString()}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {task.status === 'pending_approval' ? 'Needs Approval' : 'Collection Due'}
                        </p>
                        <p className={`text-xs font-semibold mt-2 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                          Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* New Ledger Modal */}
      {showNewLedger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-neutral-900 mb-6">Create New Ledger</h3>
            <form onSubmit={handleCreateLedger} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Ledger Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  placeholder="e.g., Team Investment A"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowNewLedger(false)}
                  className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

