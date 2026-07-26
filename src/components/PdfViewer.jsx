import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Tag, MessageSquarePlus, Copy, Check, ChevronRight } from 'lucide-react';

export default function PdfViewer({ currentDoc, activePage, onSelectPage, onAskAboutPage }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedPage, setCopiedPage] = useState(null);
  const pageRefs = useRef({});

  // Auto-scroll to active page when changed from chat citation
  useEffect(() => {
    if (activePage && pageRefs.current[activePage]) {
      pageRefs.current[activePage].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activePage]);

  if (!currentDoc) return null;

  const filteredPages = currentDoc.pages.filter(p => 
    !searchTerm || p.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyText = (pageNum, text) => {
    navigator.clipboard.writeText(text);
    setCopiedPage(pageNum);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Viewer Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>PDF 문서 본문 뷰어</h3>
          </div>
          <span className="badge badge-indigo">
            {filteredPages.length} / {currentDoc.numPages} 페이지
          </span>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="문서 내 키워드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.25)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Keywords / Meta Tag Ribbon */}
      {currentDoc.keywords && currentDoc.keywords.length > 0 && (
        <div style={{
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          <Tag size={13} color="#c084fc" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>주요 키워드:</span>
          {currentDoc.keywords.map((kw, idx) => (
            <span
              key={idx}
              onClick={() => setSearchTerm(kw)}
              className="badge badge-purple"
              style={{ cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
            >
              #{kw}
            </span>
          ))}
        </div>
      )}

      {/* Pages Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredPages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            검색어와 일치하는 페이지가 없습니다.
          </div>
        ) : (
          filteredPages.map((page) => {
            const isSelected = activePage === page.pageNum;

            return (
              <div
                key={page.pageNum}
                ref={(el) => (pageRefs.current[page.pageNum] = el)}
                onClick={() => onSelectPage(page.pageNum)}
                style={{
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #818cf8' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                  boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
                  padding: '1.25rem',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer'
                }}
              >
                {/* Page Card Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={isSelected ? 'badge badge-indigo' : 'badge'} style={{ background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>
                      페이지 {page.pageNum}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({page.wordCount} 단어)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyText(page.pageNum, page.text); }}
                      title="텍스트 복사"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {copiedPage === page.pageNum ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); onAskAboutPage(page.pageNum); }}
                      className="btn-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      <MessageSquarePlus size={12} />
                      <span>이 페이지 질문</span>
                    </button>
                  </div>
                </div>

                {/* Page Content Body */}
                <div style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  color: isSelected ? 'var(--text-main)' : 'var(--text-sub)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}>
                  {highlightText(page.text, searchTerm)}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

function highlightText(text, search) {
  if (!search) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === search.toLowerCase() ? (
      <mark key={i} style={{ background: '#818cf8', color: '#ffffff', borderRadius: '2px', padding: '0 2px' }}>
        {part}
      </mark>
    ) : part
  );
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
