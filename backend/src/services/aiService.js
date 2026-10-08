/**
 * Reusable AI Chat Summary & "What Did I Miss?" Service
 * Uses native fetch to invoke Google Gemini, OpenAI, or Groq based on configured environment variables.
 * Gracefully degrades if no API key is available or if remote API fails.
 */

const generateChatSummary = async (messages = [], { isGroup = false, mode = 'summary' } = {}) => {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey && !openAiKey && !groqKey) {
    return {
      available: false,
      summary: null,
      message: 'AI summary feature is currently unavailable (API key not configured in backend).'
    };
  }

  if (!messages || messages.length === 0) {
    return {
      available: true,
      summary: 'No recent messages to summarize.',
      message: 'No messages provided.'
    };
  }

  // Format messages into clean transcript text
  const formattedTranscript = messages
    .map((msg) => {
      const senderName = msg.sender?.name || msg.sender?.username || 'User';
      const text = msg.content || (msg.messageType !== 'text' ? `[${msg.messageType}]` : '');
      return `${senderName}: ${text}`;
    })
    .filter((line) => line.trim().length > 0)
    .join('\n');

  if (!formattedTranscript) {
    return {
      available: true,
      summary: 'No textual message content found to summarize.',
      message: 'No transcript text.'
    };
  }

  const systemInstruction = mode === 'missed'
    ? `You are Raabta Chat Assistant. A user was away from a group chat and clicked "What did I miss?". Analyze the provided chat messages and present a quick, clean summary with these clear sections:\n- 📌 **Important Discussions**\n- ✅ **Decisions Made**\n- 📋 **Tasks & Action Items**\n- 📅 **Events & Deadlines**`
    : `You are Raabta Chat Assistant. Summarize the provided chat conversation concisely in structured markdown with these sections:\n- 📝 **Summary**\n- 🎯 **Key Points & Decisions**\n- 📋 **Tasks / Action Items**\n- 📅 **Events & Dates**`;

  const promptText = `${systemInstruction}\n\nChat Transcript:\n${formattedTranscript}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let summaryText = '';

    if (geminiKey) {
      // Use Google Gemini API (v1beta REST)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API HTTP error ${response.status}`);
      }

      const data = await response.json();
      summaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (openAiKey) {
      // Use OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: formattedTranscript }
          ],
          temperature: 0.3
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API HTTP error ${response.status}`);
      }

      const data = await response.json();
      summaryText = data?.choices?.[0]?.message?.content;
    } else if (groqKey) {
      // Use Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: formattedTranscript }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Groq API HTTP error ${response.status}`);
      }

      const data = await response.json();
      summaryText = data?.choices?.[0]?.message?.content;
    }

    if (!summaryText) {
      return {
        available: false,
        summary: null,
        message: 'Could not generate AI summary from response.'
      };
    }

    return {
      available: true,
      summary: summaryText.trim(),
      message: 'Success'
    };
  } catch (error) {
    console.error('[AI Service Error]:', error.message);
    return {
      available: false,
      summary: null,
      message: 'AI summary request failed. Please try again later.'
    };
  }
};

module.exports = {
  generateChatSummary
};
