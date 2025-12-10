import { motion } from 'framer-motion';

export const GraphLoader = ({ height = 300, type = 'bar' }) => {
  const shimmerVariants = {
    animate: {
      backgroundPosition: ['0% 0%', '100% 0%'],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  };

  if (type === 'pie') {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <motion.div
          className="relative w-64 h-64"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full border-8 border-slate-200 border-t-primary-600" />
        </motion.div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="space-y-4 p-6" style={{ height }}>
        <motion.div
          className="h-4 rounded-lg"
          style={{
            background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            backgroundSize: '200% 100%',
          }}
          variants={shimmerVariants}
          animate="animate"
        />
        <motion.div
          className="h-4 rounded-lg w-3/4"
          style={{
            background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            backgroundSize: '200% 100%',
          }}
          variants={shimmerVariants}
          animate="animate"
        />
        <motion.div
          className="h-4 rounded-lg w-5/6"
          style={{
            background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            backgroundSize: '200% 100%',
          }}
          variants={shimmerVariants}
          animate="animate"
        />
        <motion.div
          className="h-4 rounded-lg w-2/3"
          style={{
            background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            backgroundSize: '200% 100%',
          }}
          variants={shimmerVariants}
          animate="animate"
        />
      </div>
    );
  }

  // Bar chart skeleton
  return (
    <div className="flex items-end justify-between gap-2 p-6" style={{ height }}>
      {[0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 0.45].map((height, index) => (
        <motion.div
          key={index}
          className="flex-1 rounded-t-lg"
          style={{
            height: `${height * 100}%`,
            background: 'linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            backgroundSize: '100% 200%',
          }}
          variants={shimmerVariants}
          animate="animate"
          transition={{
            delay: index * 0.1,
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};



