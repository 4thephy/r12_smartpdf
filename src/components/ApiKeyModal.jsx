import React, { useState } from 'react';
import { Key, X, ExternalLink, ShieldCheck, Check } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveApiKey }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleRemoveKey = () => {
    setInputKey('');
    onSaveApiKey('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }} className="animate-fade-in">
      
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '1.75rem',
        borderRadius: '20px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '1.25rem',
            top: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Key size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
              Gemini API 키 설정
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              LLM 기반 고급 답변 및 심층 분석 활성화
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: 'var(--text-sub)',
          marginBottom: '1.25rem'
        }}>
          💡 <strong>API 키 없이도 바로 사용 가능:</strong> API 키를 등록하지 않아도 내장 <strong>스마트 로컬 분석 엔진</strong>이 문서 구절 탐색 및 답변을 제공합니다. Gemini API 키를 입력하면 더욱 유연한 자연어 생성 성능을 경험하실 수 있습니다.
        </div>

        {/* Form */}
        <form onSubmit={handleSave}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
            Google Gemini API Key
          </label>

          <input
            type="password"
            placeholder="AIzaSy..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none',
              marginBottom: '1rem'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.8rem',
                color: '#818cf8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none'
              }}
            >
              <span>Google AI Studio에서 무료 API 키 발급받기</span>
              <ExternalLink size={13} />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                API 키 삭제
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              취소
            </button>

            <button type="submit" className="btn-primary">
              {isSaved ? <Check size={16} /> : <ShieldCheck size={16} />}
              <span>{isSaved ? '저장 완료!' : 'API 키 저장'}</span>
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
