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

  // 2. If API Key exists, try calling Gemini API
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const geminiAnswer = await callGeminiApi(question, relevantPages, docData.title, apiKey.trim());
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
 * Search and rank relevant pages based on query tokens
 */
function searchRelevantPages(query, pages) {
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  if (queryTokens.length === 0) {
    return pages.slice(0, 3);
  }

  const scoredPages = pages.map(page => {
    const pageText = page.text.toLowerCase();
    let score = 0;

    queryTokens.forEach(token => {
      // Frequency score
      const matches = (pageText.match(new RegExp(escapeRegExp(token), 'g')) || []).length;
      score += matches * 2;

      // Title/heading match bonus
      if (pageText.slice(0, 80).includes(token)) {
        score += 5;
      }
    });

    return { page, score };
  });

  // Sort descending by score
  scoredPages.sort((a, b) => b.score - a.score);

  // If top page score is 0, return first 2 pages as default context
  if (scoredPages[0].score === 0) {
    return pages.slice(0, 2);
  }

  // Filter top matches (max 3 pages)
  return scoredPages.filter(sp => sp.score > 0).slice(0, 3).map(sp => sp.page);
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

  // General Q&A synthesis
  let responseText = `업로드하신 **"${docData.title}"** 문서에서 질문 관련 내용을 찾았습니다:\n\n`;

  topPages.forEach((p, index) => {
    // Find sentences with matching keywords
    const sentences = p.text.split(/(?<=[.!?])\s+/);
    const relevantSentences = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return query.split(/\s+/).some(term => term.length >= 2 && sLower.includes(term.toLowerCase()));
    });

    const highlightText = relevantSentences.length > 0 
      ? relevantSentences.slice(0, 2).join(' ')
      : p.text.slice(0, 180) + '...';

    responseText += `📌 **출처: 페이지 ${p.pageNum}**\n> "${highlightText.trim()}"\n\n`;
  });

  responseText += `\n추가 질문이 있으시면 언제든지 물어보세요!`;

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
1. 답변 내에서 핵심 정보를 인용할 때 반드시 **[페이지 N 출처]** 형태로 출처 페이지 번호를 밝혀주세요.
2. 불필요한 추측은 피하고 문서에 명시된 사실을 기반으로 명확하고 깔끔한 마크다운 형식(글머리 기호, 강조 표시 등)으로 작성하세요.`;

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
