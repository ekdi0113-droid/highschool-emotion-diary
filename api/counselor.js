
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text, emotion } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY; // 서버 환경변수에서 가져옴
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const prompt = `
당신은 고등학생 전문 상담사입니다. 다음은 학생이 쓴 일기 내용과 그 당시의 감정입니다.

[학생의 감정 선택]: ${emotion || '미선택'}
[일기 내용]: ${text}

위 내용을 읽고 다음 규칙에 따라 답변해 주세요:
1. 첫 줄에는 학생의 일기를 요약하는 감정 단어 하나를 해시태그 형식으로 적어주세요 (예: #뿌듯함, #속상함).
2. 그 다음 줄부터는 학생의 이야기에 깊이 공감하며 따뜻한 위로와 격려를 담은 메시지를 '2~3문장'으로 작성해 주세요.
3. 말투는 친절하고 다정한 '해요체'를 사용해 주세요.
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'AI 연결 중 오류가 발생했습니다.' });
  }
}
