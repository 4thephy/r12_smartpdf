import React from 'react';
import { FileText, Key, Upload, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Header({ currentDoc, onNewUpload, onOpenApiKeyModal, apiKey }) {
  return (
    <header className="glass-panel" style={{ borderRadius: '0 0 16px 16px', borderTop: 'none', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <FileText size={24} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="font-heading" style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>
                SmartPDF <span className="gradient-text">AI</span>
              </h1>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>v1.2 RAG</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              PDF 문서 분석 & 지능형 질의응답 시스템
            </p>
          </div>
        </div>

        {/* Current Document Stats (If Loaded) */}
        {currentDoc && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#818cf8" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentDoc.fileName}
              </span>
            </div>
            <div style={{ height: '16px', width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              총 <strong style={{ color: 'var(--text-main)' }}>{currentDoc.numPages}</strong> 페이지
            </div>
            <div style={{ height: '16px', width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              약 <strong style={{ color: 'var(--text-main)' }}>{currentDoc.readingTimeMin}분</strong> 분량
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* API Key Settings Button */}
          <button
            onClick={onOpenApiKeyModal}
            className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
          >
            <Key size={15} color={apiKey ? '#34d399' : '#a7f3d0'} />
            <span>API 키 설정</span>
            {apiKey ? (
              <span className="badge badge-emerald" style={{ marginLeft: '0.25rem', padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                <CheckCircle2 size={10} style={{ marginRight: '2px' }} /> Gemini
              </span>
            ) : (
              <span className="badge badge-purple" style={{ marginLeft: '0.25rem', padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                로컬 엔진
              </span>
            )}
          </button>

          {/* New Document Button */}
          {currentDoc && (
            <button onClick={onNewUpload} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              <Upload size={15} />
              <span>새 PDF 업로드</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
