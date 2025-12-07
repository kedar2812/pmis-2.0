import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { rolePermissions } from '@/mock';
import { toast } from 'sonner';
import { Loader2, Shield, Users, HardHat, PenTool, Building2, Globe } from 'lucide-react';

const roleIcons = {
  SPV_Official: Shield,
  PMNC_Team: Users,
  EPC_Contractor: HardHat,
  Consultant_Design: PenTool,
  Govt_Department: Building2,
  NICDC_HQ: Globe,
};

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (selectedRole) {
      setIsLoading(true);
      // Simulate async login
      await new Promise((resolve) => setTimeout(resolve, 800));
      login(selectedRole);
      toast.success(`Welcome back, ${t(`role.${selectedRole}`)}!`, {
        description: rolePermissions[selectedRole].dashboardView,
      });
      setIsLoading(false);
      navigate('/dashboard');
    }
  };

  const roles = [
    'SPV_Official',
    'PMNC_Team',
    'EPC_Contractor',
    'Consultant_Design',
    'Govt_Department',
    'NICDC_HQ',
  ];

  const selectedRoleData = selectedRole ? rolePermissions[selectedRole] : null;
  const RoleIcon = selectedRole ? roleIcons[selectedRole] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 shadow-2xl border-0 bg-white">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl font-bold text-primary-950 mb-2">{t('login.title')}</h1>
              <p className="text-lg text-gray-600">{t('login.subtitle')}</p>
            </motion.div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.selectRole')}
              </label>
              <Select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                aria-label="Select your role"
              >
                <option value="">{t('common.selectRole')}</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {t(`role.${role}`)} - {rolePermissions[role].accessLevel}
                  </option>
                ))}
              </Select>
            </div>

            <AnimatePresence>
              {selectedRole && selectedRoleData && RoleIcon && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-r from-primary-50 to-primary-100 p-5 rounded-lg border border-primary-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary-600 rounded-lg text-white">
                      <RoleIcon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary-950 mb-2">
                        {t(`role.${selectedRole}`)}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">{t('common.accessLevel')}:</span>
                          <span className="px-2 py-1 bg-white rounded text-primary-700 font-medium text-xs">
                            {selectedRoleData.accessLevel}
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          {selectedRoleData.dashboardView}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleLogin}
              disabled={!selectedRole || isLoading}
              className="w-full bg-primary-950 hover:bg-primary-900 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
              size="lg"
              aria-label="Login to system"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('login.authenticating')}
                </>
              ) : (
                t('login.enter')
              )}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;


