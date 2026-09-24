export default async function handler(req, res) {
  // Chỉ nhận phương thức POST từ client
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    
    // Ưu tiên lấy API key từ header hoặc client gửi lên, nếu không lấy từ biến môi trường
    const apiKey = req.headers['x-api-key'] || body.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        message: 'Thiếu Gemini API Key. Vui lòng nhập API Key trên giao diện hoặc cấu hình biến môi trường GEMINI_API_KEY trên Vercel.'
      });
    }

    // Tạo prompt dựa trên dữ liệu giao diện gửi lên
    const systemInstruction = `Bạn là trợ lý AI chuyên tạo đề kiểm tra chuẩn cấu trúc GDPT 2018 cho giáo viên Việt Nam.
Hãy xuất kết quả ĐÚNG ĐỊNH DẠNG JSON với cấu trúc:
{
  "examName": "Đề kiểm tra",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "content": "Nội dung câu hỏi kèm công thức Toán bằng LaTeX đặt trong cặp dấu $",
      "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết"
    }
  ]
}`;

    const promptText = `Hãy tạo đề kiểm tra dựa trên thông tin sau:
${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}`;

    // Gọi trực tiếp đến mô hình Gemini 2.5 Flash
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
      return res.status(500).json({ message: 'AI không trả về nội dung.' });
    }

    // Trả về JSON hợp lệ cho frontend
    const parsedData = JSON.parse(replyText);
    return res.status(200).json(parsedData);

  } catch (error) {
    return res.status(500).json({
      message: 'Lỗi xử lý máy chủ: ' + error.message
    });
  }
}
