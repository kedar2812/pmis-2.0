import React, { useState, useMemo } from 'react';
import { ExplorerLayout } from './ExplorerLayout';
import type { Document, FolderNode, DocumentPhase, DocumentDiscipline } from '@/mock/interfaces';
import { projects } from '@/mock';

interface FileExplorerProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onViewDocument: (doc: Document) => void;
  onDownloadDocument: (doc: Document) => void;
  onViewHistory: (doc: Document) => void;
  onDeleteDocument?: (doc: Document) => void;
  canDelete?: boolean;
  selectedDocumentId?: string;
  onNew?: () => void;
  onUpload?: () => void;
}

export const FileExplorer = ({
  documents,
  onSelectDocument,
  onViewDocument,
  onDownloadDocument,
  onViewHistory,
  onDeleteDocument,
  canDelete,
  selectedDocumentId,
  onNew,
  onUpload,
}: FileExplorerProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string[]>(['all']);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; doc: Document } | null>(null);

  // Build folder tree from documents
  const folderTree = useMemo((): FolderNode[] => {
    const tree: FolderNode[] = [
      {
        id: 'all',
        name: 'All Documents',
        type: 'project',
        documentCount: documents.length,
        children: [],
      },
    ];

    // Group by project
    const projectMap = new Map<string, FolderNode>();

    documents.forEach((doc) => {
      const project = projects.find((p) => p.id === doc.projectId);
      const projectName = project?.name || 'Unknown Project';

      if (!projectMap.has(doc.projectId)) {
        projectMap.set(doc.projectId, {
          id: doc.projectId,
          name: projectName,
          type: 'project',
          projectId: doc.projectId,
          children: [],
          documentCount: 0,
        });
      }

      const projectNode = projectMap.get(doc.projectId)!;
      projectNode.documentCount = (projectNode.documentCount || 0) + 1;

      // Find or create phase node
      let phaseNode = projectNode.children?.find((c) => c.name === doc.phase);
      if (!phaseNode) {
        phaseNode = {
          id: `${doc.projectId}-${doc.phase}`,
          name: doc.phase,
          type: 'phase',
          phase: doc.phase,
          children: [],
          documentCount: 0,
        };
        projectNode.children = projectNode.children || [];
        projectNode.children.push(phaseNode);
      }
      phaseNode.documentCount = (phaseNode.documentCount || 0) + 1;

      // Find or create discipline node
      let disciplineNode = phaseNode.children?.find((c) => c.name === doc.discipline);
      if (!disciplineNode) {
        disciplineNode = {
          id: `${doc.projectId}-${doc.phase}-${doc.discipline}`,
          name: doc.discipline,
          type: 'discipline',
          discipline: doc.discipline,
          children: [],
          documentCount: 0,
        };
        phaseNode.children = phaseNode.children || [];
        phaseNode.children.push(disciplineNode);
      }
      disciplineNode.documentCount = (disciplineNode.documentCount || 0) + 1;
    });

    tree[0].children = Array.from(projectMap.values());
    return tree;
  }, [documents]);

  // Filter documents based on selection and search
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by selected path
    if (selectedPath[0] !== 'all') {
      const pathId = selectedPath[0];
      if (pathId.includes('-')) {
        const parts = pathId.split('-');
        const projectId = parts[0] + '-' + parts[1];
        filtered = filtered.filter((d) => d.projectId === projectId);
        
        if (parts.length >= 3) {
          const phase = parts[2] as DocumentPhase;
          filtered = filtered.filter((d) => d.phase === phase);
        }
        if (parts.length >= 4) {
          const discipline = parts[3] as DocumentDiscipline;
          filtered = filtered.filter((d) => d.discipline === discipline);
        }
      } else {
        filtered = filtered.filter((d) => d.projectId === pathId);
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query)) ||
          d.category.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, selectedPath, searchQuery]);

  const handleContextMenu = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = canDelete ? 280 : 220;
    const padding = 8;

    let newX = e.clientX;
    let newY = e.clientY;

    // Adjust X if it overflows right edge
    if (newX + menuWidth + padding > window.innerWidth) {
      newX = window.innerWidth - menuWidth - padding;
    }
    // Adjust Y if it overflows bottom edge
    if (newY + menuHeight + padding > window.innerHeight) {
      newY = window.innerHeight - menuHeight - padding;
    }

    setContextMenu({ x: newX, y: newY, doc });
  };

  return (
    <ExplorerLayout
      folderTree={folderTree}
      documents={filteredDocuments}
      selectedPath={selectedPath}
      selectedDocumentId={selectedDocumentId}
      viewMode={viewMode}
      searchQuery={searchQuery}
      contextMenu={contextMenu}
      onPathChange={setSelectedPath}
      onSelectDocument={onSelectDocument}
      onViewDocument={onViewDocument}
      onDownloadDocument={onDownloadDocument}
      onViewHistory={onViewHistory}
      onDeleteDocument={onDeleteDocument}
      onViewModeChange={setViewMode}
      onSearchChange={setSearchQuery}
      onNew={onNew || (() => {})}
      onUpload={onUpload || (() => {})}
      onContextMenu={handleContextMenu}
      onCloseContextMenu={() => setContextMenu(null)}
      canDelete={canDelete}
    />
  );
};
