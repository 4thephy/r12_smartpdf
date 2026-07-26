import React, { useState } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import PdfViewer from './components/PdfViewer';
import ChatInterface from './components/ChatInterface';
import ApiKeyModal from './components/ApiKeyModal';
import SummaryReportModal from './components/SummaryReportModal';
import { generateDocumentReport } from './utils/qaEngine';

export default function App() {
  const [currentDoc, setCurrentDoc] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [chatMessages, setChatMessages] = useState([]);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('smartpdf_gemini_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDocumentLoaded = (docData) => {
    setCurrentDoc(docData);
    setActivePage(1);
    setChatMessages([]);
    setReportContent('');
  };

  const handleNewUpload = () => {
    setCurrentDoc(null);
    setActivePage(1);
    setChatMessages([]);
    setReportContent('');
  };

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('smartpdf_gemini_api_key', key);
    } else {
      localStorage.removeItem('smartpdf_gemini_api_key');
    }
  };

  const handleAskAboutPage = (pageNum) => {
    setActivePage(pageNum);
    const q = `페이지 ${pageNum}의 핵심 내용과 주요 정보를 상세히 설명해 줘.`;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleOpenReportModal = async () => {
    if (!currentDoc) return;
    setIsReportModalOpen(true);
    setIsReportLoading(true);
    try {
      const report = await generateDocumentReport(currentDoc, chatMessages, apiKey);
      setReportContent(report);
    } catch (err) {
      setReportContent(`# ⚠️ 보고서 생성 오류\n\n${err.message}`);
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation & App Bar */}
      <Header
        currentDoc={currentDoc}
        onNewUpload={handleNewUpload}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        apiKey={apiKey}
        onOpenReportModal={handleOpenReportModal}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 1.5rem 1.5rem', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        {!currentDoc ? (
          <FileUpload
            onDocumentLoaded={handleDocumentLoaded}
            setIsLoading={setIsLoading}
            isLoading={isLoading}
          />
        ) : (
          <div
            className="animate-fade-in"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '1.25rem',
              height: 'calc(100vh - 120px)',
              minHeight: '650px'
            }}
          >
            {/* Left Pane: PDF Document Viewer */}
            <div style={{ height: '100%', minHeight: '400px' }}>
              <PdfViewer
                currentDoc={currentDoc}
                activePage={activePage}
                onSelectPage={(pageNum) => setActivePage(pageNum)}
                onAskAboutPage={handleAskAboutPage}
              />
            </div>

            {/* Right Pane: AI Interactive Chat Assistant */}
            <div style={{ height: '100%', minHeight: '400px' }}>
              <ChatInterface
                currentDoc={currentDoc}
                apiKey={apiKey}
                onSelectPage={(pageNum) => setActivePage(pageNum)}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                onOpenReportModal={handleOpenReportModal}
              />
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* AI Summary Report Modal */}
      <SummaryReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportContent={reportContent}
        isLoading={isReportLoading}
        docTitle={currentDoc?.title || currentDoc?.fileName}
        onRegenerateReport={handleOpenReportModal}
      />

    </div>
  );
}

