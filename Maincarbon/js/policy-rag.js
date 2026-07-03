let POLICY_DATA = [];

async function loadPolicyData() {
  const files = [
    './data/ai_policy.json',
    './data/carbon_policy.json'
  ];

  const results = await Promise.all(
    files.map(url => fetch(url).then(res => res.json()))
  );

  POLICY_DATA = results.flat();
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '');
}

function scoreItem(item, query) {
  const q = normalizeText(query);
  let score = 0;

  const title = normalizeText(item.title);
  const category = normalizeText(item.category);
  const answer = normalizeText(item.answer);
  const recommendation = normalizeText(item.recommendation);
  const tags = (item.tags || []).map(normalizeText);
  const patterns = (item.question_patterns || []).map(normalizeText);

  if (title.includes(q)) score += 40;
  if (category.includes(q)) score += 20;
  if (answer.includes(q)) score += 10;
  if (recommendation.includes(q)) score += 8;

  patterns.forEach(p => {
    if (p.includes(q) || q.includes(p)) score += 35;
  });

  tags.forEach(t => {
    if (t.includes(q) || q.includes(t)) score += 25;
  });

  // 關鍵字拆解加分
  const keywords = Array.from(new Set(query.split(/[\s,，、。？?]+/).filter(Boolean)));

  keywords.forEach(word => {
    const w = normalizeText(word);
    if (!w) return;

    if (title.includes(w)) score += 12;
    if (category.includes(w)) score += 6;
    if (answer.includes(w)) score += 4;
    if (recommendation.includes(w)) score += 4;

    tags.forEach(t => {
      if (t.includes(w) || w.includes(t)) score += 10;
    });

    patterns.forEach(p => {
      if (p.includes(w) || w.includes(p)) score += 10;
    });
  });

  return score;
}

function searchPolicy(query) {
  return POLICY_DATA
    .map(item => ({
      ...item,
      _score: scoreItem(item, query)
    }))
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);
}

function renderAnswer(results, query) {
  const answerBox = document.getElementById('policyAnswer');
  const relatedBox = document.getElementById('policyRelated');

  if (!answerBox || !relatedBox) return;

  if (!results.length) {
    answerBox.innerHTML = `
      <strong>目前沒有找到完全對應的政策資料。</strong><br><br>
      你可以改問：AI新十大建設、主權AI、2050淨零、碳費、低碳化補助、碳盤查、ISO 14064。
    `;
    relatedBox.innerHTML = '';
    return;
  }

  const best = results[0];

  answerBox.innerHTML = `
    <div style="font-size:13px;color:#2c6e2f;font-weight:700;margin-bottom:6px;">
      ${best.category || '政策資料'}
    </div>
    <h3 style="margin:0 0 10px;color:#1a4d1a;">${best.title}</h3>
    <p style="line-height:1.7;margin-bottom:12px;">${best.answer || ''}</p>
    ${
      best.recommendation
        ? `<div style="background:#f0f9f0;border-left:5px solid #2c6e2f;padding:10px 12px;border-radius:12px;">
            <strong>建議：</strong>${best.recommendation}
           </div>`
        : ''
    }
    ${
      best.source_url
        ? `<p style="margin-top:10px;font-size:12px;">
            來源：<a href="${best.source_url}" target="_blank" rel="noopener">${best.source || '官方政策資料'}</a>
           </p>`
        : ''
    }
  `;

  relatedBox.innerHTML = results.map(item => `
    <div style="background:#fff;border:1px solid #dbe7db;border-radius:16px;padding:12px;margin-top:10px;">
      <div style="font-size:12px;color:#666;">${item.category || ''}</div>
      <strong>${item.title}</strong>
      <p style="font-size:14px;line-height:1.5;margin:6px 0 0;">
        ${(item.answer || '').slice(0, 90)}...
      </p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('policyAskBtn');
  const input = document.getElementById('policyQuestion');
  const answerBox = document.getElementById('policyAnswer');

  if (!btn || !input || !answerBox) return;

  answerBox.textContent = '政策資料載入中...';

  try {
    await loadPolicyData();
    answerBox.textContent = '請輸入政府 AI 政策、減碳政策、碳費、補助或碳盤查問題。';
  } catch (err) {
    console.error(err);
    answerBox.textContent = '政策資料載入失敗，請確認 data/ai_policy.json 與 data/carbon_policy.json 是否存在。';
    return;
  }

  btn.addEventListener('click', () => {
    const query = input.value.trim();

    if (!query) {
      answerBox.textContent = '請先輸入問題。';
      return;
    }

    const results = searchPolicy(query);
    renderAnswer(results, query);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      btn.click();
    }
  });
});
