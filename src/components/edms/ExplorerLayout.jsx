import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { AddressBar } from './AddressBar';
import { FolderTree } from './FolderTree';
import { FileGrid } from './FileGrid';
import { ExplorerRibbon } from './ExplorerRibbon';
import { WindowsContextMenu } from './WindowsContextMenu';

export const ExplorerLayout = ({
  folderTree,
  documents,
  selectedPath,
  selectedDocumentId,
  viewMode,
  searchQuery,
  contextMenu,
  onPathChange,
  onSelectDocument,
  onViewDocument,
  onDownloadDocument,
  onViewHistory,
  onDeleteDocument,
  onViewModeChange,
  onSearchChange,
  onNew,
  onUpload,
  onContextMenu,
  onCloseContextMenu,
  canDelete,
}) => {
  // Convert selectedPath to breadcrumb format
  const breadcrumbPath = selectedPath.length > 0 && selectedPath[0] !== 'all' 
    ? selectedPath.map((id) => {
        // Find the node name from the tree
        const findNodeName = (nodes, targetId) => {
          for (const node of nodes) {
            if (node.id === targetId) return node.name;
            if (node.children) {
              const found = findNodeName(node.children, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        return findNodeName(folderTree, id) || id;
      })
    : [];

  const handleBreadcrumbClick = (index) => {
    if (index === 0) {
      onPathChange(['all']);
    } else {
      // Navigate to the corresponding path segment
      const newPath = selectedPath.slice(0, index);
      onPathChange(newPath);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] bg-white rounded-lg border border-gray-200 overflow-hidden font-['Inter',_'Segoe_UI',_sans-serif]">
      {/* Main Grid Layout: Sidebar | Content */}
      <div className="grid grid-cols-[260px_1fr] flex-1 overflow-hidden">
        {/* Left Sidebar - Folder Tree */}
        <div className="border-r border-gray-200 bg-white overflow-hidden flex flex-col">
          <FolderTree
            nodes={folderTree}
            selectedPath={selectedPath}
            onSelect={onPathChange}
          />
        </div>

        {/* Right Content Area */}
        <div className="flex flex-col overflow-hidden">
          {/* Address Bar */}
          <AddressBar path={breadcrumbPath} onNavigate={handleBreadcrumbClick} />

          {/* Ribbon Toolbar */}
          <ExplorerRibbon
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onNew={onNew}
            onUpload={onUpload}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />

          {/* Main Content - File Grid/List */}
          <div className="flex-1 overflow-hidden">
            <FileGrid
              documents={documents}
              selectedDocumentId={selectedDocumentId}
              viewMode={viewMode}
              onSelect={onSelectDocument}
              onDoubleClick={onViewDocument}
              onContextMenu={onContextMenu}
            />
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <WindowsContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            doc={contextMenu.doc}
            onView={() => onViewDocument(contextMenu.doc)}
            onDownload={() => onDownloadDocument(contextMenu.doc)}
            onHistory={() => onViewHistory(contextMenu.doc)}
            onDelete={onDeleteDocument ? () => onDeleteDocument(contextMenu.doc) : undefined}
            canDelete={canDelete}
            onClose={onCloseContextMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

