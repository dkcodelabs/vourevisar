
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  resetScroll?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  className = '',
  resetScroll = true 
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  // Reset scroll to top when component mounts
  useEffect(() => {
    if (resetScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [resetScroll]);

  return (
    <div className="min-h-screen bg-white">
      <motion.div 
        className={`w-full ${className}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div 
          className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 safe-top safe-bottom"
          variants={itemVariants}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PageContainer;
