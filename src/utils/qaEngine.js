/**
 * Smart QA Engine with Gemini API Integration & Local Context Fallback
 */

export async function askPdfQuestion(question, docData, apiKey = '') {
  if (!docData || !docData.pages || docData.pages.length === 0) {
    return {
      answer: '분석할 PDF 문서가 업로드되지 않았습니다.',
      sources: []
    };
  }

  // 1. Retrieve top matching context pages
  const relevantPages = searchRelevantPages(question, docData.pages);

  // 2. If API Key exists, try calling Gemini API with rich context
  if (apiKey && apiKey.trim().length > 0) {
    try {
      // For Gemini, send expanded context (up to 7 top pages, or all pages if total <= 15)
      const apiPages = docData.pages.length <= 15
        ? docData.pages
        : getExpandedPages(relevantPages, docData.pages, 7);

      const geminiAnswer = await callGeminiApi(question, apiPages, docData.title, apiKey.trim());
      return {
        answer: geminiAnswer,
        sources: relevantPages.map(p => p.pageNum),
        usedApi: true
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local engine:', err);
    }
  }

  // 3. Fallback: Smart Local Synthesis Engine
  const localResponse = synthesizeLocalAnswer(question, relevantPages, docData);
  return {
    answer: localResponse.answer,
    sources: localResponse.sources,
    usedApi: false
  };
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
 * Common Korean question stop words (downweighted in TF scoring)
 */
const STOP_WORDS = new Set([
  '내용', '내용은', '내용이', '내용을', '무엇', '무엇인가요', '무엇인가', '무엇인지',
  '어떻게', '설명', '설명해', '설명해줘', '알려줘', '알려주세요', '정리', '정리해줘',
  '뜻', '의미', '정보', '관한', '대한', '대해', '있어', '있는', '어떤', '문서',
  '페이지', '관하여', '대하여', '대해서', '확인', '요청', '제시'
]);

/**
 * Remove Korean particles from the end of a word
 */
function stripKoreanParticle(word) {
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
 * Extract law article numbers and patterns like 제1조, 제 1 조, 1조, 제1장, 제1항
 */
function extractArticlePatterns(query) {
  const patterns = [];
  
  // Match "제1조", "제 1 조", "제1조의2", "1조"
  const artMatches = query.match(/제?\s*(\d+(?:의\d+)?)\s*조/g);
  if (artMatches) {
    artMatches.forEach(m => {
      const numMatch = m.match(/\d+(?:의\d+)?/);
      if (numMatch) {
        const num = numMatch[0];
        patterns.push({
          raw: m.replace(/\s+/g, ''),
          artNum: num,
          regex: new RegExp(`(제\\s*${num}\\s*조|\\b${num}\\s*조)`, 'i')
        });
      }
    });
  }

  // Match "제1장", "제1절", "제1항"
  const sectionMatches = query.match(/제?\s*(\d+)\s*([장절항관])/g);
  if (sectionMatches) {
    sectionMatches.forEach(m => {
      const numMatch = m.match(/\d+/);
      const unitMatch = m.match(/[장절항관]/);
      if (numMatch && unitMatch) {
        patterns.push({
          raw: m.replace(/\s+/g, ''),
          artNum: numMatch[0],
          regex: new RegExp(`제\\s*${numMatch[0]}\\s*${unitMatch[0]}`, 'i')
        });
      }
    });
  }

  return patterns;
}

/**
 * Search and rank relevant pages based on query tokens, article patterns, and stemming
 */
function searchRelevantPages(query, pages) {
  const articlePatterns = extractArticlePatterns(query);

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
    const pageText = page.text.toLowerCase();
    let score = 0;

    // 1. Article / Section Pattern Match (MASSIVE BONUS)
    articlePatterns.forEach(ap => {
      if (ap.regex.test(page.text)) {
        score += 100;
        // Additional bonus if article appears near page start / heading
        if (ap.regex.test(page.text.slice(0, 150))) {
          score += 50;
        }
      }
    });

    // 2. Keyword & Token Matching with IDF/Stopword weighting
    uniqueTokens.forEach(token => {
      const isStop = STOP_WORDS.has(token);
      const weight = isStop ? 0.2 : 3.0;

      // Count occurrences
      const reg = new RegExp(escapeRegExp(token), 'gi');
      const matches = (pageText.match(reg) || []).length;
      score += matches * weight;

      // Heading bonus
      if (!isStop && pageText.slice(0, 100).includes(token)) {
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
  if (scoredPages[0].score === 0) {
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

  // Special quick handlers for common query types
  if (qLower.includes('요약') || qLower.includes('핵심') || qLower.includes('3줄')) {
    const summaryPoints = topPages.map((p, idx) => {
      const firstSentence = p.text.split(/(?<=[.!?])\s+/)[0] || p.snippet;
      return `${idx + 1}. **[페이지 ${p.pageNum}]** ${firstSentence}`;
    }).join('\n\n');

    return {
      answer: `📄 **문서 핵심 요약 내용입니다:**\n\n${summaryPoints}\n\n💡 *자세한 내용은 해당 페이지를 클릭하여 PDF 뷰어에서 확인하실 수 있습니다.*`,
      sources
    };
  }

  if (qLower.includes('목차') || qLower.includes('구조') || qLower.includes('순서')) {
    const tocList = docData.pages.map(p => {
      const titleLine = p.text.split('\n')[0] || p.text.slice(0, 40);
      return `- **페이지 ${p.pageNum}**: ${titleLine.slice(0, 50)}...`;
    }).join('\n');

    return {
      answer: `📑 **문서 구성 및 목차 정보:**\n\n${tocList}`,
      sources: docData.pages.slice(0, 3).map(p => p.pageNum)
    };
  }

  // Extract query keywords (excluding stop words)
  const articlePatterns = extractArticlePatterns(query);
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .map(stripKoreanParticle)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));

  let responseText = `업로드하신 **"${docData.title}"** 문서에서 질문 관련 핵심 구절을 찾았습니다:\n\n`;

  topPages.forEach((p) => {
    // Find sentences with matching keywords or article patterns
    const sentences = p.text.split(/(?<=[.!?\n])\s+/).filter(s => s.trim().length > 0);
    
    let relevantSentences = sentences.filter(s => {
      const sLower = s.toLowerCase();
      // Check article pattern
      if (articlePatterns.some(ap => ap.regex.test(s))) return true;
      // Check search terms
      return searchTerms.some(term => sLower.includes(term));
    });

    if (relevantSentences.length === 0) {
      relevantSentences = sentences.slice(0, 3);
    }

    const highlightText = relevantSentences.slice(0, 3).join(' ');

    responseText += `📌 **출처: 페이지 ${p.pageNum}**\n> "${highlightText.trim()}"\n\n`;
  });

  responseText += `💡 *상단 출처 버튼이나 PDF 뷰어에서 해당 페이지로 이동하여 전체 원문을 보실 수 있습니다.*`;

  return {
    answer: responseText,
    sources
  };
}

/**
 * Call Gemini API with doc context
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
1. 사용자가 특정 조항(예: 제1조, 제2조 등)이나 특정 주제를 물어보는 경우, 본문에 있는 정확한 내용과 조항 전문/핵심 구절을 상세히 설명하세요.
2. 답변 내에서 핵심 정보를 인용할 때 반드시 **[페이지 N 출처]** 형태로 출처 페이지 번호를 명확히 밝혀주세요.
3. 불필요한 추측은 피하고 문서에 명시된 사실을 기반으로 명확하고 깔끔한 마크다운 형식(글머리 기호, 강조 표시 등)으로 작성하세요.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gemini API 호출 실패 (상태코드: ${response.status})`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text;

  if (!replyText) {
    throw new Error('Gemini API로부터 응답 텍스트를 받지 못했습니다.');
  }

  return replyText;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

