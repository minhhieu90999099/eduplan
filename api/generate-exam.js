export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    
    // Lấy API key từ header hoặc body hoặc biến môi trường
    const apiKey = 
      req.headers['x-gemini-api-key'] || 
      req.headers['x-api-key'] || 
      body.apiKey || 
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        message: 'Thiếu API Key. Vui lòng nhập API Key trên web hoặc thêm GEMINI_API_KEY trên Vercel.'
      });
    }

    const systemInstruction = `Bạn là trợ lý AI tạo đề thi chuyên nghiệp theo chuẩn ma trận đề GDPT 2018 của Bộ Giáo dục Việt Nam.
BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không bọc trong \`\`\`json) theo đúng cấu trúc sau:

{
  "examName": "Đề kiểm tra",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "content": "Nội dung câu hỏi trắc nghiệm kèm công thức Toán bằng LaTeX đặt trong $...$",
      "options": [
        "Nội dung phương án A (không ghi A.)",
        "Nội dung phương án B (không ghi B.)",
        "Nội dung phương án C (không ghi C.)",
        "Nội dung phương án D (không ghi D.)"
      ],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết"
    },
    {
      "id": 2,
      "type": "true_false",
      "content": "Thông tin đề bài phần Đúng/Sai kèm công thức $...$",
      "tfStatements": [
        { "statement": "Nội dung ý a)", "isCorrect": true },
        { "statement": "Nội dung ý b)", "isCorrect": false },
        { "statement": "Nội dung ý c)", "isCorrect": true },
        { "statement": "Nội dung ý d)", "isCorrect": false }
      ],
      "explanation": "Lời giải chi tiết từng ý a, b, c, d"
    },
    {
      "id": 3,
      "type": "short_answer",
      "content": "Câu hỏi trả lời ngắn...",
      "correctAnswer": "12.5",
      "explanation": "Lời giải chi tiết"
    }
  ]
}`;

    const promptText = `Hãy tạo đề kiểm tra dựa trên yêu cầu sau:\n${
      typeof body === 'string' ? body : JSON.stringify(body, null, 2)
    }`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.error?.message || 'Lỗi khi gọi API Gemini.'
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      return res.status(500).json({ message: 'AI không trả về dữ liệu đề thi.' });
    }

    // Làm sạch và chuyển đổi thành JSON
    const cleanJson = replyText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanJson);
    return res.status(200).json(parsedData);

  } catch (error) {
    return res.status(500).json({
      message: 'Lỗi xử lý: ' + error.message
    });
  }
}
