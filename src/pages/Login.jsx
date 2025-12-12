import { motion } from 'framer-motion';
import OtpLogin from '@/components/auth/OtpLogin';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <OtpLogin />
      </motion.div>
    </div>
  );
};

export default Login;





