// Centralized color scheme for consistent UI
export const colors = {
  // Status colors - using semantic naming
  status: {
    success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: 'text-amber-600',
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'text-red-600',
    },
    info: {
      bg: 'bg-primary-50',
      text: 'text-primary-700',
      border: 'border-primary-200',
      icon: 'text-primary-600',
    },
    neutral: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: 'text-gray-600',
    },
  },
  // Priority colors
  priority: {
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: 'text-red-600',
    },
    high: {
      bg: 'bg-accent-50',
      text: 'text-accent-700',
      icon: 'text-accent-600',
    },
    medium: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: 'text-amber-600',
    },
    low: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
    },
  },
  // Impact colors
  impact: {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-accent-50 text-accent-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-emerald-50 text-emerald-700',
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

