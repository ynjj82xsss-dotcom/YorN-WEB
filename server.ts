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

function getIntegrationField(integration: any, key: string): string {
  if (!integration || !integration.fields || !Array.isArray(integration.fields)) return '';
  const f = integration.fields.find((fld: any) => fld.key === key);
  return f ? f.value || '' : '';
}

async function resolveIntegrations(integrations: any[] | undefined, userMessage: string): Promise<string> {
  const activeIntegrations = integrations || [];
  let contextBlocks: string[] = [];

  // Parse command patterns (e.g. /supabase products, /github facebook/react, /vercel my-app, /firebase users)
  const supabaseMatch = userMessage.trim().match(/\/supabase(?:\s+([^\s\n]+))?/i);
  const githubMatch = userMessage.trim().match(/\/github(?:\s+([^\s\n]+))?/i);
  const vercelMatch = userMessage.trim().match(/\/vercel(?:\s+([^\s\n]+))?/i);
  const firebaseMatch = userMessage.trim().match(/\/firebase(?:\s+([^\s\n]+))?/i);

  // 1. Supabase Database REST
  const supabaseInt = activeIntegrations.find(i => i.id === 'supabase');
  if (supabaseInt?.isEnabled || supabaseMatch) {
    const table = (supabaseMatch && supabaseMatch[1]) ? supabaseMatch[1].trim() : (supabaseInt?.value || 'users');
    let url = getIntegrationField(supabaseInt, 'SUPABASE_URL').trim();
    const anonKey = getIntegrationField(supabaseInt, 'SUPABASE_ANON_KEY').trim();

    if (!url || !anonKey) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Supabase]: Ошибка — Не заполнены параметры подключения (Supabase Project URL или Anon Key) в конфигурации.`);
    } else {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      // Remove trailing slashes
      url = url.replace(/\/+$/, '');

      try {
        const targetUrl = `${url}/rest/v1/${table}?limit=5`;
        const sRes = await fetch(targetUrl, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (sRes.ok) {
          const rows = await sRes.json();
          contextBlocks.push(`[ИНТЕГРАЦИЯ Supabase (Таблица: ${table})]: Успешный запрос!\nДанные строк (первые 5):\n${JSON.stringify(rows, null, 2)}`);
        } else {
          const errMsg = await sRes.text().catch(() => '');
          contextBlocks.push(`[ИНТЕГРАЦИЯ Supabase (Таблица: ${table})]: Ошибка запроса к БД. Код ${sRes.status}: ${errMsg || 'Неизвестная ошибка'}`);
        }
      } catch (e: any) {
        contextBlocks.push(`[ИНТЕГРАЦИЯ Supabase (Таблица: ${table})]: Сбой при отправке запроса: ${e.message}`);
      }
    }
  }

  // 2. GitHub Developer API
  const githubInt = activeIntegrations.find(i => i.id === 'github');
  if (githubInt?.isEnabled || githubMatch) {
    const repo = (githubMatch && githubMatch[1]) ? githubMatch[1].trim() : (githubInt?.value || 'facebook/react');
    const token = getIntegrationField(githubInt, 'GITHUB_TOKEN').trim();
    
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'YorN-AI'
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      // Fetch repository basic info
      const rRes = await fetch(`https://api.github.com/repos/${repo}`, { headers });
      if (rRes.ok) {
        const rData: any = await rRes.json();
        // Fetch commits
        const cRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=3`, { headers });
        let commitsContext = '';
        if (cRes.ok) {
          const cData: any = await cRes.json();
          commitsContext = cData.map((cmt: any) => `- Commited by ${cmt.commit?.author?.name || 'unknown'}: "${cmt.commit?.message || ''}" (${cmt.sha?.substring(0, 7)})`).join('\n');
        }

        contextBlocks.push(`[ИНТЕГРАЦИЯ GitHub (${repo})]:\n- Название: ${rData.full_name}\n- Описание: "${rData.description || 'нет'}"\n- Звезд: ⭐ ${rData.stargazers_count} | Форков: 🍴 ${rData.forks_count} | Открытых Issue: 🐛 ${rData.open_issues_count}\n- Последние коммиты:\n${commitsContext || 'Нет коммитов'}`);
      } else {
        contextBlocks.push(`[ИНТЕГРАЦИЯ GitHub (${repo})]: Публичный репозиторий не найден или превышен лимит таймаута GitHub API (Код ${rRes.status}).`);
      }
    } catch (e: any) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ GitHub (${repo})]: Ошибка подключения к GitHub API: ${e.message}`);
    }
  }

  // 3. Vercel Deployment Tracker
  const vercelInt = activeIntegrations.find(i => i.id === 'vercel');
  if (vercelInt?.isEnabled || vercelMatch) {
    const projectFilter = (vercelMatch && vercelMatch[1]) ? vercelMatch[1].trim() : (vercelInt?.value || '');
    const token = getIntegrationField(vercelInt, 'VERCEL_TOKEN').trim();

    if (!token) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Vercel]: Ошибка — Vercel API Token не заполнен в настройках для выполнения деплой-запросов.`);
    } else {
      try {
        let deploymentsUrl = 'https://api.vercel.com/v6/deployments?limit=4';
        if (projectFilter) {
          deploymentsUrl += `&projectId=${encodeURIComponent(projectFilter)}`;
        }
        const vRes = await fetch(deploymentsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (vRes.ok) {
          const vData: any = await vRes.json();
          const list = vData.deployments || [];
          const serialized = list.map((d: any) => `- URL: https://${d.url} | Проект: ${d.name} | Статус: ${d.state} | Редакция: ${d.creator?.username || 'unknown'}`).join('\n');
          contextBlocks.push(`[ИНТЕГРАЦИЯ Vercel]: Последние деплои:\n${serialized || 'Нет активных деплоев.'}`);
        } else {
          const errText = await vRes.text().catch(() => '');
          contextBlocks.push(`[ИНТЕГРАЦИЯ Vercel]: Ошибка получения деплоев. Код ${vRes.status}. Ответ: ${errText}`);
        }
      } catch (e: any) {
        contextBlocks.push(`[ИНТЕГРАЦИЯ Vercel]: Сетевой сбой Vercel API: ${e.message}`);
      }
    }
  }

  // 4. Firebase Firestore REST API
  const firebaseInt = activeIntegrations.find(i => i.id === 'firebase');
  if (firebaseInt?.isEnabled || firebaseMatch) {
    const collection = (firebaseMatch && firebaseMatch[1]) ? firebaseMatch[1].trim() : (firebaseInt?.value || 'users');
    const projectId = getIntegrationField(firebaseInt, 'FIREBASE_PROJECT_ID').trim();

    if (!projectId) {
      contextBlocks.push(`[ИНТЕГРАЦИЯ Firebase]: Ошибка — Не указан Firebase Project ID в настройках интеграции.`);
    } else {
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=5`;
        const fRes = await fetch(firestoreUrl);
        if (fRes.ok) {
          const fData: any = await fRes.json();
          const docs = fData.documents || [];
          const items = docs.map((d: any) => {
            const nameSegments = d.name ? d.name.split('/') : [];
            const docId = nameSegments[nameSegments.length - 1] || 'doc';
            return `- ID: ${docId} | Поля: ${JSON.stringify(d.fields || {})}`;
          }).join('\n');

          contextBlocks.push(`[ИНТЕГРАЦИЯ Firestore (Коллекция: ${collection})]: Успешно прочитано!\nНайденные документы (первые 5):\n${items || 'Нет документов в коллекции.'}`);
        } else {
          contextBlocks.push(`[ИНТЕГРАЦИЯ Firestore (Коллекция: ${collection})]: Ошибка возврата REST Firestore. Код ${fRes.status}`);
        }
      } catch (e: any) {
        contextBlocks.push(`[ИНТЕГРАЦИЯ Firestore]: Ошибка связи с серверами Google API: ${e.message}`);
      }
    }
  }

  // 5. Dynamic ToolsConnector Custom Connectors Execution
  for (const item of activeIntegrations) {
    if (['supabase', 'github', 'vercel', 'firebase'].includes(item.id)) {
      continue; // Handled by specialized high-level connector wrappers above
    }

    const commandRegex = new RegExp('\\/' + item.id + '(?:\\s+([\\s\\S]+))?', 'i');
    const match = userMessage.trim().match(commandRegex);

    if (item.isEnabled || match) {
      const parameter = (match && match[1]) ? match[1].trim() : (item.value || '');
      
      // Look for target URL/Webhook endpoint configuration
      let url = '';
      if (item.value && (item.value.startsWith('http://') || item.value.startsWith('https://'))) {
        url = item.value;
      } else {
        // Fallback to checking configured fields for URL / endpoint strings
        const urlField = item.fields?.find((f: any) => 
          f.key.toUpperCase().includes('URL') || 
          f.key.toUpperCase().includes('ENDPOINT') || 
          f.key.toUpperCase().includes('WEBHOOK')
        );
        if (urlField && urlField.value && (urlField.value.startsWith('http://') || urlField.value.startsWith('https://'))) {
          url = urlField.value;
        }
      }

      if (!url) {
        // No HTTP URL target. Treat as a safe metadata configuration store used in active context
        const fieldsContext = (item.fields || []).map((f: any) => 
          `- ${f.label || f.key}: ${f.type === 'password' ? '••••••••' : f.value || 'пусто'}`
        ).join('\n');
        contextBlocks.push(`[ИНТЕГРАЦИЯ ${item.name} (/${item.id})]: Коннектор активирован.\nПараметр: "${parameter || 'не указан'}"\nКонфигурация параметров в системе:\n${fieldsContext || 'Нет локальной конфигурации полей.'}`);
      } else {
        // We have a fully valid URL! Proceed to perform a real API/Webhook execution call 
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'YorN-ToolsConnector/1.0'
          };

          // Auto-inject fields as headers or query payloads
          (item.fields || []).forEach((f: any) => {
            if (f.value) {
              const k = f.key.trim();
              if (k.toUpperCase().startsWith('HEADER_')) {
                // Support custom user-defined headers e.g. HEADER_X_API_SECRET -> X-API-Secret
                const headerName = k.substring(7).replace(/_/g, '-');
                headers[headerName] = f.value;
              } else if (
                k.toUpperCase() === 'AUTHORIZATION' || 
                k.toUpperCase() === 'AUTH_TOKEN' || 
                k.toUpperCase() === 'TOKEN' || 
                k.toUpperCase() === 'API_KEY' ||
                k.toUpperCase() === 'SECRET_KEY'
              ) {
                if (k.toUpperCase() === 'AUTHORIZATION') {
                  headers['Authorization'] = f.value.startsWith('Bearer ') || f.value.startsWith('Basic ') ? f.value : `Bearer ${f.value}`;
                } else {
                  headers['X-API-Key'] = f.value;
                  headers['Authorization'] = `Bearer ${f.value}`;
                }
              }
            }
          });

          const hasBody = !!parameter;
          const method = hasBody ? 'POST' : 'GET';
          const fetchOptions: any = {
            method,
            headers,
          };

          if (hasBody) {
            // General JSON body for automation webhooks (Activepieces, Make, Zapier, n8n, Slack custom incoming, custom backend APIs)
            fetchOptions.body = JSON.stringify({
              text: parameter,
              message: parameter,
              query: parameter,
              payload: parameter,
              connectorId: item.id,
              connectorName: item.name,
              timestamp: new Date().toISOString()
            });
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          fetchOptions.signal = controller.signal;

          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);

          if (response.ok) {
            let dataText = '';
            try {
              const resData = await response.json();
              dataText = JSON.stringify(resData, null, 2);
            } catch {
              dataText = await response.text();
            }
            contextBlocks.push(`[ИНТЕГРАЦИЯ ${item.name} (/${item.id}) -> Успешный реальный вызов ${url} (${response.status})]:\n${dataText.substring(0, 1500)}`);
          } else {
            const errText = await response.text().catch(() => '');
            contextBlocks.push(`[ИНТЕГРАЦИЯ ${item.name} (/${item.id}) -> API отвклонил вызов к ${url} (${response.status})]: ${errText.substring(0, 500)}`);
          }
        } catch (e: any) {
          contextBlocks.push(`[ИНТЕГРАЦИЯ ${item.name} (/${item.id}) -> Сбой сетевого соединения с ${url}]: ${e.message}`);
        }
      }
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
