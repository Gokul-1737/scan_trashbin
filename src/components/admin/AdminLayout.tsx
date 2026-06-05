import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { motion } from 'framer-motion';

export const AdminLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar 
        isCollapsed={isCollapsed} 
        onToggle={() => setIsCollapsed(!isCollapsed)} 
      />
      
      <motion.main
        initial={false}
        animate={{ marginLeft: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen"
      >
        <div className="p-6">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
};
