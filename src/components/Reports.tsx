import React, { useState, useEffect } from 'react';
import { ledgerService } from '../services/ledgerService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { TrendingUp, DollarSign, Users, FileText } from 'lucide-react';
import { motion } from 'motion/react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Reports: React.FC = () => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubLedgers = ledgerService.subscribeToLedgers((data) => {
      setLedgers(data);
      
      // Fetch all orders and customers for these ledgers
      const orderUnsubs: any[] = [];
      const customerUnsubs: any[] = [];
      let allOrders: any[] = [];
      let allCustomers: any[] = [];
      
      data.forEach(ledger => {
        const unsubO = ledgerService.subscribeToOrders(ledger.id, (ledgerOrders) => {
          allOrders = [...allOrders.filter(o => o.ledgerId !== ledger.id), ...ledgerOrders];
          setOrders([...allOrders]);
        });
        orderUnsubs.push(unsubO);

        const unsubC = ledgerService.subscribeToCustomers(ledger.id, (ledgerCustomers) => {
          allCustomers = [...allCustomers.filter(c => c.ledgerId !== ledger.id), ...ledgerCustomers];
          setCustomers([...allCustomers]);
        });
        customerUnsubs.push(unsubC);
      });

      setLoading(false);

      return () => {
        orderUnsubs.forEach(u => u());
        customerUnsubs.forEach(u => u());
      };
    });

    return () => unsubLedgers();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-neutral-500">Loading reports...</div>;
  }

  // Calculate Stats
  const totalPrincipal = orders.reduce((sum, o) => sum + (o.principal || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalOutstanding = totalPrincipal - totalPaid;

  // Status Distribution Data
  const statusCounts = orders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  
  const statusData = Object.keys(statusCounts).map(key => ({
    name: key.replace('_', ' ').toUpperCase(),
    value: statusCounts[key]
  }));

  // Monthly Volume Data (Mocked based on createdAt)
  const monthlyDataMap = orders.reduce((acc: any, order) => {
    const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
    if (!acc[month]) acc[month] = { name: month, principal: 0, paid: 0 };
    acc[month].principal += order.principal || 0;
    acc[month].paid += order.paidAmount || 0;
    return acc;
  }, {});
  
  const monthlyData = Object.values(monthlyDataMap);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Analytics & Reports</h2>
        <p className="text-sm text-neutral-500">Overview of your financial performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">Total Disbursed</p>
              <h3 className="text-2xl font-bold text-neutral-900">${totalPrincipal.toLocaleString()}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">Total Collected</p>
              <h3 className="text-2xl font-bold text-neutral-900">${totalPaid.toLocaleString()}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold text-neutral-900">{orders.length}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">Total Customers</p>
              <h3 className="text-2xl font-bold text-neutral-900">{customers.length}</h3>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Volume Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900 mb-6">Monthly Volume</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{fill: '#f5f5f5'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="principal" name="Disbursed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900 mb-6">Order Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
