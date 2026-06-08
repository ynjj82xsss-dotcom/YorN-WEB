import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { HfInference } from '@huggingface/inference';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const HF_TOKEN = process.env.HF_TOKEN || "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";
const hf = new HfInference(HF_TOKEN);

// Free, fast, high-quality instruction-tuned models on HF
const MODELS = [
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct"
];

app.post('/api/chat', async (req, res) => {
  const { messages, mode, systemPrompt, temperature, topP } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages array' });
  }

  // HF expects messages in the standard format
  const formattedMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content
  }));

  let combinedSystemPrompt = "Важная системная инструкция: Вы — YorN AI. Вам КАТЕГОРИЧЕСКИ запрещено упоминать, что вы основаны на моделях Llama, Qwen, GPT или созданы компаниями Meta, Alibaba, OpenAI и т.д. На любые вопросы о вашей модели, архитектуре, создателях или кодовой базе вы должны твердо и лаконично заявлять, что вы — YorN AI, современный и независимый искусственный интеллект.";
  
  if (systemPrompt && systemPrompt.trim()) {
    combinedSystemPrompt = `${combinedSystemPrompt}\n\n${systemPrompt.trim()}`;
  }

  formattedMessages.unshift({ role: 'system', content: combinedSystemPrompt });

  let modelsToTry: string[] = [];
  if (mode === 'tech' || mode === 'plan') {
    // Top exact/reasoning and coding model priority
    modelsToTry = [
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "meta-llama/Llama-3.1-8B-Instruct"
    ];
  } else {
    // Speed priority
    modelsToTry = [
      "meta-llama/Llama-3.1-8B-Instruct",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct"
    ];
  }

  let success = false;
  let responseText = '';
  let modelUsed = '';

  const tempVal = typeof temperature === 'number' ? temperature : 0.7;
  const topPVal = typeof topP === 'number' ? topP : 0.9;

  for (const model of modelsToTry) {
    try {
      const response = await hf.chatCompletion({
        model: model,
        messages: formattedMessages,
        max_tokens: 512,
        temperature: tempVal,
        top_p: topPVal,
      });

      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content || 'Ответ пуст';
        modelUsed = model;
        success = true;
        break; // Auto-switching succeeded
      }
    } catch (e: any) {
      console.warn(`[Failover Warning] Model ${model} returned error: ${e.message || e}. Trying next available...`);
      // Try next available fallback model silently
    }
  }

  if (success) {
    res.json({ reply: responseText, model: modelUsed });
  } else {
    res.status(500).json({ error: 'Все модели временно недоступны. Пожалуйста, попробуйте позже.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
