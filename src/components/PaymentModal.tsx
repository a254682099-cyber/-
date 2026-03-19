import React, { useState } from 'react';
import { ledgerService } from '../services/ledgerService';
import { X, DollarSign, Info } from 'lucide-react';
import { motion } from 'motion/react';

import { User } from '../types';

interface PaymentModalProps {
  ledgerId: string;
  orderId: string;
  totalDue: number;
  currentPaid: number;
  userProfile: User | null;
  type?: 'interest' | 'principal';
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ ledgerId, orderId, totalDue, currentPaid, userProfile, type = 'principal', onClose }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const remaining = totalDue - currentPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) return;
    
    setLoading(true);
    try {
      await ledgerService.recordPayment(ledgerId, orderId, paymentAmount, type, userProfile?.displayName);
      
      // If fully paid and it's principal, auto-update status to completed
      if (type === 'principal' && currentPaid + paymentAmount >= totalDue) {
        await ledgerService.updateOrderStatus(ledgerId, orderId, 'active', 'completed');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900 transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className={`w-12 h-12 ${type === 'principal' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} rounded-xl flex items-center justify-center`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-neutral-900">{type === 'principal' ? '本金还款' : '利息收款'}</h3>
            <p className="text-neutral-500">{type === 'principal' ? '更新订单余额' : '记录利息收入'}</p>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">应付总额</span>
            <span className="font-bold text-neutral-900">${totalDue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">已付金额</span>
            <span className="font-bold text-emerald-600">${currentPaid.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
            <span className="text-sm font-bold text-neutral-900">剩余金额</span>
            <span className="font-bold text-red-500">${remaining.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">付款金额</label>
            <div className="relative">
              <input
                autoFocus
                type="number"
                step="0.01"
                max={remaining}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <DollarSign className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
            </div>
            <div className="flex justify-end mt-2">
              <button 
                type="button" 
                onClick={() => setAmount(remaining.toString())}
                className="text-xs text-emerald-600 font-semibold hover:text-emerald-700"
              >
                支付全部剩余金额
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-2xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '记录'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
