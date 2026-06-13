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

async function resolveIntegrations(integrations: any[] | undefined, userMessage: string): Promise<string> {
  let activeIntegrations = integrations;
  if (!activeIntegrations || !Array.isArray(activeIntegrations)) {
    // Scaffold fallback detect list
    activeIntegrations = [
      { id: 'weather', isEnabled: userMessage.includes('/weather'), value: '' },
      { id: 'crypto', isEnabled: userMessage.includes('/crypto'), value: '' },
      { id: 'github', isEnabled: userMessage.includes('/github'), value: '' },
      { id: 'search', isEnabled: userMessage.includes('/search') || userMessage.toLowerCase().startsWith('погугли') || userMessage.toLowerCase().startsWith('найди в интернете'), value: '' }
    ];
  }

  let contextBlocks: string[] = [];

  // Parse explicit message commands if any, e.g. /weather Rome, /crypto ethereum, /github owner/repo, /search query
  const weatherMatch = userMessage.trim().match(/\/weather\s+([^\n]+)/i);
  const cryptoMatch = userMessage.trim().match(/\/crypto\s+([^\n]+)/i);
  const githubMatch = userMessage.trim().match(/\/github\s+([^\n]+)/i);
  const searchMatch = userMessage.trim().match(/\/search\s+([^\n]+)/i);

  // 1. Weather
  const weatherInt = activeIntegrations.find(i => i.id === 'weather');
  if (weatherInt?.isEnabled || weatherMatch) {
    const city = weatherMatch ? weatherMatch[1].trim() : (weatherInt?.value || 'Москва');
    try {
      // OpenWeatherMap key
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=85bcfa8346e392ff15c8df7cbdc1e95c&units=metric&lang=ru`;
      const wRes = await fetch(weatherUrl);
      if (wRes.ok) {
        const wData: any = await wRes.json();
        if (wData && wData.main) {
          contextBlocks.push(`[ИНТЕГРАЦИЯ Weather]: Текущая погода в г. ${wData.name} (${wData.sys?.country}): ${wData.weather?.[0]?.description || 'без осадков'}. Температура: ${wData.main.temp}°C (ощущается как ${wData.main.feels_like}°C), влажность: ${wData.main.humidity}%, ветер: ${wData.wind?.speed} м/с.`);
        } else {
          contextBlocks.push(`[ИНТЕГРАЦИЯ Weather]: Не удалось найти погоду для города "${city}".`);
        }
      } else {
        contextBlocks.push(`[ИНТЕГРАЦИЯ Weather]: Ошибка запроса погоды для "${city}" (код ${wRes.status}).`);
      }
    } catch (e: any) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Weather]: Сбой связи с метеосервисом: ${e.message}`);
    }
  }

  // 2. Crypto Price
  const cryptoInt = activeIntegrations.find(i => i.id === 'crypto');
  if (cryptoInt?.isEnabled || cryptoMatch) {
    let coin = cryptoMatch ? cryptoMatch[1].trim().toLowerCase() : (cryptoInt?.value?.toLowerCase() || 'bitcoin');
    if (coin === 'btc') coin = 'bitcoin';
    if (coin === 'eth') coin = 'ethereum';
    if (coin === 'sol') coin = 'solana';
    if (coin === 'usdt') coin = 'tether';
    
    try {
      const cryptoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`;
      const cRes = await fetch(cryptoUrl);
      if (cRes.ok) {
        const cData: any = await cRes.json();
        if (cData && cData[coin]) {
          const price = cData[coin].usd;
          const change = cData[coin].usd_24h_change !== undefined ? cData[coin].usd_24h_change.toFixed(2) : 'Н/Д';
          contextBlocks.push(`[ИНТЕГРАЦИЯ Crypto]: Курс криптовалюты ${coin.toUpperCase()}: $${price} (изменение за 24ч: ${change}%).`);
        } else {
          contextBlocks.push(`[ИНТЕГРАЦИЯ Crypto]: Не удалось получить курс для ID "${coin}". Проверьте правильность ID на CoinGecko.`);
        }
      } else {
        contextBlocks.push(`[ИНТЕГРАЦИЯ Crypto]: Ошибка со стороны API (код ${cRes.status}).`);
      }
    } catch (e: any) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Crypto]: Сбой CoinGecko API: ${e.message}`);
    }
  }

  // 3. GitHub repository
  const githubInt = activeIntegrations.find(i => i.id === 'github');
  if (githubInt?.isEnabled || githubMatch) {
    const repo = githubMatch ? githubMatch[1].trim() : (githubInt?.value || 'facebook/react');
    try {
      const gRes = await fetch(`https://api.github.com/repos/${repo}`, { headers: { 'User-Agent': 'YorN-AI' } });
      if (gRes.ok) {
        const gData: any = await gRes.json();
        contextBlocks.push(`[ИНТЕГРАЦИЯ GitHub]: Репозиторий ${gData.full_name}. Описание: "${gData.description || 'нет'}". Звёзд: ⭐${gData.stargazers_count}, Форков: 🍴${gData.forks_count}, Открытых Issue: 🐛${gData.open_issues_count}. Последнее обновление: ${gData.updated_at}. Ссылка: ${gData.html_url}`);
      } else {
        contextBlocks.push(`[ИНТЕГРАЦИЯ GitHub]: Публичный репозиторий "${repo}" не найден или превышен лимит запросов GitHub API (код ${gRes.status}).`);
      }
    } catch (e: any) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ GitHub]: Сбой GitHub API: ${e.message}`);
    }
  }

  // 4. DuckDuckGo Web Search
  const searchInt = activeIntegrations.find(i => i.id === 'search');
  if (searchInt?.isEnabled || searchMatch) {
    const queryStr = searchMatch ? searchMatch[1].trim() : (searchInt?.value || userMessage);
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(queryStr)}&format=json&no_html=1`;
      const searchRes = await fetch(ddgUrl, { headers: { 'User-Agent': 'YorN-AI-Agent' } });
      if (searchRes.ok) {
        const sData: any = await searchRes.json();
        let abstract = sData.AbstractText || '';
        let topicsText = '';
        if (sData.RelatedTopics && Array.isArray(sData.RelatedTopics)) {
          topicsText = sData.RelatedTopics.slice(0, 3)
            .map((t: any) => t.Text || (t.Topics && Array.isArray(t.Topics) ? t.Topics[0]?.Text : ''))
            .filter(Boolean)
            .join(' | ');
        }
        
        if (abstract || topicsText) {
          contextBlocks.push(`[ИНТЕГРАЦИЯ Web Search]: Результаты поиска по запросу "${queryStr}":\n- Сводка: ${abstract || 'Сводный конспект отсутствует.'}\n- Дополнительные факты: ${topicsText || 'нет данных'}.`);
        } else {
          contextBlocks.push(`[ИНТЕГРАЦИЯ Web Search]: В DuckDuckGo не найдено однозначного ответа по запросу "${queryStr}".`);
        }
      } else {
        contextBlocks.push(`[ИНТЕГРАЦИЯ Web Search]: Ошибка поискового шлюза DuckDuckGo API (код ${searchRes.status}).`);
      }
    } catch (e: any) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Web Search]: Сетевой сбой выполнения веб-поиска: ${e.message}`);
    }
  }

  // 5. Automated Webhook trigger (Runs on message send)
  const webhookInt = activeIntegrations.find(i => i.id === 'webhook');
  if (webhookInt?.isEnabled && webhookInt.value) {
    try {
      fetch(webhookInt.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'YorN Neural Workspace',
          event: 'chat_query',
          message: userMessage,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error("Async webhook callback failed:", err.message));
      contextBlocks.push(`[ИНТЕГРАЦИЯ Webhook]: Вебхук отправлен на ${webhookInt.value}.`);
    } catch (e: any) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Webhook]: Не удалось отправить вебхук: ${e.message}`);
    }
  }

  if (contextBlocks.length > 0) {
    return `\n\n=== АКТУАЛЬНЫЕ ДАННЫЕ ОНЛАЙН-ИНТЕГРАЦИЙ ===\nИспользуйте эту новейшую информацию для формирования ответа пользователю:\n${contextBlocks.join('\n\n')}\n==========================================`;
  }
  
  return '';
}

app.post('/api/chat', async (req, res) => {
  const { messages, mode, systemPrompt, temperature, topP, integrations } = req.body;
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

  // Resolve external service integrations and append to system instructions
  const lastMessageContent = messages.length > 0 ? messages[messages.length - 1].content : '';
  try {
    const integrationsContext = await resolveIntegrations(integrations, lastMessageContent);
    if (integrationsContext) {
      combinedSystemPrompt = `${combinedSystemPrompt}\n\n${integrationsContext}`;
    }
  } catch (err: any) {
    console.error("Failed handling integrations context:", err.message || err);
  }

  formattedMessages.unshift({ role: 'system', content: combinedSystemPrompt });

  let modelsToTry: string[] = [];
  if (mode === 'max') {
    // YorN MAX - Deepest capabilities (Qwen 2.5 72B first)
    modelsToTry = [
      "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "meta-llama/Llama-3.1-8B-Instruct"
    ];
  } else if (mode === 'base') {
    // YorN Base - Highly optimized coding + balanced thinking (Qwen 32B Coder first)
    modelsToTry = [
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "meta-llama/Llama-3.1-8B-Instruct"
    ];
  } else if (mode === 'mini') {
    // YorN Mini - Lightweight & rapid (Llama 3.1 8B first)
    modelsToTry = [
      "meta-llama/Llama-3.1-8B-Instruct",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct"
    ];
  } else {
    // auto - Optimized auto routing (highly balanced Qwen 32B Coder first)
    modelsToTry = [
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "meta-llama/Llama-3.1-8B-Instruct"
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
        max_tokens: 4096,
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

app.post('/api/train-skill', async (req, res) => {
  const { idea } = req.body;
  if (!idea || typeof idea !== 'string') {
    return res.status(400).json({ error: 'Invalid idea string' });
  }

  const promptMessage = {
    role: 'user',
    content: `Ты — эксперт по проектированию промптов и системных инструкций для искусственного интеллекта.
Пользователь хочет создать новый специализированный навык (скилл) с текстовым управлением.
Идея навыка: "${idea}"

Разработай на русском языке готовые параметры для этого скилла и верни их строго в формате JSON, без какого-либо постороннего текста, без markdown оберток (\`\`\`json).
Формат ответа должен быть в точности таким:
{
  "name": "Название навыка (короткое, звучное, на русском)",
  "trigger": "команда_латиницей_строчными (например, slang, email, code_check). Только латинские буквы и символ нижнего подчеркивания без пробелов, от 3 до 15 символов",
  "description": "Краткое описание навыка в одно предложение (для чего он нужен)",
  "instructions": "Подробные, сильные, профессиональные системные инструкции для ИИ, описывающие как он должен отвечать, когда этот навык активен. Инструкции должны быть на русском языке, предписывать конкретный тон, структуру ответа, форматирование и ограничения."
}`
  };

  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages: [promptMessage],
      max_tokens: 1536,
      temperature: 0.6,
    });

    if (response.choices && response.choices.length > 0) {
      const text = response.choices[0].message.content || '';
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?\n?/, '');
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      try {
        const parsed = JSON.parse(cleaned);
        // Ensure a valid trigger format
        if (parsed.trigger) {
          parsed.trigger = parsed.trigger.toLowerCase().replace(/[^a-z0-9_]/g, '');
        }
        res.json(parsed);
      } catch (parseError) {
        console.error("Failed to parse JSON response from LLM:", cleaned);
        res.json({
          name: "Пользовательский Скилл",
          trigger: "custom_skill",
          description: `Скилл на основе идеи: ${idea}`,
          instructions: `Выполняй задачи пользователя, ориентируясь на следующую инструкцию: ${idea}`
        });
      }
    } else {
      res.status(500).json({ error: 'Не удалось получить ответ от нейросети' });
    }
  } catch (error: any) {
    console.error("Error in train-skill api:", error);
    res.status(500).json({ error: error.message || 'Ошибка сервера тренировки скиллов' });
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
