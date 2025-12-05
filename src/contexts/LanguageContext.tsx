import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'hi' | 'te';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'app.title': 'PMIS - Zaheerabad Industrial Area',
    'common.login': 'Login',
    'common.logout': 'Logout',
    'common.dashboard': 'Dashboard',
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
    // Dashboard
    'dashboard.title': 'Unified Dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.kpis': 'Key Performance Indicators',
    'dashboard.recentProjects': 'Recent Projects',
    'dashboard.activeRisks': 'Active Risks',
    'dashboard.upcomingTasks': 'Upcoming Tasks',
    // Login
    'login.title': 'Programme Management Information System',
    'login.subtitle': 'Zaheerabad Industrial Area',
    'login.selectRole': 'Select your role to continue',
    'login.enter': 'Enter System',
    // Roles
    'role.SPV_Official': 'SPV Official',
    'role.PMNC_Team': 'PMNC Team',
    'role.EPC_Contractor': 'EPC Contractor',
    'role.Consultant_Design': 'Design Consultant',
    'role.Govt_Department': 'Government Department',
    'role.NICDC_HQ': 'NICDC Headquarters',
  },
  hi: {
    // Common
    'app.title': 'PMIS - ज़हीराबाद औद्योगिक क्षेत्र',
    'common.login': 'लॉगिन',
    'common.logout': 'लॉगआउट',
    'common.dashboard': 'डैशबोर्ड',
    'common.projects': 'परियोजनाएं',
    'common.documents': 'दस्तावेज़',
    'common.schedule': 'अनुसूची',
    'common.cost': 'लागत प्रबंधन',
    'common.risk': 'जोखिम प्रबंधन',
    'common.gis': 'GIS और मानचित्रण',
    'common.bim': '3D मॉडल व्यूअर',
    'common.selectRole': 'भूमिका चुनें',
    'common.welcome': 'स्वागत है',
    'common.language': 'भाषा',
    'common.profile': 'प्रोफ़ाइल',
    'common.notifications': 'सूचनाएं',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.export': 'निर्यात',
    'common.upload': 'अपलोड',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.view': 'देखें',
    'common.status': 'स्थिति',
    'common.progress': 'प्रगति',
    'common.budget': 'बजट',
    'common.spent': 'खर्च',
    'common.remaining': 'शेष',
    'common.name': 'नाम',
    'common.date': 'तारीख',
    'common.actions': 'कार्रवाई',
    // Dashboard
    'dashboard.title': 'एकीकृत डैशबोर्ड',
    'dashboard.overview': 'अवलोकन',
    'dashboard.kpis': 'मुख्य प्रदर्शन संकेतक',
    'dashboard.recentProjects': 'हाल की परियोजनाएं',
    'dashboard.activeRisks': 'सक्रिय जोखिम',
    'dashboard.upcomingTasks': 'आगामी कार्य',
    // Login
    'login.title': 'कार्यक्रम प्रबंधन सूचना प्रणाली',
    'login.subtitle': 'ज़हीराबाद औद्योगिक क्षेत्र',
    'login.selectRole': 'जारी रखने के लिए अपनी भूमिका चुनें',
    'login.enter': 'सिस्टम में प्रवेश करें',
    // Roles
    'role.SPV_Official': 'SPV अधिकारी',
    'role.PMNC_Team': 'PMNC टीम',
    'role.EPC_Contractor': 'EPC ठेकेदार',
    'role.Consultant_Design': 'डिज़ाइन सलाहकार',
    'role.Govt_Department': 'सरकारी विभाग',
    'role.NICDC_HQ': 'NICDC मुख्यालय',
  },
  te: {
    // Common
    'app.title': 'PMIS - జహీరాబాద్ ఇండస్ట్రియల్ ఏరియా',
    'common.login': 'లాగిన్',
    'common.logout': 'లాగ్అవుట్',
    'common.dashboard': 'డాష్బోర్డ్',
    'common.projects': 'ప్రాజెక్టులు',
    'common.documents': 'పత్రాలు',
    'common.schedule': 'షెడ్యూల్',
    'common.cost': 'ఖర్చు నిర్వహణ',
    'common.risk': 'రిస్క్ నిర్వహణ',
    'common.gis': 'GIS & మ్యాపింగ్',
    'common.bim': '3D మోడల్ వ్యూయర్',
    'common.selectRole': 'పాత్ర ఎంచుకోండి',
    'common.welcome': 'స్వాగతం',
    'common.language': 'భాష',
    'common.profile': 'ప్రొఫైల్',
    'common.notifications': 'నోటిఫికేషన్లు',
    'common.search': 'శోధించు',
    'common.filter': 'ఫిల్టర్',
    'common.export': 'ఎగుమతి',
    'common.upload': 'అప్‌లోడ్',
    'common.save': 'సేవ్',
    'common.cancel': 'రద్దు చేయి',
    'common.delete': 'తొలగించు',
    'common.edit': 'సవరించు',
    'common.view': 'చూడండి',
    'common.status': 'స్థితి',
    'common.progress': 'ప్రగతి',
    'common.budget': 'బడ్జెట్',
    'common.spent': 'ఖర్చు',
    'common.remaining': 'మిగిలిన',
    'common.name': 'పేరు',
    'common.date': 'తేదీ',
    'common.actions': 'చర్యలు',
    // Dashboard
    'dashboard.title': 'ఏకీకృత డాష్బోర్డ్',
    'dashboard.overview': 'అవలోకనం',
    'dashboard.kpis': 'ప్రధాన పనితీరు సూచికలు',
    'dashboard.recentProjects': 'ఇటీవలి ప్రాజెక్టులు',
    'dashboard.activeRisks': 'క్రియాశీల రిస్క్‌లు',
    'dashboard.upcomingTasks': 'రాబోయే పనులు',
    // Login
    'login.title': 'ప్రోగ్రామ్ మేనేజ్మెంట్ ఇన్ఫర్మేషన్ సిస్టమ్',
    'login.subtitle': 'జహీరాబాద్ ఇండస్ట్రియల్ ఏరియా',
    'login.selectRole': 'కొనసాగించడానికి మీ పాత్రను ఎంచుకోండి',
    'login.enter': 'సిస్టమ్‌లోకి ప్రవేశించండి',
    // Roles
    'role.SPV_Official': 'SPV అధికారి',
    'role.PMNC_Team': 'PMNC టీమ్',
    'role.EPC_Contractor': 'EPC కాంట్రాక్టర్',
    'role.Consultant_Design': 'డిజైన్ కన్సల్టెంట్',
    'role.Govt_Department': 'ప్రభుత్వ శాఖ',
    'role.NICDC_HQ': 'NICDC ప్రధాన కార్యాలయం',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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

