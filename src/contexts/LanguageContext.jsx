import { createContext, useContext, useState, useEffect } from 'react';

/**
 * LanguageContext - Language management for Google Translate
 * 
 * This context manages the selected language and triggers Google Translate.
 * Includes hardcoded English strings for all UI elements.
 * 
 * Note: Google Translate modifies the DOM directly which can conflict with React's
 * virtual DOM reconciliation. We add a workaround to suppress these errors.
 */

// Patch to prevent "removeChild" errors from Google Translate DOM manipulation
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console.warn) {
        console.warn('Google Translate DOM conflict: Cannot remove child from parent');
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };
}

const LanguageContext = createContext(undefined);

// All supported languages with their native names (alphabetically sorted)
export const SUPPORTED_LANGUAGES = [
  // A
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', native: 'Shqip' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hy', name: 'Armenian', native: 'Հայերdelays' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan' },
  // B
  { code: 'eu', name: 'Basque', native: 'Euskara' },
  { code: 'be', name: 'Belarusian', native: 'Беларуская' },
  { code: 'bs', name: 'Bosnian', native: 'Bosanski' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာ' },
  // C
  { code: 'ca', name: 'Catalan', native: 'Català' },
  { code: 'ceb', name: 'Cebuano', native: 'Cebuano' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  // D
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  // E
  { code: 'et', name: 'Estonian', native: 'Eesti' },
  // F
  { code: 'fil', name: 'Filipino', native: 'Filipino' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'fr', name: 'French', native: 'Français' },
  // G
  { code: 'gl', name: 'Galician', native: 'Galego' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  // H
  { code: 'ht', name: 'Haitian Creole', native: 'Kreyòl Ayisyen' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'haw', name: 'Hawaiian', native: 'ʻŌlelo Hawaiʻi' },
  { code: 'iw', name: 'Hebrew', native: 'עברית' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  // I
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  // J
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'jv', name: 'Javanese', native: 'Basa Jawa' },
  // K
  { code: 'kk', name: 'Kazakh', native: 'Қазақ' },
  { code: 'km', name: 'Khmer', native: 'ខ្មែរ' },
  { code: 'rw', name: 'Kinyarwanda', native: 'Kinyarwanda' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ku', name: 'Kurdish', native: 'Kurdî' },
  { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча' },
  // L
  { code: 'lo', name: 'Lao', native: 'ລາວ' },
  { code: 'la', name: 'Latin', native: 'Latina' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
  { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
  // M
  { code: 'mk', name: 'Macedonian', native: 'Македонски' },
  { code: 'mg', name: 'Malagasy', native: 'Malagasy' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'mt', name: 'Maltese', native: 'Malti' },
  { code: 'mi', name: 'Maori', native: 'Māori' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол' },
  // N
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'ny', name: 'Nyanja', native: 'Chichewa' },
  // O
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  // P
  { code: 'ps', name: 'Pashto', native: 'پښتو' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  // R
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  // S
  { code: 'sm', name: 'Samoan', native: 'Gagana Samoa' },
  { code: 'gd', name: 'Scots Gaelic', native: 'Gàidhlig' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
  { code: 'st', name: 'Sesotho', native: 'Sesotho' },
  { code: 'sn', name: 'Shona', native: 'Shona' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
  { code: 'so', name: 'Somali', native: 'Soomaali' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'su', name: 'Sundanese', native: 'Basa Sunda' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  // T
  { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'tk', name: 'Turkmen', native: 'Türkmen' },
  // U
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'uz', name: 'Uzbek', native: "O'zbek" },
  // V
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  // W
  { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
  // X
  { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
  // Y
  { code: 'yi', name: 'Yiddish', native: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  // Z
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
];

// Hardcoded English strings - Google Translate will translate these
const STRINGS = {
  // App
  'app.title': 'PMIS - Zaheerabad Industrial Area',

  // Common
  'common.login': 'Login',
  'common.logout': 'Logout',
  'common.dashboard': 'Integrated Dashboard',
  'common.projects': 'Projects',
  'common.documents': 'Documents',
  'common.schedule': 'Schedule',
  'common.cost': 'Cost Management',
  'common.risk': 'Risk Management',
  'common.gis': 'GIS & Mapping',
  'common.bim': '3D Model Viewer',
  'common.selectRole': 'Select Role',
  'common.welcome': 'Welcome',
  'common.language': 'Language',
  'common.profile': 'Profile',
  'common.notifications': 'Notifications',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.export': 'Export',
  'common.upload': 'Upload',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.status': 'Status',
  'common.progress': 'Progress',
  'common.budget': 'Budget',
  'common.spent': 'Spent',
  'common.remaining': 'Remaining',
  'common.name': 'Name',
  'common.date': 'Date',
  'common.actions': 'Actions',
  'common.target': 'Target',
  'common.found': 'found',
  'common.type': 'Type',
  'common.category': 'Category',
  'common.version': 'Version',
  'common.size': 'Size',
  'common.uploadedBy': 'Uploaded By',
  'common.manager': 'Manager',
  'common.location': 'Location',
  'common.description': 'Description',
  'common.startDate': 'Start Date',
  'common.endDate': 'End Date',
  'common.assignedTo': 'Assigned To',
  'common.priority': 'Priority',
  'common.impact': 'Impact',
  'common.probability': 'Probability',
  'common.owner': 'Owner',
  'common.identified': 'Identified',
  'common.allStatus': 'All Status',
  'common.allTypes': 'All Types',
  'common.allProjects': 'All Projects',
  'common.project': 'Project',
  'common.total': 'Total',
  'common.inProgress': 'In Progress',
  'common.completed': 'Completed',
  'common.planning': 'Planning',
  'common.onHold': 'On Hold',
  'common.cancelled': 'Cancelled',
  'common.draft': 'Draft',
  'common.underReview': 'Under Review',
  'common.approved': 'Approved',
  'common.rejected': 'Rejected',
  'common.closed': 'Closed',
  'common.mitigated': 'Mitigated',
  'common.assessed': 'Assessed',
  'common.low': 'Low',
  'common.medium': 'Medium',
  'common.high': 'High',
  'common.critical': 'Critical',
  'common.notStarted': 'Not Started',
  'common.delayed': 'Delayed',
  'common.creating': 'Creating...',
  'common.uploading': 'Uploading...',
  'common.authenticating': 'Authenticating...',
  'common.comingSoon': 'Coming soon',
  'common.accessLevel': 'Access Level',

  // Dashboard
  'dashboard.title': 'Integrated Dashboard',
  'dashboard.overview': 'Overview',
  'dashboard.kpis': 'Key Performance Indicators',
  'dashboard.recentProjects': 'Recent Projects',
  'dashboard.activeRisks': 'Active Risks',
  'dashboard.upcomingTasks': 'Upcoming Tasks',
  'dashboard.searchPlaceholder': 'Search projects, tasks, risks...',
  'dashboard.createProject': 'Create Project',
  'dashboard.progress': 'Progress',
  'dashboard.budgetVsSpent': 'Budget vs Spent (in Crores)',
  'dashboard.riskDistribution': 'Distribution',
  'dashboard.projectTimeline': 'Project Timeline',
  'dashboard.noRisksFound': 'No risks found matching your search.',
  'dashboard.noActiveRisks': 'No active risks.',
  'dashboard.noTasksFound': 'No tasks found matching your search.',
  'dashboard.noUpcomingTasks': 'No upcoming tasks.',

  // Projects
  'projects.title': 'Projects',
  'projects.subtitle': 'Manage and track all infrastructure projects',
  'projects.createProject': 'Create Project',
  'projects.searchPlaceholder': 'Search projects...',
  'projects.allStatus': 'All Status',
  'projects.noProjectsFound': 'No projects found',
  'projects.adjustFilters': 'Try adjusting your filters to see more results.',
  'projects.getStarted': 'Get started by creating your first project.',
  'projects.noProjectsAvailable': 'No projects available at the moment.',
  'projects.budget': 'Budget',
  'projects.budgetUtilization': 'Budget Utilization',
  'projects.totalProjects': 'Total Projects',
  'projects.totalBudget': 'Total Budget',

  // EDMS
  'edms.title': 'Documents',
  'edms.subtitle': 'Electronic Document Management System',
  'edms.searchPlaceholder': 'Search documents...',
  'edms.allStatus': 'All Status',
  'edms.allTypes': 'All Types',
  'edms.documentRepository': 'Document Repository',
  'edms.documents': 'documents',
  'edms.noDocumentsFound': 'No documents found',
  'edms.adjustFilters': 'Try adjusting your filters to see more results.',
  'edms.uploadFirst': 'Upload your first document to get started.',
  'edms.uploadDocument': 'Upload Document',

  // Scheduling
  'scheduling.title': 'Scheduling',
  'scheduling.subtitle': 'Project Scheduling and Timeline Tracking',
  'scheduling.ganttChart': 'Gantt Chart',
  'scheduling.listView': 'List View',
  'scheduling.filterByProject': 'Filter by Project:',
  'scheduling.ganttChartView': 'Gantt Chart View',
  'scheduling.projectProgress': 'Project Progress',

  // Cost Management
  'cost.title': 'Cost Management',
  'cost.subtitle': 'Budget Forecasting and Cost Management',
  'cost.totalBudget': 'Total Budget',
  'cost.totalSpent': 'Total Spent',
  'cost.committed': 'Committed',
  'cost.remaining': 'Remaining',

  // Risk Management
  'risk.title': 'Risk Management',
  'risk.subtitle': 'Risk Register and Mitigation Planning',
  'risk.totalRisks': 'Total Risks',
  'risk.activeRisks': 'Active Risks',
  'risk.highImpact': 'High Impact',
  'risk.mitigated': 'Mitigated',

  // BIM
  'bim.title': '3D Model Viewer',
  'bim.subtitle': '3D Building Information Modeling Viewer',
  'bim.modelViewer': '3D Model Viewer',

  // GIS
  'gis.title': 'GIS & Mapping',
  'gis.subtitle': 'Geographic Information System & Spatial Mapping',
  'gis.projectLocationsMap': 'Project Locations Map - India',

  // Communications
  'communications.title': 'Communications',
  'communications.subtitle': 'Messages and Internal Communications',

  // Procurement
  'procurement.title': 'Procurement',
  'procurement.subtitle': 'Tenders and Contract Management',

  // E-Procurement
  'eprocurement.title': 'E-Procurement',
  'eprocurement.subtitle': 'Electronic Procurement Portal',

  // Workflow
  'workflow.title': 'Workflow Configuration',
  'workflow.subtitle': 'Configure and Manage Approval Workflows',

  // Approvals
  'approvals.title': 'Approvals',
  'approvals.subtitle': 'Pending Approvals and Reviews',

  // Reimbursement
  'reimbursement.title': 'Reimbursement',
  'reimbursement.subtitle': 'Expense Claims and Reimbursements',

  // RA Billing
  'billing.title': 'RA Billing',
  'billing.subtitle': 'Running Account Bills Management',

  // Fund Management
  'funds.title': 'Fund Management',
  'funds.subtitle': 'Project Funds Allocation and Tracking',

  // Budgeting
  'budgeting.title': 'Budgeting',
  'budgeting.subtitle': 'Budget Planning and Forecasting',

  // BOQ
  'boq.title': 'BOQ Management',
  'boq.subtitle': 'Bill of Quantities Management',

  // User Management
  'users.title': 'User Management',
  'users.subtitle': 'Manage Users, Roles and Permissions',

  // Role Manager
  'roles.title': 'Role Manager',
  'roles.subtitle': 'Configure Roles and Access Control',

  // ETP Master
  'etp.title': 'ETP Master',
  'etp.subtitle': 'ETP Configuration and Management',

  // Audit Logs
  'audit.title': 'Audit Logs',
  'audit.subtitle': 'System Activity and Change History',

  // Master Data
  'masterdata.title': 'Master Data',
  'masterdata.subtitle': 'Manage Reference Data and Configurations',

  // Status values
  'status.planning': 'Planning',
  'status.inProgress': 'In Progress',
  'status.onHold': 'On Hold',
  'status.completed': 'Completed',
  'status.cancelled': 'Cancelled',
  'status.draft': 'Draft',
  'status.underReview': 'Under Review',
  'status.approved': 'Approved',
  'status.rejected': 'Rejected',
  'status.closed': 'Closed',
  'status.mitigated': 'Mitigated',
  'status.assessed': 'Assessed',
  'status.notStarted': 'Not Started',
  'status.delayed': 'Delayed',

  // Priority values
  'priority.low': 'Low',
  'priority.medium': 'Medium',
  'priority.high': 'High',
  'priority.critical': 'Critical',

  // Header
  'header.english': 'English',
  'header.hindi': 'हिंदी',
  'header.telugu': 'తెలుగు',

  // Sidebar
  'sidebar.pmisZia': 'PMIS ZIA',
  'sidebar.programmeManagement': 'Programme Management',

  // Login
  'login.title': 'Programme Management Information System',
  'login.subtitle': 'Zaheerabad Industrial Area',
  'login.selectRole': 'Select your role to continue',
  'login.enter': 'Enter System',
  'login.authenticating': 'Authenticating...',
  'login.welcomeBack': 'Welcome back,',

  // Create Project Modal
  'project.createNewProject': 'Create New Project',
  'project.projectName': 'Project Name',
  'project.description': 'Description',
  'project.startDate': 'Start Date',
  'project.endDate': 'End Date',
  'project.budget': 'Budget (₹)',
  'project.status': 'Status',
  'project.category': 'Category',
  'project.projectManager': 'Project Manager',

  // Upload Modal
  'upload.uploadDocument': 'Upload Document',
  'upload.dragAndDrop': 'Drag and drop your file here',
  'upload.or': 'or',
  'upload.browseFiles': 'Browse Files',

  // Translation
  'translation.translate': 'Translate',
  'translation.enterTextToTranslate': 'Enter text to translate',
  'translation.translationFailed': 'Translation failed',
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  /**
   * Helper to clear all Google Translate cookies
   * This is critical to stop the "Active Translation" state
   */
  const clearGoogleCookies = () => {
    const domain = window.location.hostname;
    const pastDate = 'Thu, 01 Jan 1970 00:00:00 UTC';

    // Clear cookie for current domain, root path, and dot-prefixed domain
    document.cookie = `googtrans=; expires=${pastDate}; path=/;`;
    document.cookie = `googtrans=; expires=${pastDate}; path=/; domain=${domain}`;
    document.cookie = `googtrans=; expires=${pastDate}; path=/; domain=.${domain}`;
  };

  // callback to reset widget
  const resetWidgetToOriginal = () => {
    const googleSelect = document.querySelector('.goog-te-combo');
    if (googleSelect) {
      googleSelect.value = '';
      googleSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // Load saved language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('pmis_language');

    if (savedLang && savedLang !== 'en') {
      setLanguage(savedLang);
      // Trigger translation for non-English languages after a delay
      setTimeout(() => triggerGoogleTranslate(savedLang), 1500);
    } else {
      // If 'en' or no preference, FORCE cleanup
      // This ensures we don't start with active translation by accident
      setLanguage('en');
      clearGoogleCookies();
      // Try to reset widget just in case
      setTimeout(resetWidgetToOriginal, 1000);
    }
  }, []);

  /**
   * Trigger Google Translate programmatically via the hidden combo box
   * This provides seamless in-page translation
   */
  const triggerGoogleTranslate = (langCode) => {
    const googleSelect = document.querySelector('.goog-te-combo');

    // Method 1: Combo Box (Preferred)
    if (googleSelect) {
      // For English: set to empty string to restore original
      // For other languages: set to language code
      googleSelect.value = langCode === 'en' ? '' : langCode;
      googleSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (langCode !== 'en') {
      // Retry for non-English if API isn't ready
      setTimeout(() => {
        const retrySelect = document.querySelector('.goog-te-combo');
        if (retrySelect) {
          retrySelect.value = langCode;
          retrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 1000);
    }

    // Method 2: Cookie Management (Persistence)
    if (langCode === 'en') {
      clearGoogleCookies();
    } else {
      const cookieValue = `/en/${langCode}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=.${window.location.hostname}`;
    }
  };

  const handleSetLanguage = (lang) => {
    // If switching TO English FROM another language, we MUST reload
    // This is the only way to completely clear Google's DOM changes
    if (lang === 'en' && language !== 'en') {
      clearGoogleCookies();
      localStorage.setItem('pmis_language', 'en');
      setLanguage('en');
      window.location.reload();
      return;
    }

    setLanguage(lang);
    localStorage.setItem('pmis_language', lang);

    // Dispatch custom event to notify GoogleTranslateWidget to load script
    window.dispatchEvent(new CustomEvent('pmis-language-change', { detail: { language: lang } }));

    // Trigger the translation (or reset)
    setTimeout(() => triggerGoogleTranslate(lang), 100);
  };

  /**
   * Translation function - returns hardcoded English strings
   * Google Translate handles the actual translation to other languages
   */
  const t = (key) => {
    return STRINGS[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
