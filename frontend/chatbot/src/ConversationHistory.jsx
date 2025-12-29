import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

export default function ConversationHistory({ onSelectConversation, onNewChat, currentConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  async function loadConversations() {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const convs = [];
      querySnapshot.forEach((doc) => {
        convs.push({ id: doc.id, ...doc.data() });
      });
      
      setConversations(convs);
      setLoading(false);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setLoading(false);
    }
  }

  async function handleDeleteConversation(e, convId) {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    
    try {
      await deleteDoc(doc(db, 'conversations', convId));
      setConversations(prev => prev.filter(c => c.id !== convId));
      
      if (currentConversationId === convId) {
        onNewChat();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }

  function getConversationTitle(conv) {
    if (conv.title) return conv.title;
    if (conv.messages && conv.messages.length > 0) {
      const firstUserMsg = conv.messages.find(m => m.sender === 'user');
      if (firstUserMsg) {
        return firstUserMsg.text.substring(0, 40) + (firstUserMsg.text.length > 40 ? '...' : '');
      }
    }
    return 'New Conversation';
  }

  if (!currentUser) return null;

  return (
    <div style={{
      width: '280px',
      height: '100%',
      background: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
      borderRight: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.2) transparent'
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.5)',
            padding: '2rem',
            fontSize: '0.9rem'
          }}>
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.5)',
            padding: '2rem',
            fontSize: '0.9rem'
          }}>
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: '0.875rem',
                marginBottom: '0.5rem',
                background: currentConversationId === conv.id 
                  ? 'rgba(102, 126, 234, 0.2)' 
                  : hoveredId === conv.id 
                    ? 'rgba(255,255,255,0.08)' 
                    : 'transparent',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: currentConversationId === conv.id 
                  ? '1px solid rgba(102, 126, 234, 0.4)' 
                  : '1px solid transparent',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {getConversationTitle(conv)}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.75rem'
                }}>
                  {formatDate(conv.updatedAt)}
                </div>
              </div>
              
              {hoveredId === conv.id && (
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  style={{
                    padding: '0.25rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.3)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}