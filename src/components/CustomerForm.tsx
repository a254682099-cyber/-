import React, { useState } from 'react';
import { ledgerService } from '../services/ledgerService';
import { X, UserPlus, Phone, CreditCard, Camera } from 'lucide-react';
import { motion } from 'motion/react';

interface CustomerFormProps {
  ledgerId: string;
  onClose: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ ledgerId, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await ledgerService.addCustomer(ledgerId, { name, phone, idCard });
      onClose();
    } catch (error) {
      console.error('Failed to add customer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900 transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <UserPlus className="text-blue-600 w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-900">Add New Customer</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Full Name</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <UserPlus className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <Phone className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">ID Card / Passport Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="ID12345678"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <CreditCard className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
