// Centralized color scheme for consistent UI
export const colors = {
  // Status colors - using semantic naming
  status: {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-600 dark:text-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600 dark:text-amber-500',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-500',
    },
    info: {
      bg: 'bg-primary-50 dark:bg-primary-900/30',
      text: 'text-primary-700 dark:text-primary-400',
      border: 'border-primary-200 dark:border-primary-800',
      icon: 'text-primary-600 dark:text-primary-500',
    },
    neutral: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700',
      icon: 'text-gray-600 dark:text-gray-400',
    },
  },
  // Priority colors
  priority: {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-600 dark:text-red-500',
    },
    high: {
      bg: 'bg-accent-50 dark:bg-accent-900/30',
      text: 'text-accent-700 dark:text-accent-400',
      icon: 'text-accent-600 dark:text-accent-500',
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      icon: 'text-amber-600 dark:text-amber-500',
    },
    low: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: 'text-emerald-600 dark:text-emerald-500',
    },
  },
  // Impact colors
  impact: {
    critical: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    high: 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400',
    medium: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    low: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
};

// Helper functions for consistent status colors
export const getStatusColor = (status) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('completed') || statusLower.includes('approved') || statusLower.includes('closed')) {
    return colors.status.success;
  }
  if (statusLower.includes('review') || statusLower.includes('assessed') || statusLower.includes('planning')) {
    return colors.status.warning;
  }
  if (statusLower.includes('rejected') || statusLower.includes('cancelled') || statusLower.includes('delayed')) {
    return colors.status.error;
  }
  if (statusLower.includes('progress') || statusLower.includes('mitigated')) {
    return colors.status.info;
  }
  return colors.status.neutral;
};

export const getPriorityColor = (priority) => {
  const priorityLower = priority.toLowerCase();
  if (priorityLower === 'critical') return colors.priority.critical;
  if (priorityLower === 'high') return colors.priority.high;
  if (priorityLower === 'medium') return colors.priority.medium;
  return colors.priority.low;
};

export const getImpactColor = (impact) => {
  const impactLower = impact.toLowerCase();
  if (impactLower === 'critical') return colors.impact.critical;
  if (impactLower === 'high') return colors.impact.high;
  if (impactLower === 'medium') return colors.impact.medium;
  return colors.impact.low;
};

