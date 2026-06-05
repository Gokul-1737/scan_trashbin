import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Recycle,
  Trash2,
  Gift,
  Users,
  QrCode,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Leaf,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Recycle, label: 'Waste & Points', path: '/admin/waste' },
  { icon: Trash2, label: 'Bins Management', path: '/admin/bins' },
  { icon: Gift, label: 'Rewards', path: '/admin/rewards' },
  { icon: CheckCircle, label: 'Reward Requests', path: '/admin/requests' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: QrCode, label: 'QR & Transactions', path: '/admin/transactions' },
  { icon: FileText, label: 'Reports', path: '/admin/reports' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 72 },
  };

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md flex-shrink-0"
        >
          <Leaf className="w-5 h-5 text-primary-foreground" />
        </motion.div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
                Smart Recycle
              </h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="block"
            >
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'animate-pulse-slow')} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-0 w-1 h-8 bg-primary-foreground rounded-l-full"
                  />
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User & Logout */}
      <div className="p-3 space-y-2">
        <AnimatePresence>
          {!isCollapsed && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 text-sm"
            >
              <p className="font-medium text-sidebar-foreground truncate">
                {user.email}
              </p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            'w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border bg-background shadow-md hover:bg-accent"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </Button>
    </motion.aside>
  );
};
