/**
 * Smart QA Engine with Gemini API Integration & Robust Local Context Fallback
 */

export async function askPdfQuestion(question, docData, apiKey = '') {
  try {
    if (!docData || !docData.pages || docData.pages.length === 0) {
      return {
        answer: '분석할 PDF 문서가 업로드되지 않았습니다. PDF 파일을 먼저 업로드해 주세요.',
        sources: [],
        usedApi: false
      };
    }

    // Safely extract title and pages
    const docTitle = docData.title || docData.fileName || 'PDF 문서';
    const pages = docData.pages.map(p => ({
      pageNum: p.pageNum || 1,
      text: typeof p.text === 'string' ? p.text : '',
      snippet: p.snippet || ''
    }));

    // 1. Retrieve top matching context pages
    const relevantPages = searchRelevantPages(question, pages, docTitle);

    // 2. If API Key exists, try calling Gemini API with rich context
    if (apiKey && apiKey.trim().length > 0) {
      try {
        // For Gemini, send expanded context (up to 7 top pages, or all pages if total <= 15)
        const apiPages = pages.length <= 15
          ? pages
          : getExpandedPages(relevantPages, pages, 7);

        const geminiAnswer = await callGeminiApi(question, apiPages, docTitle, apiKey.trim());
        return {
          answer: geminiAnswer,
          sources: relevantPages.map(p => p.pageNum),
          usedApi: true
        };
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local engine:', err.message);
        // Fallthrough to local synthesis gracefully
        const localResponse = synthesizeLocalAnswer(question, relevantPages, docData);
        return {
          answer: `${localResponse.answer}\n\n*(⚡ Gemini API 사용량 제한 또는 응답 지연으로 로컬 분석 엔진으로 전환되었습니다.)*`,
          sources: localResponse.sources,
          usedApi: false
        };
      }
    }

    // 3. Fallback: Smart Local Synthesis Engine
    const localResponse = synthesizeLocalAnswer(question, relevantPages, docData);
    return {
      answer: localResponse.answer,
      sources: localResponse.sources,
      usedApi: false
    };
  } catch (globalErr) {
    console.error('Error inside askPdfQuestion:', globalErr);
    // Safety net fallback so UI never displays crude error crash
    return {
      answer: `📄 **문서 답변 생성 안내**\n\n질문 관련 내용을 분석하는 중 예외가 발생하여 기본 로컬 요약을 제공합니다.\n\n📌 **참고 추천:** PDF 뷰어에서 1페이지부터 순차적으로 내용을 확인하실 수 있습니다.`,
      sources: [1],
      usedApi: false
    };
  }
}

/**
 * Korean Particles (조사) & Affixes list for stemming
 */
const KOREAN_PARTICLES = [
  '에서의', '에대한', '에관한', '에대하여', '에관하여', '으로는', '에서는',
  '에서', '으로', '에게', '한테', '부터', '까지', '이란', '은', '는', '이',
  '가', '을', '를', '의', '에', '와', '과', '도', '만', '로', '란'
];

/**
 * Common Korean question stop words
 */
const BASE_STOP_WORDS = new Set([
  '내용', '내용은', '내용이', '내용을', '무엇', '무엇인가요', '무엇인가', '무엇인지',
  '어떻게', '설명', '설명해', '설명해줘', '알려줘', '알려주세요', '정리', '정리해줘',
  '뜻', '의미', '정보', '관한', '대한', '대해', '있어', '있는', '어떤', '문서',
  '페이지', '관하여', '대하여', '대해서', '확인', '요청', '제시', '법률', '시행'
]);

/**
 * Filter out PDF Header / Footer metadata lines (e.g. "법제처 1 국가법령정보센터 민법...")
 */
function isHeaderOrFooterLine(line) {
  if (!line || typeof line !== 'string') return true;
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  if (/^법제처\s*\d*\s*국가법령정보센터/i.test(trimmed)) return true;
  if (/^\[시행\s*\d{4}/i.test(trimmed)) return true;
  if (/^\[법률\s*제\d+호/i.test(trimmed)) return true;
  return false;
}

/**
 * Remove Korean particles from the end of a word
 */
function stripKoreanParticle(word) {
  if (!word || typeof word !== 'string') return '';
  let cleaned = word;
  for (const particle of KOREAN_PARTICLES) {
    if (cleaned.length > particle.length + 1 && cleaned.endsWith(particle)) {
      cleaned = cleaned.slice(0, -particle.length);
      break;
    }
  }
  return cleaned;
}

/**
 * Extract exact law article numbers (e.g. 제1조, 제 1 조, 1조, 제1장)
 */
function extractArticlePatterns(query) {
  const patterns = [];
  
  // Match "제1조", "제 1 조", "제1조의2", "1조"
  const artMatches = query.match(/(?:제\s*)?(\d+(?:의\d+)?)\s*조/g);
  if (artMatches) {
    artMatches.forEach(m => {
      const numMatch = m.match(/\d+(?:의\d+)?/);
      if (numMatch) {
        const num = numMatch[0];
        patterns.push({
          raw: m.replace(/\s+/g, ''),
          artNum: num,
          // Negative lookbehind & lookahead to prevent "1조" from matching inside "31조" or "194조"
          regex: new RegExp(`(?:^|[^\\d가-힣])(?:제\\s*${num}\\s*조|\\b${num}\\s*조)(?![\\d가-힣])`, 'i')
        });
      }
    });
  }

  // Match "제1장", "제1절", "제1항"
  const sectionMatches = query.match(/(?:제\s*)?(\d+)\s*([장절항관])/g);
  if (sectionMatches) {
    sectionMatches.forEach(m => {
      const numMatch = m.match(/\d+/);
      const unitMatch = m.match(/[장절항관]/);
      if (numMatch && unitMatch) {
        patterns.push({
          raw: m.replace(/\s+/g, ''),
          artNum: numMatch[0],
          regex: new RegExp(`(?:^|[^\\d가-힣])제\\s*${numMatch[0]}\\s*${unitMatch[0]}(?![\\d가-힣])`, 'i')
        });
      }
    });
  }

  return patterns;
}

/**
 * Search and rank relevant pages based on query tokens, article patterns, and stemming
 */
function searchRelevantPages(query, pages, docTitle = '') {
  const articlePatterns = extractArticlePatterns(query);

  // Build dynamic stop words (including main title words like "민법")
  const stopWords = new Set(BASE_STOP_WORDS);
  if (docTitle) {
    const titleWords = docTitle.toLowerCase().replace(/[^\w\s가-힣]/g, ' ').split(/\s+/);
    titleWords.forEach(w => {
      if (w.length >= 2) stopWords.add(w);
    });
  }

  // Raw tokenization
  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 1);

  // Processed tokens with particle stemming
  const processedTokens = [];
  rawTokens.forEach(t => {
    if (t.length >= 2) {
      processedTokens.push(t);
      const stemmed = stripKoreanParticle(t);
      if (stemmed.length >= 2 && stemmed !== t) {
        processedTokens.push(stemmed);
      }
    }
  });

  const uniqueTokens = Array.from(new Set(processedTokens));

  const scoredPages = pages.map(page => {
    const pageText = page.text ? page.text.toLowerCase() : '';
    let score = 0;

    // 1. Article / Section Pattern Match (MASSIVE PRIORITY BONUS)
    articlePatterns.forEach(ap => {
      if (ap.regex.test(page.text)) {
        score += 200;
        // Extra bonus if article appears in body text
        if (ap.regex.test(page.text.slice(0, 300))) {
          score += 100;
        }
      }
    });

    // 2. Keyword & Token Matching with IDF/Stopword weighting
    uniqueTokens.forEach(token => {
      const isStop = stopWords.has(token);
      const weight = isStop ? 0.05 : 3.0;

      // Count occurrences
      const reg = new RegExp(escapeRegExp(token), 'gi');
      const matches = (pageText.match(reg) || []).length;
      score += matches * weight;

      // Body heading bonus
      if (!isStop && pageText.slice(0, 150).includes(token)) {
        score += 8.0;
      }
    });

    // 3. Exact query substring bonus
    const cleanQuery = query.replace(/[^\w\s가-힣]/g, '').trim().toLowerCase();
    if (cleanQuery.length >= 3 && pageText.includes(cleanQuery)) {
      score += 30;
    }

    return { page, score };
  });

  // Sort descending by score
  scoredPages.sort((a, b) => b.score - a.score);

  // If top page score is 0, return first 2 pages as default context
  if (scoredPages.length === 0 || scoredPages[0].score === 0) {
    return pages.slice(0, 2);
  }

  // Return top matching pages (max 3 pages for local display)
  const topMatches = scoredPages.filter(sp => sp.score > 0).slice(0, 3).map(sp => sp.page);

  return topMatches.length > 0 ? topMatches : pages.slice(0, 2);
}

/**
 * Expand context pages by adding adjacent pages if needed
 */
function getExpandedPages(topPages, allPages, maxPages = 5) {
  const selectedPageNums = new Set(topPages.map(p => p.pageNum));

  // Add adjacent pages for continuity
  topPages.forEach(p => {
    if (p.pageNum > 1) selectedPageNums.add(p.pageNum - 1);
    if (p.pageNum < allPages.length) selectedPageNums.add(p.pageNum + 1);
  });

  const expanded = allPages.filter(p => selectedPageNums.has(p.pageNum));
  return expanded.slice(0, maxPages);
}

/**
 * Synthesizes a clean Korean answer locally using retrieved text context
 */
function synthesizeLocalAnswer(query, topPages, docData) {
  const sources = topPages.map(p => p.pageNum);
  const qLower = query.toLowerCase();
  const docTitle = docData.title || docData.fileName || '문서';

  // Special quick handlers for common query types
  if (qLower.includes('요약') || qLower.includes('핵심') || qLower.includes('3줄')) {
    const summaryPoints = topPages.map((p, idx) => {
      const cleanLines = p.text.split('\n').filter(l => !isHeaderOrFooterLine(l));
      const firstSentence = cleanLines.join(' ').split(/(?<=[.!?])\s+/)[0] || p.snippet;
      return `${idx + 1}. **[페이지 ${p.pageNum}]** ${firstSentence}`;
    }).join('\n\n');

    return {
      answer: `📄 **문서 핵심 요약 내용입니다:**\n\n${summaryPoints}\n\n💡 *자세한 내용은 해당 페이지를 클릭하여 PDF 뷰어에서 확인하실 수 있습니다.*`,
      sources
    };
  }

  if (qLower.includes('목차') || qLower.includes('구조') || qLower.includes('순서')) {
    const tocList = docData.pages.map(p => {
      const cleanLines = p.text.split('\n').filter(l => !isHeaderOrFooterLine(l));
      const titleLine = cleanLines[0] || p.text.slice(0, 40);
      return `- **페이지 ${p.pageNum}**: ${titleLine.slice(0, 50)}...`;
    }).join('\n');

    return {
      answer: `📑 **문서 구성 및 목차 정보:**\n\n${tocList}`,
      sources: docData.pages.slice(0, 3).map(p => p.pageNum)
    };
  }

  // Extract query keywords & article patterns
  const articlePatterns = extractArticlePatterns(query);
  
  const stopWords = new Set(BASE_STOP_WORDS);
  if (docTitle) {
    docTitle.toLowerCase().replace(/[^\w\s가-힣]/g, ' ').split(/\s+/).forEach(w => {
      if (w.length >= 2) stopWords.add(w);
    });
  }

  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .map(stripKoreanParticle)
    .filter(t => t.length >= 2 && !stopWords.has(t));

  let responseText = `업로드하신 **"${docTitle}"** 문서에서 질문 관련 핵심 구절을 찾았습니다:\n\n`;

  topPages.forEach((p) => {
    // Split sentences and filter out PDF header/footer metadata
    const rawSentences = p.text.split(/(?<=[.!?\n])\s+/).filter(s => s && s.trim().length > 0);
    const cleanSentences = rawSentences.filter(s => !isHeaderOrFooterLine(s));

    let targetSentences = [];

    // 1. First priority: Exact Article Pattern match in sentence
    if (articlePatterns.length > 0) {
      targetSentences = cleanSentences.filter(s => 
        articlePatterns.some(ap => ap.regex.test(s))
      );
    }

    // 2. Second priority: Search terms match in sentence
    if (targetSentences.length === 0 && searchTerms.length > 0) {
      targetSentences = cleanSentences.filter(s => {
        const sLower = s.toLowerCase();
        return searchTerms.some(term => sLower.includes(term));
      });
    }

    // 3. Fallback: First few clean sentences of page
    if (targetSentences.length === 0) {
      targetSentences = cleanSentences.slice(0, 3);
    }

    const highlightText = targetSentences.slice(0, 3).join(' ');

    responseText += `📌 **출처: 페이지 ${p.pageNum}**\n> "${highlightText.trim()}"\n\n`;
  });

  responseText += `💡 *상단 출처 버튼이나 PDF 뷰어에서 해당 페이지로 이동하여 전체 원문을 보실 수 있습니다.*`;

  return {
    answer: responseText,
    sources
  };
}

/**
 * Call Gemini API with doc context & multiple model fallback
 */
async function callGeminiApi(question, relevantPages, docTitle, apiKey) {
  const contextStr = relevantPages
    .map(p => `[페이지 ${p.pageNum}]\n${p.text}`)
    .join('\n\n---\n\n');

  const prompt = `당신은 전문 PDF 지식 분석 AI입니다. 아래 제공된 PDF 문서의 내용만을 기반으로 사용자의 질문에 정확하고 친절하게 한국어로 답변해 주세요.

[참고할 PDF 문서 맥락]
문서 제목: ${docTitle}
${contextStr}

[사용자 질문]
${question}

[답변 작성 가이드라인]
1. 사용자가 특정 조항(예: 제1조, 제2조 등)이나 특정 주제를 물어보는 경우, 본문에 있는 정확한 조항 전문과 핵심 구절을 명확하게 설명해 주세요.
2. 답변 내에서 핵심 정보를 인용할 때 반드시 **[페이지 N 출처]** 형태로 출처 페이지 번호를 명확히 밝혀주세요.
3. 불필요한 추측은 피하고 문서에 명시된 사실을 기반으로 명확하고 깔끔한 마크다운 형식(글머리 기호, 강조 표시 등)으로 작성하세요.`;

  // Model fallback chain: Try 1.5 Flash first, fallback to 2.0 Flash / 1.5 Pro if available
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API 호출 실패 (${modelName}, 코드: ${response.status})`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text;

      if (replyText) {
        return replyText;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gemini API로부터 응답을 받지 못했습니다.');
}

function escapeRegExp(string) {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a comprehensive summary report combining PDF content and user Q&A conversation history
 */
export async function generateDocumentReport(docData, chatMessages = [], apiKey = '') {
  if (!docData || !docData.pages || docData.pages.length === 0) {
    return '# ⚠️ 오류\n\n분석할 PDF 문서 데이터가 없습니다.';
  }

  // Format user conversation history
  const userQaHistory = chatMessages
    .filter(msg => msg.text)
    .map(msg => `[${msg.sender === 'user' ? '질문' : 'AI 답변'}] ${msg.text}`)
    .join('\n\n');

  // Try calling Gemini API if key exists
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const reportText = await callGeminiReportApi(docData, userQaHistory, apiKey.trim());
      return reportText;
    } catch (err) {
      console.warn('Gemini report API failed, falling back to local synthesis report:', err);
    }
  }

  // Fallback: Local Synthesis Report
  return synthesizeLocalReport(docData, chatMessages);
}

/**
 * Synthesize a local structured markdown report
 */
function synthesizeLocalReport(docData, chatMessages = []) {
  const docTitle = docData.title || docData.fileName || 'PDF 문서';
  const numPages = docData.numPages || docData.pages.length;
  const totalWords = docData.totalWords || 0;
  const keywords = docData.keywords || [];

  // Extract page highlights
  const pageHighlights = docData.pages.slice(0, 10).map((p) => {
    const cleanLines = p.text.split('\n').filter(l => !isHeaderOrFooterLine(l));
    const firstLine = cleanLines[0] || p.snippet || '내용 요약 중...';
    return `- **페이지 ${p.pageNum}**: ${firstLine.slice(0, 80)}`;
  }).join('\n');

  // Extract chat QA summary
  const userQuestions = chatMessages.filter(m => m.sender === 'user');
  let qaSection = '';
  if (userQuestions.length > 0) {
    qaSection = userQuestions.map((q, idx) => {
      return `${idx + 1}. **질문**: "${q.text}"`;
    }).join('\n');
  } else {
    qaSection = '*진행된 대화 기록이 없거나 기본 분석 모드입니다.*';
  }

  return `# 📄 ${docTitle} 종합 분석 및 요약 리포트

## 📌 1. 문서 종합 개요 (Executive Summary)
- **문서 제목**: ${docTitle}
- **총 분량**: ${numPages}페이지 (약 ${totalWords.toLocaleString()} 단어)
- **주요 키워드**: ${keywords.map(k => `\`#${k}\``).join(' ') || '자동 분석 진행 중'}
- **분석 개요**: 본 보고서는 업로드된 **"${docTitle}"** PDF 문서의 전체 본문 구조와 주요 조항 및 질의응답 대화 기록을 바탕으로 핵심 정보를 종합 요약한 스마트 보고서입니다.

---

## 🔑 2. 문서 핵심 요약 (Key Highlights)
1. **주요 주제 및 핵심 구조**: 문서 전체 ${numPages}개 페이지에 걸쳐 구성된 핵심 본문 내용 및 필수 항목을 정리하였습니다.
2. **핵심 구절 추출**: 문서 전반에서 가장 높은 관련도를 가진 주요 파트를 인덱싱하였습니다.
3. **가독성 최적화**: 사용자가 문서 전체를 정독하지 않고도 핵심 수치와 가이드라인을 즉시 파악할 수 있도록 구성했습니다.

---

## 📑 3. 주요 페이지별 세부 내용 분석
${pageHighlights}

---

## 💬 4. 주요 질의응답 및 사용자 대화 요약
${qaSection}

---

## 💡 5. 종합 결론 및 추천 활용 방안
- **최종 요약**: 본 문서는 **${keywords.slice(0, 3).join(', ') || '핵심 주제'}**에 관한 핵심 내용을 담고 있으며, 상단 인쇄 버튼을 통해 PDF 저장 및 실물 출력이 가능합니다.
- **활용 팁**: 추가로 궁금한 세부 사항은 AI 문서 어시스턴트 대화창에 특정 페이지 번호나 키워드로 질문하시면 즉시 원문 출처와 함께 정밀 답변을 받으실 수 있습니다.`;
}

/**
 * Call Gemini API for Report Generation
 */
async function callGeminiReportApi(docData, userQaHistory, apiKey) {
  const docTitle = docData.title || docData.fileName || 'PDF 문서';
  
  // Sample document text up to 10 pages for prompt context
  const samplePages = docData.pages.slice(0, 10).map(p => `[페이지 ${p.pageNum}]\n${p.text.slice(0, 500)}`).join('\n\n---\n\n');

  const prompt = `당신은 문서 분석 및 보고서 작성 최고의 전문가입니다. 
아래 제공된 PDF 문서 본문 정보와 사용자가 챗봇과 나눈 질문/답변 기록을 종합 분석하여, 사용자가 한눈에 이해할 수 있는 최고급 마크다운 [AI 문서 종합 분석 & 대화 요약 보고서]를 작성해 주세요.

[문서 기본 정보]
- 문서 제목: ${docTitle}
- 전체 페이지 수: ${docData.numPages}페이지
- 주요 키워드: ${docData.keywords?.join(', ')}

[PDF 원문 내용 요약 샘플]
${samplePages}

[사용자 및 AI 대화 기록]
${userQaHistory || '대화 기록 없음'}

[보고서 작성 필수 구성 목차]
# 📄 ${docTitle} 종합 분석 및 요약 리포트

## 📌 1. 문서 종합 개요 (Executive Summary)
(문서의 목적, 배경 및 핵심 개요 요약)

## 🔑 2. 주요 핵심 요약 (Key Highlights)
(가장 중요한 핵심 사항 3~5가지를 글머리 기호로 정리)

## 📑 3. 주요 장/페이지별 세부 분석
(주요 페이지별 핵심 내용과 출처 [페이지 N]을 포함하여 정리)

## 💬 4. 주요 질의응답 및 대화 요약
(사용자가 질문한 핵심 궁금증과 해결 내용 종합)

## 💡 5. 종합 결론 및 인사이트
(문서의 최종 시사점 및 시사하는 바)

[작성 가이드라인]
- 전문적이고 깔끔한 마크다운 형식으로 작성하세요.
- 중요한 단어나 숫자는 **강조 표시**하세요.`;

  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API 호출 실패 (${modelName})`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text;

      if (replyText) {
        return replyText;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gemini API 보고서 생성 실패');
}



