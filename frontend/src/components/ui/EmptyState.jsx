import { motion } from 'framer-motion';
import { FileX, FolderOpen, Users, FileText, Search, Plus, Inbox } from 'lucide-react';

/**
 * EmptyState Component
 * 
 * Displays a professional empty state when no data is available.
 * Supports preset variants for common scenarios.
 */
export const EmptyState = ({
  icon: IconComponent = FileX,
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  actionLabel = null,
  onAction = null,
  variant = null, // 'projects' | 'users' | 'documents' | 'search' | 'filter'
}) => {
  // Preset configurations for common variants
  const presets = {
    projects: {
      icon: FolderOpen,
      title: 'No projects found',
      description: 'Start by creating your first project to manage progress, schedules, and budgets.',
    },
    users: {
      icon: Users,
      title: 'No users found',
      description: 'Invite team members to collaborate on projects and review documents.',
    },
    documents: {
      icon: FileText,
      title: 'No documents found',
      description: 'Upload documents to maintain a centralized record for all project files.',
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    },
    filter: {
      icon: Search,
      title: 'No matching items',
      description: 'No items match your current filters. Try adjusting or clearing filters.',
    },
    inbox: {
      icon: Inbox,
      title: 'All caught up!',
      description: 'You have no pending items at this time.',
    },
  };

  const preset = variant ? presets[variant] : {};
  const FinalIcon = preset.icon || IconComponent;
  const finalTitle = preset.title || title;
  const finalDescription = preset.description || description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-20 h-20 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
        <FinalIcon className="w-10 h-10 text-slate-400 dark:text-neutral-500" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {finalTitle}
      </h3>

      <p className="text-slate-600 dark:text-neutral-400 max-w-md mb-6">
        {finalDescription}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

/**
 * TableEmptyState Component
 * For use inside table tbody when no data
 */
export const TableEmptyState = ({
  message = 'No data available',
  colSpan = 1,
  icon: IconComponent = FileX,
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <IconComponent className="w-8 h-8 text-slate-400 dark:text-neutral-500" />
          </div>
          <p className="text-slate-500 dark:text-neutral-400 font-medium">{message}</p>
        </div>
      </td>
    </tr>
  );
};

/**
 * CardEmptyState Component
 * For use in card grids with col-span-full
 */
export const CardEmptyState = ({
  title = 'No items',
  description = 'Get started by creating your first item.',
  onAction = null,
  actionLabel = 'Create',
}) => {
  return (
    <div className="col-span-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border-2 border-dashed border-slate-200 dark:border-neutral-700 rounded-2xl py-16 px-8"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <FileX className="w-8 h-8 text-slate-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-slate-500 dark:text-neutral-400 mb-6 max-w-sm">{description}</p>
          {onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} />
              {actionLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmptyState;



