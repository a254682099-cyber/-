import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LayoutDashboard, LogOut, BookOpen, Users, PieChart, Bell, AlertCircle, Clock, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ledgerService } from '../services/ledgerService';
import { format, isPast, isToday, addDays } from 'date-fns';

interface LayoutProps {
  user: User;
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: PieChart, label: 'Reports', path: '/reports' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const unsubLedgers = ledgerService.subscribeToLedgers((ledgers) => {
      const orderUnsubs: any[] = [];
      let allOrders: any[] = [];

      ledgers.forEach(ledger => {
        const unsubO = ledgerService.subscribeToOrders(ledger.id, (orders) => {
          allOrders = [...allOrders.filter(o => o.ledgerId !== ledger.id), ...orders];
          
          // Calculate notifications
          const notifs: any[] = [];
          allOrders.forEach(order => {
            if (order.status === 'completed' || order.status === 'cancelled') return;
            
            const dueDate = new Date(order.dueDate);
            const isOverdue = isPast(dueDate) && !isToday(dueDate);
            const isDueSoon = !isOverdue && dueDate <= addDays(new Date(), 3);
            const isPending = order.status === 'pending_approval';

            if (isOverdue) {
              notifs.push({ id: order.id, type: 'overdue', ledgerId: order.ledgerId, message: `Order #${order.id.slice(0,6)} is overdue!`, date: dueDate });
            } else if (isDueSoon) {
              notifs.push({ id: order.id, type: 'due_soon', ledgerId: order.ledgerId, message: `Order #${order.id.slice(0,6)} is due soon.`, date: dueDate });
            } else if (isPending) {
              notifs.push({ id: order.id, type: 'pending', ledgerId: order.ledgerId, message: `Order #${order.id.slice(0,6)} needs approval.`, date: new Date(order.createdAt) });
            }
          });

          // Sort by date (most urgent first)
          notifs.sort((a, b) => a.date.getTime() - b.date.getTime());
          setNotifications(notifs);
        });
        orderUnsubs.push(unsubO);
      });

      return () => {
        orderUnsubs.forEach(u => u());
      };
    });

    return () => unsubLedgers();
  }, [user]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white border-b border-neutral-200 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <BookOpen className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-neutral-900 tracking-tight">Smart Ledger</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors relative"
          >
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Backdrop for Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-neutral-200 flex flex-col z-50 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 md:p-8">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-neutral-900 tracking-tight">Smart Ledger</span>
          </div>

          <div className="md:hidden flex items-center justify-between mb-8">
            <span className="text-lg font-bold text-neutral-900">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-neutral-100 rounded-full">
              <X className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 md:p-8 border-t border-neutral-100">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'Guest'}`} 
              className="w-10 h-10 rounded-full border-2 border-emerald-100 shrink-0" 
              alt="" 
            />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-neutral-900 truncate">{user.displayName || 'Guest User'}</p>
              <p className="text-xs text-neutral-500 truncate">{user.email || 'guest@example.com'}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <header className="hidden md:flex h-20 bg-white border-b border-neutral-200 px-10 items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-neutral-900">
            {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
          </h2>
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors relative"
            >
              <Bell className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                    <h3 className="font-bold text-neutral-900">Notifications</h3>
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-neutral-500 text-sm">
                        You're all caught up!
                      </div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div 
                          key={`${notif.id}-${idx}`}
                          onClick={() => {
                            setShowNotifications(false);
                            navigate(`/ledger/${notif.ledgerId}`);
                          }}
                          className="p-4 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer transition-colors flex gap-4"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            notif.type === 'overdue' ? 'bg-red-100 text-red-600' :
                            notif.type === 'due_soon' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notif.type === 'overdue' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{notif.message}</p>
                            <p className="text-xs text-neutral-500 mt-1">
                              {notif.type === 'pending' ? 'Created ' : 'Due '}
                              {format(notif.date, 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Mobile Notifications Dropdown (Absolute to screen) */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden fixed top-16 left-4 right-4 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-40"
            >
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h3 className="font-bold text-neutral-900">Notifications</h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                  {notifications.length} New
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-sm">
                    You're all caught up!
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div 
                      key={`${notif.id}-${idx}`}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(`/ledger/${notif.ledgerId}`);
                      }}
                      className="p-4 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer transition-colors flex gap-4"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'overdue' ? 'bg-red-100 text-red-600' :
                        notif.type === 'due_soon' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notif.type === 'overdue' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{notif.message}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {notif.type === 'pending' ? 'Created ' : 'Due '}
                          {format(notif.date, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
