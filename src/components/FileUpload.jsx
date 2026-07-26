import React, { useState } from 'react';
import { UploadCloud, FileText, Sparkles, CheckCircle2, Shield, Zap, Search, HelpCircle } from 'lucide-react';
import { parsePdfFile, getSamplePdfData } from '../utils/pdfParser';

export default function FileUpload({ onDocumentLoaded, setIsLoading, isLoading }) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMsg('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const parsedData = await parsePdfFile(file);
      onDocumentLoaded(parsedData);
    } catch (err) {
      setErrorMsg(err.message || 'PDF 파일을 파싱하는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSampleLoad = () => {
    setIsLoading(true);
    setTimeout(() => {
      const sampleData = getSamplePdfData();
      onDocumentLoaded(sampleData);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }} className="animate-fade-in">
      
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div className="badge badge-indigo" style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          <Sparkles size={14} style={{ marginRight: '4px' }} /> AI 기반 문서 지능 탐색기
        </div>
        <h2 className="font-heading" style={{ fontSize: '2.2rem', fontWeight: '700', marginBottom: '0.75rem', lineHeight: 1.25 }}>
          PDF 문서를 업로드하고 <span className="gradient-text">궁금한 점을 물어보세요</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          문서 전체의 내용을 단 몇 초 만에 파싱하여 핵심 내용 요약부터 출처 페이지 명시 Q&A까지 즉시 제공합니다.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="glass-panel glass-panel-interactive"
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          borderStyle: dragOver ? 'dashed' : 'solid',
          borderColor: dragOver ? 'var(--accent-primary)' : 'var(--border-color)',
          background: dragOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
          cursor: isLoading ? 'wait' : 'pointer',
          position: 'relative'
        }}
      >
        <input
          type="file"
          accept=".pdf"
          id="pdf-input"
          style={{ display: 'none' }}
          disabled={isLoading}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        />

        <label htmlFor="pdf-input" style={{ cursor: 'pointer', display: 'block' }}>
          <div style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 1.25rem',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.2)'
          }}>
            {isLoading ? (
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                borderTopColor: '#818cf8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <UploadCloud size={36} color="#818cf8" />
            )}
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {isLoading ? 'PDF 문서 분석 진행 중...' : 'PDF 파일 끌어다 놓기 또는 클릭하여 선택'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            최대 100MB 이하의 PDF 문서를 지원합니다 (.pdf)
          </p>

          <button
            type="button"
            className="btn-primary"
            style={{ pointerEvents: 'none' }}
          >
            <FileText size={16} />
            <span>컴퓨터에서 파일 선택</span>
          </button>
        </label>

        {errorMsg && (
          <div style={{
            marginTop: '1.25rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'inline-block'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* Demo Test Button */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
          준비된 PDF 파일이 없으신가요?
        </span>
        <button
          onClick={handleSampleLoad}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: '#a7f3d0',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <Sparkles size={14} />
          <span>샘플 보고서 문서로 바로 체험해보기</span>
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginTop: '3rem'
      }}>
        <FeatureCard
          icon={<Zap color="#818cf8" size={20} />}
          title="초고속 텍스트 파싱"
          desc="페이지 단위 청킹과 의미적 지수화로 수초 내 텍스트 파싱"
        />
        <FeatureCard
          icon={<Search color="#c084fc" size={20} />}
          title="정밀 출처 하이라이트"
          desc="답변 시 정확한 페이지 번호와 해당 인용 구절 명시"
        />
        <FeatureCard
          icon={<HelpCircle color="#38bdf8" size={20} />}
          title="지능형 QA & 요약"
          desc="핵심 3줄 요약, 키워드 추출, 자동 예시 질문 제공"
        />
        <FeatureCard
          icon={<Shield color="#34d399" size={20} />}
          title="로컬 안심 보안"
          desc="브라우저 내 파싱 방식으로 문서 정보 외부 유출 안심"
        />
      </div>

      {/* Inline Keyframe for Spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
      <div style={{ marginBottom: '0.75rem' }}>{icon}</div>
      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.25rem' }}>{title}</h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
    </div>
  );
}
