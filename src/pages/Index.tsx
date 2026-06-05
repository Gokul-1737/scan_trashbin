import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  const { user, role, isAdmin, isLoading } = useAuth();

  if (isLoading || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Routing you to the right place...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to={isAdmin ? '/admin' : '/scan'} replace />;
};

export default Index;
