import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const MessagingCenter = ({ isOpen, onClose, notifications }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('alerts');

  const systemAlerts = notifications.filter((n) => n.type === 'Error' || n.type === 'Warning' || n.type === 'Info');
  const teamMessages = notifications.filter((n) => n.type === 'Success');

  const getIcon = (type) => {
    switch (type) {
      case 'Error':
        return <AlertCircle className="text-red-600" size={18} />;
      case 'Warning':
        return <AlertCircle className="text-yellow-600" size={18} />;
      case 'Success':
        return <CheckCircle className="text-green-600" size={18} />;
      default:
        return <Info className="text-blue-600" size={18} />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="bg-white rounded-2xl shadow-glass w-full max-w-md h-[80vh] flex flex-col overflow-hidden pointer-events-auto border border-slate-200/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="text-primary-600" size={20} />
            <h2 className="font-semibold text-slate-900">Messaging Center</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            System Alerts ({systemAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Team Messages ({teamMessages.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence mode="wait">
            {activeTab === 'alerts' ? (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {systemAlerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Bell size={48} className="mx-auto mb-4 text-slate-300" />
                    <p>No system alerts</p>
                  </div>
                ) : (
                  systemAlerts.map((alert) => (
                    <Card key={alert.id} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {getIcon(alert.type)}
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                            <p className="text-xs text-slate-600 mb-2">{alert.message}</p>
                            <p className="text-xs text-slate-400">{formatTimestamp(alert.timestamp)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {teamMessages.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
                    <p>No team messages</p>
                  </div>
                ) : (
                  teamMessages.map((message) => (
                    <Card key={message.id} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="text-primary-600" size={18} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{message.title}</h4>
                            <p className="text-xs text-slate-600 mb-2">{message.message}</p>
                            <p className="text-xs text-slate-400">{formatTimestamp(message.timestamp)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};






