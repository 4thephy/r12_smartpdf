import React, { useState } from 'react';
import { Printer, Copy, Check, X, Sparkles, FileText, RefreshCw } from 'lucide-react';

export default function SummaryReportModal({
  isOpen,
  onClose,
  reportContent,
  isLoading,
  docTitle,
  onRegenerateReport
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!reportContent) return;
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Print Specific Global Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #ffffff !important;
            color: #1e293b !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .report-paper {
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
          }
          .report-paper h1, .report-paper h2, .report-paper h3 {
            color: #0f172a !important;
          }
          .report-paper blockquote {
            border-left: 4px solid #6366f1 !important;
            background: #f8fafc !important;
            color: #334155 !important;
          }
        }
      `}</style>

      {/* Modal Overlay */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Window */}
        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          {/* Modal Header */}
          <div
            className="no-print"
            style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(15, 23, 42, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
                }}
              >
                <FileText size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  AI 문서 종합 요약 리포트
                  <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>Executive Report</span>
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {docTitle ? `대상의 문서: ${docTitle}` : '문서 핵심 정보 및 대화 요약 결과'}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handlePrint}
                disabled={isLoading || !reportContent}
                className="btn-primary"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.5rem 0.9rem',
                  opacity: (isLoading || !reportContent) ? 0.5 : 1,
                  cursor: (isLoading || !reportContent) ? 'not-allowed' : 'pointer'
                }}
                title="인쇄 또는 PDF 문서 저장"
              >
                <Printer size={15} />
                <span>인쇄 / PDF 저장</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={isLoading || !reportContent}
                className="btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.5rem 0.8rem',
                  opacity: (isLoading || !reportContent) ? 0.5 : 1
                }}
                title="텍스트 텍스트 복사"
              >
                {copied ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                <span>{copied ? '복사됨' : '복사'}</span>
              </button>

              {onRegenerateReport && (
                <button
                  onClick={onRegenerateReport}
                  disabled={isLoading}
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.7rem' }}
                  title="리포트 다시 생성"
                >
                  <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginLeft: '0.25rem'
                }}
                title="닫기"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Report Display Container */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.5)'
            }}
          >
            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4rem 1rem',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                  }}
                >
                  <Sparkles size={32} color="#818cf8" style={{ animation: 'pulse 1.5s infinite alternate' }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  AI 종합 분석 리포트를 생성하는 중입니다...
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
                  PDF 전체 페이지 구절과 질의응답 대화 기록을 분석하여 핵심 정보와 요약을 종합 보고서로 구성하고 있습니다.
                </p>
              </div>
            ) : (
              <div
                id="printable-report-area"
                className="report-paper"
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '2.5rem 3rem',
                  color: 'var(--text-main)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  fontSize: '0.95rem',
                  lineHeight: 1.75
                }}
              >
                {/* Print Header Watermark */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '2px solid rgba(99, 102, 241, 0.4)',
                    paddingBottom: '1rem',
                    marginBottom: '1.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#818cf8', letterSpacing: '-0.02em' }}>
                      SmartPDF AI
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>| 지능형 분석 보고서</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    생성일시: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Main Rendered Report Content */}
                <div className="report-markdown-body">
                  {renderReportMarkdown(reportContent)}
                </div>

                {/* Report Footer Note */}
                <div
                  style={{
                    marginTop: '3rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>© SmartPDF AI Assistant - 자동 생성 보고서</span>
                  <span>본 리포트는 PDF 원문 분석 알고리즘에 의해 자동 작성되었습니다.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Format markdown into styled React JSX elements
 */
function renderReportMarkdown(content) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={idx} style={{ fontSize: '1.6rem', fontWeight: '800', margin: '1.5rem 0 1rem 0', color: '#c7d2fe', letterSpacing: '-0.02em' }}>
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} style={{ fontSize: '1.25rem', fontWeight: '700', margin: '1.75rem 0 0.8rem 0', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}>
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} style={{ fontSize: '1.05rem', fontWeight: '600', margin: '1.2rem 0 0.5rem 0', color: '#e0e7ff' }}>
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={idx} style={{ margin: '0.75rem 0', padding: '0.85rem 1.25rem', background: 'rgba(99, 102, 241, 0.12)', borderLeft: '4px solid #6366f1', borderRadius: '0 8px 8px 0', fontSize: '0.9rem', color: '#e2e8f0', fontStyle: 'italic' }}>
          {formatInlineStyles(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', margin: '0.35rem 0 0.35rem 0.5rem', alignItems: 'flex-start' }}>
          <span style={{ color: '#818cf8', fontWeight: 'bold' }}>•</span>
          <span style={{ flex: 1 }}>{formatInlineStyles(trimmed.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', margin: '0.35rem 0 0.35rem 0.5rem', alignItems: 'flex-start' }}>
          <span style={{ color: '#c084fc', fontWeight: '600', minWidth: '1.4rem' }}>{numMatch[1]}.</span>
          <span style={{ flex: 1 }}>{formatInlineStyles(numMatch[2])}</span>
        </div>
      );
    } else if (trimmed === '---') {
      elements.push(
        <hr key={idx} style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }} />
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <p key={idx} style={{ margin: '0.5rem 0', lineHeight: 1.7 }}>
          {formatInlineStyles(trimmed)}
        </p>
      );
    } else {
      elements.push(<div key={idx} style={{ height: '0.4rem' }} />);
    }
  });

  return elements;
}

function formatInlineStyles(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#f8fafc', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} style={{ color: '#cbd5e1' }}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.85em', color: '#a5b4fc' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
