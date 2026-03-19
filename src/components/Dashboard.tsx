import React, { useState, useEffect } from 'react';
import { ledgerService } from '../services/ledgerService';
import { Plus, ChevronRight, TrendingUp, Users, DollarSign, Clock, BookOpen, AlertCircle, CheckCircle2, BarChart3, Search, X, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format, isPast, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { auth } from '../firebase';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [showNewLedger, setShowNewLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  
  const [editingLedger, setEditingLedger] = useState<any | null>(null);
  const [deletingLedger, setDeletingLedger] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleUpdateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLedger || !editingLedger.name.trim()) return;
    await ledgerService.updateLedger(editingLedger.id, editingLedger.name);
    setEditingLedger(null);
  };

  const handleDeleteLedger = async () => {
    if (!deletingLedger) return;
    await ledgerService.deleteLedger(deletingLedger.id);
    setDeletingLedger(null);
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

  const monthlyStats = [
    { name: '已放款', value: allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= startOfMonth(new Date()) && d <= endOfMonth(new Date());
    }).reduce((sum, o) => sum + (o.principal || 0), 0) },
    { name: '已收回', value: allOrders.reduce((sum, o) => {
      // This is a bit complex since payments are in subcollections. 
      // For dashboard quick stats, let's just use the paidAmount field which we update.
      return sum + (o.paidAmount || 0);
    }, 0) },
    { name: '利息', value: totalInterest }
  ];

  const stats = [
    { label: '总本金', value: `$${totalCapital.toLocaleString()}`, icon: DollarSign, color: 'bg-blue-500' },
    { label: '预期利息', value: `$${totalInterest.toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: '总收回', value: `$${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'bg-purple-500' },
    { label: '待处理任务', value: pendingTasks.length.toString(), icon: Clock, color: 'bg-amber-500' },
  ];

  const searchResults = searchTerm.trim() ? {
    customers: allCustomers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone?.includes(searchTerm)
    ).slice(0, 5),
    orders: allOrders.filter(o => {
      const customer = allCustomers.find(c => c.id === o.customerId);
      return customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
    }).slice(0, 5)
  } : null;

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">欢迎回来！</h1>
          <p className="text-neutral-500 mt-1">这是您今天所有账本的概况。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-emerald-600 transition-colors" />
            <input 
              type="text"
              placeholder="搜索客户或订单..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl w-full md:w-80 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowNewLedger(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" />
            新建账本
          </button>
        </div>
      </div>

      {/* Search Results Overlay */}
      <AnimatePresence>
        {searchResults && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100 space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">"{searchTerm}" 的搜索结果</h2>
              <button onClick={() => setSearchTerm('')} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">客户</h3>
                <div className="space-y-3">
                  {searchResults.customers.map(customer => (
                    <Link 
                      key={customer.id} 
                      to={`/ledger/${customer.ledgerId}/customer/${customer.id}`}
                      className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl hover:bg-emerald-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-400 group-hover:text-emerald-600 transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{customer.name}</p>
                        <p className="text-xs text-neutral-500">{customer.phone}</p>
                      </div>
                      <ChevronRight className="ml-auto w-5 h-5 text-neutral-300 group-hover:text-emerald-600 transition-all" />
                    </Link>
                  ))}
                  {searchResults.customers.length === 0 && <p className="text-sm text-neutral-400 italic">未找到客户。</p>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">订单</h3>
                <div className="space-y-3">
                  {searchResults.orders.map(order => {
                    const customer = allCustomers.find(c => c.id === order.customerId);
                    return (
                      <Link 
                        key={order.id} 
                        to={`/ledger/${order.ledgerId}/order/${order.id}`}
                        className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl hover:bg-blue-50 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-400 group-hover:text-blue-600 transition-colors">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{customer?.name || '未知'} - ${order.principal.toLocaleString()}</p>
                          <p className="text-xs text-neutral-500">#{order.id.slice(0, 8)}</p>
                        </div>
                        <ChevronRight className="ml-auto w-5 h-5 text-neutral-300 group-hover:text-blue-600 transition-all" />
                      </Link>
                    );
                  })}
                  {searchResults.orders.length === 0 && <p className="text-sm text-neutral-400 italic">未找到订单。</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Ledgers Section */}
        <section className="xl:col-span-2 space-y-10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-neutral-900">您的账本</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ledgers.map((ledger) => {
                const isOwner = ledger.ownerUid === auth.currentUser?.uid;
                return (
                  <div
                    key={ledger.id}
                    className="group bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 hover:border-emerald-200 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110"></div>
                    
                    {/* Options Menu */}
                    <div className="absolute top-4 right-4 z-10">
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveMenu(activeMenu === ledger.id ? null : ledger.id);
                          }}
                          className="p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-all"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence>
                          {activeMenu === ledger.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-100 py-2 z-20"
                            >
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingLedger(ledger);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                编辑名称
                              </button>
                              {isOwner && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeletingLedger(ledger);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  删除账本
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <Link to={`/ledger/${ledger.id}`} className="relative block">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                        <BookOpen className="text-emerald-600 w-6 h-6 group-hover:text-white transition-colors" />
                      </div>
                      <h4 className="text-xl font-bold text-neutral-900 mb-2">{ledger.name}</h4>
                      <p className="text-sm text-neutral-500 mb-6">创建于 {format(new Date(ledger.createdAt), 'yyyy年MM月dd日')}</p>
                      
                      <div className="flex items-center justify-between text-emerald-600 font-semibold text-sm">
                        <span>查看详情</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </div>
                );
              })}
              
              {ledgers.length === 0 && !showNewLedger && (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="text-neutral-300 w-10 h-10" />
                  </div>
                  <p className="text-neutral-500 font-medium">未找到账本。创建一个开始吧！</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Chart */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
                业绩概览
              </h3>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">全局统计</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} hide />
                  <Tooltip 
                    cursor={{fill: '#f5f5f5'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Pending Tasks Section */}
        <section className="xl:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-neutral-900">待处理任务</h3>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
            {pendingTasks.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-200 mb-3" />
                <p>一切就绪！没有待处理任务。</p>
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
                          {customer?.name || '未知'} - ${task.principal.toLocaleString()}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {task.status === 'pending_approval' ? '需要审批' : '收款到期'}
                        </p>
                        <p className={`text-xs font-semibold mt-2 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                          到期日: {format(new Date(task.dueDate), 'yyyy年MM月dd日')}
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
            <h3 className="text-2xl font-bold text-neutral-900 mb-6">新建账本</h3>
            <form onSubmit={handleCreateLedger} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">账本名称</label>
                <input
                  autoFocus
                  type="text"
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  placeholder="例如：团队投资A"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowNewLedger(false)}
                  className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
                >
                  创建
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Ledger Modal */}
      {editingLedger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-neutral-900 mb-6">编辑账本名称</h3>
            <form onSubmit={handleUpdateLedger} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">账本名称</label>
                <input
                  autoFocus
                  type="text"
                  value={editingLedger.name}
                  onChange={(e) => setEditingLedger({ ...editingLedger, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditingLedger(null)}
                  className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
                >
                  保存更改
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Ledger Modal */}
      {deletingLedger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-2 text-center">删除账本？</h3>
            <p className="text-neutral-500 text-center mb-8">
              您确定要删除 <span className="font-bold text-neutral-900">"{deletingLedger.name}"</span> 吗？
              此操作无法撤销，与此账本关联的所有数据都将丢失。
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setDeletingLedger(null)}
                className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteLedger}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
              >
                删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

