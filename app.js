/* ======================================================
   EMOTION DIARY — app.js
   브라우저 Web Speech API 기반 한국어 음성 인식 포함
   ====================================================== */

'use strict';

// ── 0. DOM 참조 ────────────────────────────────────────
const headerDate        = document.getElementById('headerDate');
const emojiBtns         = document.querySelectorAll('.emoji-btn');
const emotionLabel      = document.getElementById('emotionLabelDisplay');
const diaryInput        = document.getElementById('diaryInput');
const charCounter       = document.getElementById('charCounter');
const btnVoice          = document.getElementById('btnVoice');
const micIcon           = document.getElementById('micIcon');
const voiceBtnText      = document.getElementById('voiceBtnText');
const voiceStatus       = document.getElementById('voiceStatus');
const btnAI             = document.getElementById('btnAI');
const aiStatus          = document.getElementById('aiStatus');
const aiResponseBody    = document.getElementById('aiResponseBody');
const btnSave           = document.getElementById('btnSave');
const saveToast         = document.getElementById('saveToast');
const bgParticles       = document.getElementById('bgParticles');

// ── 1. 날짜 표시 ───────────────────────────────────────
(function initDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  headerDate.textContent = now.toLocaleDateString('ko-KR', options);
})();

// ── 2. 배경 파티클 ─────────────────────────────────────
(function initParticles() {
  const colors = ['#a78bfa', '#f472b6', '#818cf8', '#fb923c', '#34d399'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    const size = Math.random() * 6 + 3;
    el.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 18 + 12}s;
      animation-delay:${Math.random() * 12}s;
    `;
    bgParticles.appendChild(el);
  }
})();

// ── 3. 감정 이모지 선택 ────────────────────────────────
let selectedEmotion = '';
emojiBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    emojiBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedEmotion = btn.dataset.emotion;
    emotionLabel.textContent = selectedEmotion;
    // 살짝 튕기는 애니메이션
    btn.style.animation = 'none';
    requestAnimationFrame(() => {
      btn.style.animation = '';
    });
  });
});

// ── 4. 글자 수 카운터 ──────────────────────────────────
diaryInput.addEventListener('input', () => {
  const len = diaryInput.value.length;
  charCounter.textContent = `${len} / 1000`;
  charCounter.style.color = len > 900 ? '#f472b6' : '';
});

// ── 5. 음성 인식 (Web Speech API) ─────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (!SpeechRecognition) {
  // 브라우저 미지원 시 버튼 비활성화
  btnVoice.disabled = true;
  btnVoice.title = '이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.';
  voiceStatus.textContent = '⚠️ 음성 인식은 Chrome 브라우저에서만 지원됩니다.';
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'ko-KR';          // 한국어 인식
  recognition.continuous = true;        // 말이 끊겨도 계속 인식
  recognition.interimResults = true;    // 중간 결과도 실시간 표시

  // 인식 중 임시 텍스트 보관용
  let finalTranscript = '';

  recognition.onstart = () => {
    isListening = true;
    finalTranscript = diaryInput.value; // 기존 내용 뒤에 이어붙이기 위해 저장
    setVoiceUI(true);
    voiceStatus.textContent = '🎙️ 듣고 있어요 — 말씀해 주세요...';
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // 최종 + 임시 결과를 합쳐서 textarea에 표시 (이탤릭 느낌 대신 색으로 구분)
    diaryInput.value = finalTranscript + interimTranscript;

    // 글자 수 카운터 업데이트
    const len = diaryInput.value.length;
    charCounter.textContent = `${len} / 1000`;

    // textarea를 항상 최신 내용 끝으로 스크롤
    diaryInput.scrollTop = diaryInput.scrollHeight;

    if (interimTranscript) {
      voiceStatus.textContent = `💬 인식 중: "${interimTranscript}"`;
    }
  };

  recognition.onerror = (event) => {
    let msg = '⚠️ 오류가 발생했어요.';
    switch (event.error) {
      case 'not-allowed':
        msg = '🚫 마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.';
        break;
      case 'no-speech':
        msg = '🤫 말소리가 감지되지 않았어요. 다시 눌러보세요.';
        break;
      case 'network':
        msg = '🌐 네트워크 오류예요. 잠시 후 다시 시도해 주세요.';
        break;
      case 'audio-capture':
        msg = '🎤 마이크를 찾을 수 없어요. 연결을 확인해 주세요.';
        break;
      case 'aborted':
        msg = '';  // 사용자가 직접 끈 경우 — 메시지 필요없음
        break;
    }
    voiceStatus.textContent = msg;
    stopListening();
  };

  recognition.onend = () => {
    // continuous=true 여도 긴 침묵 후 자동 종료될 수 있음
    // → 여전히 isListening 상태면 재시작
    if (isListening) {
      try { recognition.start(); } catch (_) { stopListening(); }
    } else {
      setVoiceUI(false);
    }
  };

  // 버튼 클릭 토글
  btnVoice.addEventListener('click', () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });
}

function startListening() {
  if (!recognition) return;
  try {
    recognition.start();
  } catch (e) {
    voiceStatus.textContent = '⚠️ 음성 인식을 시작할 수 없어요.';
  }
}

function stopListening() {
  isListening = false;
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
  }
  setVoiceUI(false);
  if (voiceStatus.textContent.startsWith('🎙️') || voiceStatus.textContent.startsWith('💬')) {
    voiceStatus.textContent = '✅ 음성 입력이 완료됐어요!';
    setTimeout(() => { voiceStatus.textContent = ''; }, 2500);
  }
}

function setVoiceUI(listening) {
  if (listening) {
    btnVoice.classList.add('recording');
    micIcon.textContent = '⏹️';
    voiceBtnText.textContent = '중지';
  } else {
    btnVoice.classList.remove('recording');
    micIcon.textContent = '🎙️';
    voiceBtnText.textContent = '음성 입력';
  }
}

// ── 6. AI 상담사 연동 (보안 강화: Serverless Proxy 사용) ───────────────────────
async function getGeminiResponse(text, emotion) {
  try {
    const response = await fetch('/api/counselor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, emotion })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const fullText = data.candidates[0].content.parts[0].text.trim();
      
      const lines = fullText.split('\n').filter(line => line.trim() !== '');
      const tag = lines[0].startsWith('#') ? lines[0] : '#감정기록';
      const message = lines.slice(1).join('\n');
      
      return { response: message, tags: [tag] };
    } else {
      throw new Error('응답 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('API Error:', error);
    return { 
      response: '미안해요, 지금 마음이 상담사에게 잠깐 연결 문제가 생겼어요. 잠시 후에 다시 시도해 주세요.', 
      tags: ['#연결오류'] 
    };
  }
}


btnAI.addEventListener('click', async () => {
  const text = diaryInput.value.trim();
  if (!text) {
    showAIMessage('📝 일기를 조금 작성한 뒤 눌러주세요!', [], false);
    return;
  }

  // 로딩 UI
  btnAI.disabled = true;
  aiStatus.textContent = '마음 읽는 중...';
  aiStatus.className = 'ai-status thinking';
  showTypingIndicator();

  // Gemini API 호출
  const { response, tags } = await getGeminiResponse(text, selectedEmotion);

  btnAI.disabled = false;
  aiStatus.textContent = '답변 완료';
  aiStatus.className = 'ai-status';
  setTimeout(() => { aiStatus.textContent = '언제든지 이야기해요'; }, 3000);

  showAIMessage(response, tags, true);
  
  // 응답 영역으로 부드럽게 스크롤
  document.getElementById('aiSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});


function showTypingIndicator() {
  aiResponseBody.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
      <span>마음이 상담사가 답변을 준비하고 있어요...</span>
    </div>
  `;
}

function showAIMessage(text, tags = [], animate = true) {
  const tagsHTML = tags.length
    ? `<div class="ai-tags">${tags.map(t => `<span class="ai-tag">${t}</span>`).join('')}</div>`
    : '';

  aiResponseBody.innerHTML = `
    <div class="ai-message">${escapeHtml(text)}</div>
    ${tagsHTML}
  `;
}

// ── 7. 저장 기능 ───────────────────────────────────────
btnSave.addEventListener('click', () => {
  const text = diaryInput.value.trim();
  if (!text) return;

  // localStorage에 날짜 키로 저장
  const key = `diary_${new Date().toLocaleDateString('ko-KR')}`;
  const entry = {
    date: new Date().toISOString(),
    emotion: selectedEmotion || '미선택',
    content: text,
  };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (_) { /* 용량 초과 등 무시 */ }

  showToast();
});

function showToast() {
  saveToast.classList.add('show');
  setTimeout(() => saveToast.classList.remove('show'), 2500);
}

// ── 8. 유틸 ───────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// AI 태그 클릭 → 일기 끝에 태그 추가
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('ai-tag')) {
    const tag = e.target.textContent;
    diaryInput.value += (diaryInput.value ? '\n' : '') + tag;
    charCounter.textContent = `${diaryInput.value.length} / 1000`;
    diaryInput.focus();
  }
});
