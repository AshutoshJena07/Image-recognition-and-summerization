import React, { useState, useMemo } from 'react';
import {
  HistoryIcon,
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  Trash2Icon,
  XIcon,
  PanelRightCloseIcon,
  MessageSquareIcon
} from '../Common/Icons';

export default function ConversationHistoryPanel({
  isOpen,
  setIsOpen,
  conversationsList = [],
  activeSessionId,
  onSelectConversation,
  onNewSession,
  onDeleteConversation,
  guestMode
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return conversationsList;
    const query = searchQuery.toLowerCase();
    return conversationsList.filter(c => 
      c.title?.toLowerCase().includes(query) || 
      c.id?.toLowerCase().includes(query)
    );
  }, [conversationsList, searchQuery]);

  // Group conversations chronologically (Today, Yesterday, Earlier)
  const groupedConversations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const pastWeek = new Date(today);
    pastWeek.setDate(pastWeek.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      pastWeek: [],
      earlier: []
    };

    filteredList.forEach(item => {
      // Determine date from created_at or fallback from ID timestamp
      let itemDate = null;
      if (item.created_at) {
        itemDate = new Date(item.created_at);
      } else if (!isNaN(Number(item.id))) {
        itemDate = new Date(Number(item.id));
      }

      if (!itemDate || isNaN(itemDate.getTime())) {
        groups.today.push(item);
      } else {
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate.getTime() >= today.getTime()) {
          groups.today.push(item);
        } else if (itemDate.getTime() === yesterday.getTime()) {
          groups.yesterday.push(item);
        } else if (itemDate.getTime() >= pastWeek.getTime()) {
          groups.pastWeek.push(item);
        } else {
          groups.earlier.push(item);
        }
      }
    });

    return groups;
  }, [filteredList]);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (onDeleteConversation) {
      onDeleteConversation(id);
    }
  };

  return (
    <aside 
      className={`history-panel ${isOpen ? 'open' : 'closed'}`}
      aria-label="Conversation History"
    >
      {/* 1. Header with Title & Action Controls */}
      <div className="history-panel-header">
        <div className="history-panel-title-wrap">
          <HistoryIcon size={16} className="history-panel-icon" />
          <span className="history-panel-title">History</span>
          {conversationsList.length > 0 && (
            <span className="history-count-pill">{conversationsList.length}</span>
          )}
        </div>

        <div className="history-panel-actions">
          {/* New Conversation Button */}
          <button
            className="icon-btn history-new-btn"
            type="button"
            onClick={onNewSession}
            title="Start New Conversation"
            aria-label="Start New Conversation"
          >
            <PlusIcon size={16} />
          </button>

          {/* Close Panel Button */}
          <button
            className="icon-btn history-close-btn"
            type="button"
            onClick={() => setIsOpen(false)}
            title="Close History Panel"
            aria-label="Close History Panel"
          >
            <PanelRightCloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* 2. Search Filter */}
      {!guestMode && conversationsList.length > 0 && (
        <div className="history-search-wrap">
          <div className="sidebar-search-wrapper">
            <span className="search-icon-adornment" aria-hidden="true">
              <SearchIcon size={13} />
            </span>
            <input
              type="text"
              className="sidebar-search-box history-search-input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversation history"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                title="Clear search"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Grouped Conversation List */}
      <div className="history-scroll-body">
        {guestMode ? (
          <div className="history-empty-card">
            <MessageSquareIcon size={24} className="empty-icon" />
            <p className="empty-title">Guest Sandbox</p>
            <p className="empty-desc">
              Conversations are temporary in guest mode. Sign in to save and resume your past chats.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="history-empty-card">
            <MessageSquareIcon size={24} className="empty-icon" />
            <p className="empty-title">
              {searchQuery ? 'No matching chats' : 'No history yet'}
            </p>
            <p className="empty-desc">
              {searchQuery 
                ? 'Try searching for a different keyword or file name.' 
                : 'Start analyzing images, documents, or asking questions to build your history.'}
            </p>
            {!searchQuery && (
              <button 
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={onNewSession}
                style={{ marginTop: '8px' }}
              >
                <PlusIcon size={14} />
                <span>New Chat</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Today Group */}
            {groupedConversations.today.length > 0 && (
              <div className="history-group">
                <div className="history-group-label">Today</div>
                {groupedConversations.today.map(item => (
                  <ConversationItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeSessionId}
                    onSelect={() => onSelectConversation(item.id)}
                    onDelete={(e) => handleDelete(e, item.id)}
                  />
                ))}
              </div>
            )}

            {/* Yesterday Group */}
            {groupedConversations.yesterday.length > 0 && (
              <div className="history-group">
                <div className="history-group-label">Yesterday</div>
                {groupedConversations.yesterday.map(item => (
                  <ConversationItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeSessionId}
                    onSelect={() => onSelectConversation(item.id)}
                    onDelete={(e) => handleDelete(e, item.id)}
                  />
                ))}
              </div>
            )}

            {/* Past 7 Days Group */}
            {groupedConversations.pastWeek.length > 0 && (
              <div className="history-group">
                <div className="history-group-label">Previous 7 Days</div>
                {groupedConversations.pastWeek.map(item => (
                  <ConversationItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeSessionId}
                    onSelect={() => onSelectConversation(item.id)}
                    onDelete={(e) => handleDelete(e, item.id)}
                  />
                ))}
              </div>
            )}

            {/* Earlier Group */}
            {groupedConversations.earlier.length > 0 && (
              <div className="history-group">
                <div className="history-group-label">Earlier</div>
                {groupedConversations.earlier.map(item => (
                  <ConversationItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeSessionId}
                    onSelect={() => onSelectConversation(item.id)}
                    onDelete={(e) => handleDelete(e, item.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function ConversationItem({ item, isActive, onSelect, onDelete }) {
  return (
    <div
      className={`history-card-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      title={item.title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="history-card-left">
        <FileTextIcon size={14} className="history-card-icon" />
        <span className="history-card-title">{item.title || 'Untitled Session'}</span>
      </div>

      <button
        className="history-card-delete-btn"
        type="button"
        onClick={onDelete}
        title="Delete conversation"
        aria-label={`Delete conversation ${item.title || ''}`}
      >
        <Trash2Icon size={13} />
      </button>
    </div>
  );
}
