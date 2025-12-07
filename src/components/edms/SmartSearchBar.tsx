import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, Clock, Tag, FileText, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document, DocumentType, DocumentStatus, DocumentPhase } from '@/mock/interfaces';

interface SmartSearchBarProps {
  documents: Document[];
  onSearchResults: (results: Document[]) => void;
  placeholder?: string;
}

interface ParsedQuery {
  keywords: string[];
  category?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  phase?: DocumentPhase;
  timeRange?: { start: Date; end: Date };
  tags?: string[];
}

// Time range parser
const parseTimeRange = (text: string): { start: Date; end: Date } | null => {
  const now = new Date();
  const lowText = text.toLowerCase();

  // Handle "last X days/weeks/months"
  const lastMatch = lowText.match(/last\s+(\d+)?\s*(day|week|month|year)s?/);
  if (lastMatch) {
    const num = parseInt(lastMatch[1] || '1');
    const unit = lastMatch[2];
    const start = new Date(now);

    switch (unit) {
      case 'day':
        start.setDate(start.getDate() - num);
        break;
      case 'week':
        start.setDate(start.getDate() - num * 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - num);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - num);
        break;
    }
    return { start, end: now };
  }

  // Handle "this week/month/year"
  if (lowText.includes('this week')) {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return { start, end: now };
  }
  if (lowText.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }
  if (lowText.includes('this year')) {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: now };
  }

  // Handle "today" / "yesterday"
  if (lowText.includes('today')) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (lowText.includes('yesterday')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
};

// Parse natural language query
const parseQuery = (query: string): ParsedQuery => {
  const lowQuery = query.toLowerCase();
  const parsed: ParsedQuery = { keywords: [] };

  // Extract document types
  const typeMap: Record<string, DocumentType> = {
    drawing: 'Drawing',
    drawings: 'Drawing',
    dwg: 'Drawing',
    report: 'Report',
    reports: 'Report',
    contract: 'Contract',
    contracts: 'Contract',
    bill: 'Bill',
    bills: 'Bill',
    photo: 'SitePhoto',
    photos: 'SitePhoto',
    'site photo': 'SitePhoto',
    video: 'Video',
    videos: 'Video',
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (lowQuery.includes(key)) {
      parsed.type = value;
      break;
    }
  }

  // Extract status
  const statusMap: Record<string, DocumentStatus> = {
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending_Approval',
    'pending approval': 'Pending_Approval',
    draft: 'Draft',
    'under review': 'Under Review',
    review: 'Under Review',
  };

  for (const [key, value] of Object.entries(statusMap)) {
    if (lowQuery.includes(key)) {
      parsed.status = value;
      break;
    }
  }

  // Extract phase
  const phaseMap: Record<string, DocumentPhase> = {
    planning: 'Planning',
    design: 'Design',
    execution: 'Execution',
    closure: 'Closure',
  };

  for (const [key, value] of Object.entries(phaseMap)) {
    if (lowQuery.includes(key)) {
      parsed.phase = value;
      break;
    }
  }

  // Extract category hints
  const categoryHints = [
    'financial', 'finance', 'budget', 'cost',
    'legal', 'contract', 'agreement',
    'quality', 'test', 'inspection',
    'safety', 'compliance',
    'progress', 'monthly', 'weekly',
    'technical', 'specification',
  ];

  for (const hint of categoryHints) {
    if (lowQuery.includes(hint)) {
      parsed.category = hint;
      break;
    }
  }

  // Extract time range
  parsed.timeRange = parseTimeRange(lowQuery) || undefined;

  // Extract remaining keywords (remove parsed terms)
  const wordsToRemove = [
    ...Object.keys(typeMap),
    ...Object.keys(statusMap),
    ...Object.keys(phaseMap),
    'last', 'this', 'week', 'month', 'year', 'day', 'days', 'weeks', 'months', 'years',
    'today', 'yesterday', 'from', 'the', 'all', 'show', 'find', 'get', 'search',
  ];

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !wordsToRemove.includes(word));

  parsed.keywords = keywords;

  return parsed;
};

// Filter documents based on parsed query
const filterDocuments = (documents: Document[], parsed: ParsedQuery): Document[] => {
  return documents.filter((doc) => {
    // Filter by type
    if (parsed.type && doc.type !== parsed.type) return false;

    // Filter by status
    if (parsed.status && doc.status !== parsed.status) return false;

    // Filter by phase
    if (parsed.phase && doc.phase !== parsed.phase) return false;

    // Filter by time range
    if (parsed.timeRange) {
      const docDate = new Date(doc.uploadedDate);
      if (docDate < parsed.timeRange.start || docDate > parsed.timeRange.end) return false;
    }

    // Filter by category
    if (parsed.category) {
      const categoryMatch =
        doc.category.toLowerCase().includes(parsed.category) ||
        doc.tags.some((t) => t.toLowerCase().includes(parsed.category!));
      if (!categoryMatch) return false;
    }

    // Filter by keywords (must match name, description, or tags)
    if (parsed.keywords.length > 0) {
      const searchText = `${doc.name} ${doc.description || ''} ${doc.tags.join(' ')}`.toLowerCase();
      const keywordMatch = parsed.keywords.some((kw) => searchText.includes(kw));
      if (!keywordMatch) return false;
    }

    return true;
  });
};

// Search suggestions
const searchSuggestions = [
  { icon: FileText, text: 'concrete reports last week', description: 'Find concrete test reports from last week' },
  { icon: Filter, text: 'approved drawings', description: 'All approved design drawings' },
  { icon: Clock, text: 'pending approval this month', description: 'Documents awaiting approval' },
  { icon: Tag, text: 'contract documents', description: 'Legal contracts and agreements' },
];

export const SmartSearchBar = ({
  documents,
  onSearchResults,
  placeholder = 'Search documents... Try "concrete reports last week" or "approved drawings"',
}: SmartSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);

  // Parse and filter on query change
  useEffect(() => {
    if (query.trim()) {
      const parsed = parseQuery(query);
      setParsedQuery(parsed);
      const results = filterDocuments(documents, parsed);
      onSearchResults(results);
    } else {
      setParsedQuery(null);
      onSearchResults(documents);
    }
  }, [query, documents, onSearchResults]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery('');
    setParsedQuery(null);
    onSearchResults(documents);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 bg-white border rounded-2xl transition-all duration-200',
          isFocused
            ? 'border-primary-500 ring-4 ring-primary-100 shadow-lg'
            : 'border-slate-200 hover:border-slate-300'
        )}
      >
        <div className="flex items-center gap-2">
          <Search size={20} className="text-slate-400" />
          <Sparkles size={16} className="text-amber-500" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Parsed Query Tags */}
      <AnimatePresence>
        {parsedQuery && (parsedQuery.type || parsedQuery.status || parsedQuery.timeRange || parsedQuery.phase) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {parsedQuery.type && (
              <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <FileText size={14} />
                Type: {parsedQuery.type}
              </span>
            )}
            {parsedQuery.status && (
              <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                <Filter size={14} />
                Status: {parsedQuery.status.replace('_', ' ')}
              </span>
            )}
            {parsedQuery.phase && (
              <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                <Tag size={14} />
                Phase: {parsedQuery.phase}
              </span>
            )}
            {parsedQuery.timeRange && (
              <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                <Clock size={14} />
                {parsedQuery.timeRange.start.toLocaleDateString()} - {parsedQuery.timeRange.end.toLocaleDateString()}
              </span>
            )}
            {parsedQuery.keywords.length > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                Keywords: {parsedQuery.keywords.join(', ')}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isFocused && !query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                AI-Powered Search Suggestions
              </p>
            </div>
            <div className="p-2">
              {searchSuggestions.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Icon size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{suggestion.text}</p>
                      <p className="text-xs text-slate-500">{suggestion.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Use natural language to search - e.g., "approved contracts this month"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

