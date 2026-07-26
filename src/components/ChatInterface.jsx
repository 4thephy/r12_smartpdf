import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2, ArrowUpRight, HelpCircle, Layers, ListChecks } from 'lucide-react';
import { askPdfQuestion } from '../utils/qaEngine';

export default function ChatInterface({ currentDoc, apiKey, onSelectPage, chatMessages, setChatMessages }) {
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query || !query.trim() || isLoading) return;

    const userMsg = { sender: 'user', text: query, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');

    setIsLoading(true);

    try {
      const response = await askPdfQuestion(query, currentDoc, apiKey);
      const aiMsg = {
        sender: 'ai',
        text: response.answer,
        sources: response.sources,
        usedApi: response.usedApi,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ 답변 생성 중 오류가 발생했습니다: ${err.message}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setChatMessages([]);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header Bar */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={16} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>AI 문서 어시스턴트</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {apiKey ? '⚡ Gemini 1.5 Flash 연동 중' : '🛡️ 스마트 로컬 분석 엔진 활성'}
            </span>
          </div>
        </div>

        {chatMessages.length > 0 && (
          <button
            onClick={handleClearHistory}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="대화 기록 초기화"
          >
            <Trash2 size={13} />
            <span>초기화</span>
          </button>
        )}
      </div>

      {/* Suggested Quick Action Chips */}
      <div style={{
        padding: '0.65rem 1rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(255, 255, 255, 0.02)',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        <QuickChip
          icon={<Sparkles size={12} color="#818cf8" />}
          label="⚡ 3줄 핵심 요약"
          onClick={() => handleSendMessage('이 문서의 핵심 내용을 3줄로 요약해 줘')}
          disabled={isLoading}
        />
        <QuickChip
          icon={<ListChecks size={12} color="#c084fc" />}
          label="🔑 주요 키워드 추출"
          onClick={() => handleSendMessage('이 문서에서 가장 중요한 키워드와 핵심 주제를 정리해 줘')}
          disabled={isLoading}
        />
        <QuickChip
          icon={<HelpCircle size={12} color="#38bdf8" />}
          label="❓ 예상 Q&A 생성"
          onClick={() => handleSendMessage('이 문서 내용을 기반으로 시험이나 보고서에 나올 만한 중요 Q&A 3개를 만들어 줘')}
          disabled={isLoading}
        />
        <QuickChip
          icon={<Layers size={12} color="#34d399" />}
          label="📑 문서 목차 정리"
          onClick={() => handleSendMessage('문서 전체의 장별/페이지별 구성 목차를 정리해 줘')}
          disabled={isLoading}
        />
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {chatMessages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', padding: '2rem 1rem', maxWidth: '420px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1rem',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={28} color="#818cf8" />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.4rem' }}>
              무엇이든 물어보세요!
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              업로드된 <strong>{currentDoc.fileName}</strong> 문서의 내용을 분석하여 답변하고 원문 출처 페이지를 알려드립니다.
            </p>

            {currentDoc.suggestedQuestions && currentDoc.suggestedQuestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>추천 질문:</span>
                {currentDoc.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{q}</span>
                    <ArrowUpRight size={14} color="var(--text-muted)" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          chatMessages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: msg.sender === 'user' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.sender === 'user' ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
              </div>

              {/* Bubble Content */}
              <div style={{ maxWidth: '85%' }}>
                <div style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : 'rgba(30, 41, 59, 0.8)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {renderFormattedText(msg.text, onSelectPage)}

                  {/* Sources Badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>참고 출처:</span>
                      {msg.sources.map(pNum => (
                        <button
                          key={pNum}
                          onClick={() => onSelectPage(pNum)}
                          className="badge badge-indigo"
                          style={{ cursor: 'pointer', border: 'none', background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', fontSize: '0.72rem' }}
                        >
                          📄 페이지 {pNum} 이동
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.25rem',
                  textAlign: msg.sender === 'user' ? 'right' : 'left'
                }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>문서 분석 및 답변 구성 중...</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'pulseGlow 1s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c084fc', animation: 'pulseGlow 1s infinite alternate 0.2s' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', animation: 'pulseGlow 1s infinite alternate 0.4s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Form Bar */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.8)' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="이 PDF 문서에 대해 궁금한 점을 입력하세요..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="btn-primary"
            style={{ opacity: (!inputQuery.trim() || isLoading) ? 0.5 : 1, padding: '0.75rem 1.25rem' }}
          >
            <Send size={16} />
            <span>전송</span>
          </button>
        </form>
      </div>

    </div>
  );
}

function QuickChip({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '0.3rem 0.7rem',
        color: 'var(--text-sub)',
        fontSize: '0.78rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function renderFormattedText(text, onSelectPage) {
  // Render bold markdown & page citation buttons
  const regex = /\[페이지\s*(\d+)\]/g;
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const pNum = parseInt(parts[i], 10);
      result.push(
        <button
          key={i}
          onClick={() => onSelectPage(pNum)}
          style={{
            background: 'rgba(99, 102, 241, 0.25)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '4px',
            padding: '1px 5px',
            margin: '0 2px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📄 p.{pNum}
        </button>
      );
    } else {
      result.push(parts[i]);
    }
  }

  return result;
}
