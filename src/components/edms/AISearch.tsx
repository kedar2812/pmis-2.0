import { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { Document } from '@/mock/interfaces';

interface AISearchProps {
  documents: Document[];
  onSearch: (filteredDocs: Document[]) => void;
}

export const AISearch = ({ documents, onSearch }: AISearchProps) => {
  const [query, setQuery] = useState('');

  // Natural language parsing
  const parseQuery = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const keywords: string[] = [];
    let dateRange: { from?: Date; to?: Date } = {};
    let docType: string | null = null;

    // Extract keywords (common words removed)
    const stopWords = ['from', 'to', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'for', 'with', 'last', 'week', 'month', 'year'];
    const words = lowerQuery.split(/\s+/).filter((word) => !stopWords.includes(word) && word.length > 2);
    keywords.push(...words);

    // Extract date ranges
    if (lowerQuery.includes('last week')) {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      dateRange = { from, to };
    } else if (lowerQuery.includes('last month')) {
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      dateRange = { from, to };
    }

    // Extract document types
    const typeKeywords: Record<string, string> = {
      'report': 'Report',
      'drawing': 'Drawing',
      'contract': 'Contract',
      'photo': 'Photo',
      'video': 'Video',
      'image': 'Photo',
      'picture': 'Photo',
    };

    for (const [key, type] of Object.entries(typeKeywords)) {
      if (lowerQuery.includes(key)) {
        docType = type;
        break;
      }
    }

    return { keywords, dateRange, docType };
  };

  const filteredDocuments = useMemo(() => {
    if (!query.trim()) {
      onSearch(documents);
      return documents;
    }

    const { keywords, dateRange, docType } = parseQuery(query);

    const filtered = documents.filter((doc) => {
      // Keyword matching
      const matchesKeywords = keywords.length === 0 || keywords.some((keyword) =>
        doc.name.toLowerCase().includes(keyword) ||
        doc.category.toLowerCase().includes(keyword) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );

      // Date range matching
      const matchesDate = !dateRange.from || !dateRange.to || (() => {
        const docDate = new Date(doc.uploadedDate);
        return docDate >= dateRange.from! && docDate <= dateRange.to!;
      })();

      // Type matching
      const matchesType = !docType || doc.type === docType;

      return matchesKeywords && matchesDate && matchesType;
    });

    onSearch(filtered);
    return filtered;
  }, [query, documents, onSearch]);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
        <Sparkles size={18} className="text-primary-600" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try: 'concrete reports from last week' or 'photos from project'"
        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
      {query && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
          {filteredDocuments.length} found
        </div>
      )}
    </div>
  );
};

