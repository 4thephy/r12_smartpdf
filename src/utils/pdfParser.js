import * as pdfjsLib from 'pdfjs-dist';

// Worker configuration for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Parse an uploaded PDF file and return structured document data
 * @param {File} file - PDF file object
 * @returns {Promise<Object>} Processed document data
 */
export async function parsePdfFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    const numPages = pdfDoc.numPages;
    const pages = [];
    let fullText = '';
    let totalWords = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const wordCount = pageText ? pageText.split(/\s+/).length : 0;
      totalWords += wordCount;

      pages.push({
        pageNum,
        text: pageText,
        wordCount,
        snippet: pageText.slice(0, 140) + (pageText.length > 140 ? '...' : '')
      });

      fullText += `\n[페이지 ${pageNum}]\n` + pageText;
    }

    const metadata = await pdfDoc.getMetadata().catch(() => ({}));
    const docTitle = metadata?.info?.Title || file.name.replace(/\.pdf$/i, '');

    // Extract auto-summary and keywords
    const keywords = extractKeywords(fullText);
    const suggestedQuestions = generateSuggestedQuestions(fullText, docTitle);

    return {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      title: docTitle,
      numPages,
      totalWords,
      readingTimeMin: Math.max(1, Math.ceil(totalWords / 200)),
      pages,
      fullText,
      keywords,
      suggestedQuestions
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('PDF 파일을 분석하는 중 오류가 발생했습니다. (파일이 손상되었거나 암호화되었을 수 있습니다.)');
  }
}

/**
 * Generates a mock multi-page sample PDF data structure for quick demo testing
 */
export function getSamplePdfData() {
  const pages = [
    {
      pageNum: 1,
      text: `2026 AI 및 디지털 혁신 보고서

1. 서론 및 종합 개요
본 보고서는 2026년 최신 인공지능(AI) 기술과 디지털 파괴적 혁신 트렌드를 종합적으로 분석합니다.
지난 수년간 생성형 AI 및 LLM(대형 언어 모델) 기술은 기업의 데이터 처리 방식과 일하는 방식을 혁명적으로 변화시켰습니다.
특히 PDF 문서 처리, RAG(검색 증강 생성), 에이전틱 AI(Agentic AI) 시스템은 사용자가 방대한 지식 베이스에서 필요한 정보를 초 단위로 검색하고 활용할 수 있도록 돕고 있습니다.

주요 하이라이트:
- 데이터 파싱 정확도 98% 향상
- 기업 생산성 평균 45% 증가
- 지능형 문서 검색 시스템 도입률 300% 증가`,
      wordCount: 120,
      snippet: '2026 AI 및 디지털 혁신 보고서 - 서론 및 종합 개요...'
    },
    {
      pageNum: 2,
      text: `2. 스마트 PDF 분석 및 RAG 기술 동향

PDF(Portable Document Format)는 비즈니스 환경에서 가장 널리 사용되는 문서 포맷 중 하나입니다.
그러나 전통적인 텍스트 검색 기술은 구조화되지 않은 PDF 내부의 핵심 답변을 정밀하게 추출하는 데 한계가 있었습니다.

2026년 최신 Smart RAG 아키텍처는 다음 3단계 알고리즘을 사용합니다:
1) 문단 및 페이지 단위 고성능 토큰화 (Chunking Engine)
2) 의미론적 맥락 유사도 분석 (Semantic Context Scoring)
3) 출처 매칭 및 하이라이팅 (Citation & Page Verification)

이를 통해 사용자가 "이 보고서의 결론이 뭐야?"라고 질문하면, 정확한 페이지 번호와 해당 구절 원문을 함께 제공할 수 있습니다.`,
      wordCount: 135,
      snippet: '2. 스마트 PDF 분석 및 RAG 기술 동향...'
    },
    {
      pageNum: 3,
      text: `3. 클라우드 아키텍처 및 보안 가이드라인

기업용 데이터 분석 앱 구축 시 보안과 개인정보 보호는 최우선 과제입니다.
보고서 조사 결과에 따르면, 전체 금융 및 의료 기관의 82%가 브라우저 로컬 파싱 방식(Client-side Parsing)을 선호합니다.

주요 보안 수칙:
1. 외부 서버로 원본 파일 전송 최소화 (로컬 인덱싱 권장)
2. API 키 관리 시 엔드포인트 암호화 및 LocalStorage 안심 보관
3. 실시간 토큰 사용량 제어 및 데이터 로깅 최소화

이를 구현함으로서 기업은 민감한 기밀 문서나 고객 데이터를 외부 유출 걱정 없이 안전하게 다룰 수 있습니다.`,
      wordCount: 110,
      snippet: '3. 클라우드 아키텍처 및 보안 가이드라인...'
    },
    {
      pageNum: 4,
      text: `4. 생성형 AI 도입에 따른 기대 효과 및 경제적 영향

AI 도입 기업 500개사를 대상으로 한 실증 분석 결과는 다음과 같습니다:

- 업무 처리 시간 단축: 보고서 작성 시간 평균 68% 감소 (주당 12시간 절약)
- 오류율 감소: 수동 데이터 입력을 자동화함으로써 오류 발생률 92% 하락
- 만족도 상승: 직원들의 업무 만족도 4.8 / 5.0 점 기록

결론적으로, 지능형 PDF 탐색기 및 AI 조수를 도입한 조직은 경쟁사 대비 평균 3.2배 빠르게 정보 의사결정을 내릴 수 있었습니다.`,
      wordCount: 115,
      snippet: '4. 생성형 AI 도입에 따른 기대 효과 및 경제적 영향...'
    },
    {
      pageNum: 5,
      text: `5. 향후 전망 및 결론

2026년 이후 AI 생태계는 단순 대화형 AI를 넘어 멀티모달 자율 에이전트로 빠르게 진화할 것입니다.
기업은 개별 문서를 읽고 답변하는 단계를 지나, 회사 전체 지식 창고와 연동되는 지능형 지식 맵을 구축해야 합니다.

핵심 요약:
1. 로컬 보안 파싱 + AI 하이브리드 추천 엔진 구축
2. 출처 인용 중심의 투명한 QA 시스템 제공
3. 사용자 친화적인 웹 인터페이스 및 즉각적인 인터랙션 보장`,
      wordCount: 105,
      snippet: '5. 향후 전망 및 결론...'
    }
  ];

  const fullText = pages.map((p) => `\n[페이지 ${p.pageNum}]\n` + p.text).join('\n');
  const totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);

  return {
    fileName: '2026_AI_디지털_혁신_보고서_샘플.pdf',
    fileSize: '1.2 MB',
    title: '2026 AI 및 디지털 혁신 보고서',
    numPages: pages.length,
    totalWords,
    readingTimeMin: 3,
    pages,
    fullText,
    keywords: ['AI 기술', 'RAG 검색', '스마트 PDF', '클라우드 보안', '생산성 향상', '에이전틱 AI'],
    suggestedQuestions: [
      '이 보고서의 핵심 내용 3가지를 요약해 줘',
      '스마트 RAG 아키텍처의 3단계는 무엇인가요?',
      'AI 도입으로 얻은 실제 기대 효과와 경제적 영향은?',
      '기업 보안을 위한 클라우드 가이드라인 알려줘'
    ]
  };
}

/**
 * Extract keywords from document text
 */
function extractKeywords(text) {
  const commonWords = new Set(['이', '그', '저', '및', '의', '을', '를', '에', '가', '은', '는', '으로', '로', '와', '과', '도', '입니다', '합니다', '등', '있습니다', '수', '본', '통해']);
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !commonWords.has(w));

  const freqMap = {};
  words.forEach((w) => {
    freqMap[w] = (freqMap[w] || 0) + 1;
  });

  return Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

/**
 * Generate suggested questions based on text
 */
function generateSuggestedQuestions(text, title) {
  return [
    `'${title || '이 문서'}'의 3줄 핵심 요약을 작성해 줘`,
    '문서에서 가장 강조하고 있는 주요 내용이나 수치는 무엇인가요?',
    '결론 및 향후 시사점에 대해 정리해 줘',
    '이 문서에서 자주 등장하는 주요 키워드와 개념을 설명해 줘'
  ];
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
