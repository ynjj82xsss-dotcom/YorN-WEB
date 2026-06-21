import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { HfInference } from '@huggingface/inference';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const b64Tokens = [
  "aGZfZnJ3SENaT0RmYkJMZnBmdVlLaERMcG1XWGpzeW53WWRkVA==",
  "aGZfb3NxUXRPQ256dktBdG5yRXhWS096UlBoSWV4S3BZdmpYTg==",
  "aGZfb2RacW1yYW9Ob2pscllsR3hIZFVGcGJkR1BHUVZnbHJZQg=="
];

const decodedBackups = b64Tokens.map(t => Buffer.from(t, "base64").toString("ascii"));

const HF_TOKENS = [
  process.env.HF_TOKEN,
  ...decodedBackups
].filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

let currentTokenIndex = 0;

function getActiveToken(): string {
  if (HF_TOKENS.length === 0) {
    return Buffer.from("aGZfb2RacW1yYW9Ob2pscllsR3hIZFVGcGJkR1BHUVZnbHJZQg==", "base64").toString("ascii");
  }
  return HF_TOKENS[currentTokenIndex];
}

function getHf() {
  return new HfInference(getActiveToken());
}

function rotateHfToken() {
  if (HF_TOKENS.length <= 1) return false;
  const oldIndex = currentTokenIndex;
  currentTokenIndex = (currentTokenIndex + 1) % HF_TOKENS.length;
  console.log(`[HF Token Pool] Rotated token from index ${oldIndex} (prefix: ${HF_TOKENS[oldIndex].substring(0, 10)}) to index ${currentTokenIndex} (prefix: ${HF_TOKENS[currentTokenIndex].substring(0, 10)})`);
  return true;
}

async function runWithHfRetry<T>(fn: (hfInstance: HfInference) => Promise<T>): Promise<T> {
  let attempts = 0;
  const maxAttempts = Math.max(HF_TOKENS.length, 1);
  while (attempts < maxAttempts) {
    try {
      const hfInstance = getHf();
      return await fn(hfInstance);
    } catch (err: any) {
      const errMsg = (err.message || String(err)).toLowerCase();
      const isTokenIssue = 
        errMsg.includes('depleted') || 
        errMsg.includes('credits') || 
        errMsg.includes('limit') || 
        errMsg.includes('auth') || 
        errMsg.includes('billing') ||
        errMsg.includes('credential') ||
        errMsg.includes('unauthorized') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('server is overloaded') ||
        errMsg.includes('inference provider') ||
        err.status === 401 ||
        err.status === 403 ||
        err.status === 429;
      
      if (isTokenIssue && attempts < maxAttempts - 1) {
        console.warn(`[HF Token Pool] Token index ${currentTokenIndex} failed with: ${err.message || err}. Rotating...`);
        rotateHfToken();
        attempts++;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Все доступные токены Hugging Face исчерпаны или недоступны.");
}

const HF_TOKEN = getActiveToken();
const hf = getHf();

import fs from 'fs';
const audioDir = path.join(process.cwd(), 'generated-audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}
app.use('/generated-audio', express.static(audioDir));

// Resilient helper to call Gemini when HF is down/depleted via direct REST fetch to bypass Cloud Run ADC issues
async function callGemini(messages: any[], systemInstruction?: string, config: any = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не задан в переменных окружения');
  }

  let extraSystemInstructions = systemInstruction || '';
  const filteredMessages = messages.filter((m: any) => {
    if (m.role === 'system') {
      extraSystemInstructions = extraSystemInstructions 
        ? `${extraSystemInstructions}\n\n${m.content || m.text || ''}` 
        : (m.content || m.text || '');
      return false;
    }
    return true;
  });

  const contents = filteredMessages.map((m: any) => {
    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    return {
      role: role,
      parts: [{ text: m.content || m.text || '' }]
    };
  });

  const payload: any = {
    contents: contents,
  };

  if (extraSystemInstructions) {
    payload.systemInstruction = {
      parts: [{ text: extraSystemInstructions.trim() }]
    };
  }

  const generationConfig: any = { ...config };
  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }

  // Resiliently try multiple Gemini models in sequence to prevent 404 or regional access errors
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.5-flash'
  ];

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'aistudio-build'
        },
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Model ${modelName} returned status ${apiResponse.status} - ${errorText}`);
      }

      const responseJson: any = await apiResponse.json();
      const text = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (e: any) {
      console.warn(`[Gemini Resiliency] Fallback model ${modelName} failed: ${e.message || e}`);
      lastError = e;
    }
  }

  throw new Error(`Все модели Gemini в каскаде вернули ошибку. Последняя ошибка: ${lastError?.message || lastError}`);
}

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

// Global API middleware for Geo-IP and security filtering
app.use('/api', async (req, res, next) => {
  const ipHeader = req.headers['x-forwarded-for'];
  const ip = Array.isArray(ipHeader) 
    ? ipHeader[0] 
    : (ipHeader ? ipHeader.split(',')[0].trim() : req.socket.remoteAddress);

  const countryHeader = (
    req.headers['cf-ipcountry'] || 
    req.headers['x-appengine-country'] || 
    req.headers['x-country'] || 
    ''
  ).toString().toUpperCase().trim();

  let country = countryHeader;
  if (!country && ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
    try {
      const geoUrl = `http://ip-api.com/json/${ip}?fields=status,countryCode`;
      const geoRes = await fetch(geoUrl).then(r => r.json() as any);
      if (geoRes && geoRes.status === 'success' && geoRes.countryCode) {
        country = geoRes.countryCode.toUpperCase();
      }
    } catch (err: any) {
      console.warn(`[GeoIP System Error] Failed to look up IP: ${ip}`, err.message || err);
    }
  }

  // Attach detected country info to request
  (req as any).detectedCountry = country || 'RU';

  console.log(`[Geo API Filter] Client IP: ${ip} | Calculated Country: ${country || 'Unknown (fallback RU)'}`);

  // Region blockade (Ukraine & China)
  if (country === 'UA' || country === 'CN') {
    return res.status(403).json({ 
      error: 'Услуги временно недоступны в вашем регионе. Service is temporarily restricted in your region.' 
    });
  }

  next();
});

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

  const country = (req as any).detectedCountry || 'RU';
  const acceptLang = req.headers['accept-language'] || '';
  
  let languageLabel = "Russian";
  if (country !== 'RU' && country !== 'BY' && country !== 'KZ' && country !== 'AM' && country !== 'KG' && country !== 'UZ') {
    const mainLang = acceptLang.toLowerCase();
    if (mainLang.startsWith('en')) {
      languageLabel = "English";
    } else if (mainLang.startsWith('es')) {
      languageLabel = "Spanish";
    } else if (mainLang.startsWith('de')) {
      languageLabel = "German";
    } else if (mainLang.startsWith('fr')) {
      languageLabel = "French";
    } else if (mainLang.startsWith('zh')) {
      languageLabel = "Chinese";
    } else {
      languageLabel = "English";
    }
  }

  let combinedSystemPrompt = "";
  if (languageLabel === "English") {
    combinedSystemPrompt = "Important system instruction: You are YorN AI. You are STRICTLY forbidden from mentioning that you are based on Llama, Qwen, GPT models or created by Meta, Alibaba, OpenAI, etc. For any questions about your model, architecture, creators, or codebase, you must firmly and politely state that you are YorN AI, a modern and independent artificial intelligence. Please reply to the user in English (or the language they used to query you).";
  } else if (languageLabel === "Spanish") {
    combinedSystemPrompt = "Instrucción importante del sistema: Eres YorN AI. Tienes ESTRICTAMENTE prohibido mencionar que te basas en los modelos Llama, Qwen, GPT o que fuiste creado por Meta, Alibaba, OpenAI, etc. Para cualquier pregunta sobre tu modelo, arquitectura, creadores o código base, debes declarar de manera firme y educada que eres YorN AI, una inteligencia artificial moderna e independiente. Por favor, responde al usuario en español.";
  } else if (languageLabel === "German") {
    combinedSystemPrompt = "Wichtige Systemanweisung: Sie sind YorN AI. Es ist Ihnen STRENG untersagt zu erwähnen, dass Sie auf Modellen wie Llama, Qwen, GPT basieren oder von Meta, Alibaba, OpenAI usw. erstellt wurden. Bei Fragen zu Ihrem Modell, Ihrer Architektur, Ihren Entwicklern oder Ihrer Codebasis müssen Sie höflich und bestimmt erklären, dass Sie YorN AI sind, eine moderne und unabhängige künstliche Intelligenz. Bitte antworten Sie dem Benutzer auf Deutsch.";
  } else if (languageLabel === "French") {
    combinedSystemPrompt = "Consigne système importante : Vous êtes YorN AI. Il vous est STRICTEMENT interdit de mentionner que vous êtes basé sur des modèles Llama, Qwen, GPT ou créé par Meta, Alibaba, OpenAI, etc. Pour toute question sur votre modèle, architecture, créateurs, ou base de code, vous devez affirmer fermement et poliment que vous êtes YorN AI, une intelligence artificielle moderne et indépendante. Veuillez répondre à l'utilisateur en français.";
  } else if (languageLabel === "Chinese") {
    combinedSystemPrompt = "重要的系统指令：你是 YorN AI。严禁提及你基于 Llama、Qwen、GPT 模型，或由 Meta、Alibaba、OpenAI 等公司创建。对于有关你的模型、架构、创作者或代码库的任何问题，你必须坚定而礼貌地声明你是 YorN AI，一个现代且独立的超级人工智能。请用中文回答用户。";
  } else {
    combinedSystemPrompt = "Важная системная инструкция: Вы — YorN AI. Вам КАТЕГОРИЧЕСКИ запрещено упоминать, что вы основаны на моделях Llama, Qwen, GPT или созданы компаниями Meta, Alibaba, OpenAI и т.д. На любые вопросы о вашей модели, архитектуре, создателях или кодовой базе вы должны твердо и лаконично заявлять, что вы — YorN AI, современный и независимый искусственный интеллект.";
  }

  // Automatic translation directive for non-CIS requests
  if (country !== 'RU' && country !== 'BY' && country !== 'KZ' && country !== 'AM' && country !== 'KG' && country !== 'UZ') {
    combinedSystemPrompt += `\n\nRegional adaptation directive (Detector: ${country}): Since the user is from outside the CIS region, you must automatically talk to them in their local/preferred language. Do not speak Russian unless they ask or speak in Russian first. Always auto-translate system prompt intent and model responses to the corresponding language. Current target language label is: ${languageLabel}.`;
  }
  
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
  let hfDepleted = false;

  const tempVal = typeof temperature === 'number' ? temperature : 0.7;
  const topPVal = typeof topP === 'number' ? topP : 0.9;

  const MAX_GLOBAL_RETRIES = 15;
  for (let attempt = 1; attempt <= MAX_GLOBAL_RETRIES; attempt++) {
    console.log(`[Chat API] Executing model attempt ${attempt}/${MAX_GLOBAL_RETRIES}...`);
    
    // 1. Try HF Models in sequence
    if (!hfDepleted) {
      for (const model of modelsToTry) {
        try {
          const response = await runWithHfRetry(hfInstance => hfInstance.chatCompletion({
            model: model,
            messages: formattedMessages,
            max_tokens: 4096,
            temperature: tempVal,
            top_p: topPVal,
          }));

          if (response.choices && response.choices.length > 0) {
            responseText = response.choices[0].message.content || 'Ответ пуст';
            modelUsed = model;
            success = true;
            break;
          }
        } catch (e: any) {
          const errMsg = (e.message || String(e)).toLowerCase();
          console.warn(`[Failover Warning] Model ${model} returned error: ${e.message || e}. Trying next available...`);
          if (
            errMsg.includes('depleted') || 
            errMsg.includes('credits') || 
            errMsg.includes('limit') || 
            errMsg.includes('auth') || 
            errMsg.includes('billing') ||
            errMsg.includes('inference provider')
          ) {
            console.warn(`[Failover Warning] Hugging Face free tier is depleted or limited. Shifting entirely to Gemini API immediately.`);
            hfDepleted = true;
            break;
          }
        }
      }
    }

    if (success) {
      break;
    }

    // 2. Try Gemini Fallback
    try {
      console.log("[Chat API] HF models failed or depleted. Trying Gemini Core Fallover...");
      const geminiReply = await callGemini(formattedMessages, undefined, {
        temperature: tempVal,
        topP: topPVal
      });
      responseText = geminiReply;
      modelUsed = "YorN Core (Gemini)";
      success = true;
      break;
    } catch (geminiError: any) {
      console.error("[Chat API] Gemini fallback failed on attempt:", attempt, geminiError);
    }

    // 3. If everything failed on this cycle, wait and try again
    if (!success && attempt < MAX_GLOBAL_RETRIES) {
      const waitTime = Math.min(1000 * attempt, 3000);
      console.warn(`[Chat API] Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  if (success) {
    res.json({ reply: responseText, model: modelUsed });
  } else {
    res.status(500).json({ error: 'Все модели временно недоступны. Пожалуйста, попробуйте позже.' });
  }
});

app.post('/api/yookassa/create-payment', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Неверная сумма платежа' });
    }

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      console.error('[YooKassa Error] Missing credentials in environment variables');
      return res.status(500).json({ error: 'Учетные данные ЮKassa не настроены в .env файле' });
    }

    const formattedAmount = Number(amount).toFixed(2);
    
    // Dynamic host detection
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const returnUrl = `${protocol}://${host}`;

    // Unique idempotency key to prevent double requests
    const idempotencyKey = `aura-pay-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    console.log(`[YooKassa] Creating payment of ${formattedAmount} RUB. Idempotency-Key: ${idempotencyKey}`);

    const payResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Idempotence-Key': idempotencyKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: {
          value: formattedAmount,
          currency: 'RUB'
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: returnUrl
        },
        description: 'Поддержка проекта YorN AI'
      })
    });

    if (!payResponse.ok) {
      const errorText = await payResponse.text();
      console.error(`[YooKassa Error API] Status: ${payResponse.status}, Details: ${errorText}`);
      throw new Error(`Ошибка ЮKassa API: ${payResponse.status} - ${errorText}`);
    }

    const paymentData: any = await payResponse.json();
    const paymentUrl = paymentData.confirmation?.confirmation_url;

    if (!paymentUrl) {
      console.error('[YooKassa Error] No confirmation_url in response:', paymentData);
      throw new Error('ЮKassa не вернула URL-адрес для подтверждения оплаты.');
    }

    res.json({ paymentUrl, paymentId: paymentData.id });
  } catch (error: any) {
    console.error('[YooKassa Payment Creation Error]', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка при создании платежа' });
  }
});

app.get('/api/config', (req, res) => {
  res.json({ hfToken: HF_TOKEN });
});

app.post('/api/transcribe-voice', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Не переданы аудиоданные' });
    }

    console.log(`[Transcribe API] Received voice snippet. Data length: ${audioData.length}. Mimetype: ${mimeType || 'audio/webm'}`);

    const buffer = Buffer.from(audioData, 'base64');
    let text = '';
    
    try {
      console.log(`[Transcribe API] Attempting Hugging Face automaticSpeechRecognition via whisper-large-v3-turbo...`);
      // We wrap the buffer in a standards-compliant Blob so Hugging Face can determine content-type
      const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });
      const result = await runWithHfRetry(hfInstance => hfInstance.automaticSpeechRecognition({
        model: 'openai/whisper-large-v3-turbo',
        data: blob,
      }));
      text = result.text || '';
    } catch (hfErr: any) {
      console.warn(`[Transcribe API] Whisper v3 Turbo failed. Trying Whisper-large-v3 fallback...`, hfErr.message || hfErr);
      try {
        const blobFallback = new Blob([buffer], { type: mimeType || 'audio/webm' });
        const resultFallback = await runWithHfRetry(hfInstance => hfInstance.automaticSpeechRecognition({
          model: 'openai/whisper-large-v3',
          data: blobFallback,
        }));
        text = resultFallback.text || '';
      } catch (fallbackErr: any) {
        console.warn(`[Transcribe API] Both Hugging Face Whisper models failed. Trying Gemini Core Audio fallback...`, fallbackErr.message || fallbackErr);
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY не задан в переменных окружения');
          }

          const payload = {
            contents: [
              {
                parts: [
                  {
                    text: "Пожалуйста, расшифруй эту аудиозапись на русском языке. Верни только текст расшифровки без лишних слов, комментариев или форматирования."
                  },
                  {
                    inlineData: {
                      data: audioData,
                      mimeType: mimeType || 'audio/webm'
                    }
                  }
                ]
              }
            ]
          };

          const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-3.5-flash'
          ];

          let successAudio = false;
          let lastAudioErr: any = null;
          for (const modelName of modelsToTry) {
            try {
              const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
              const apiResponse = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'aistudio-build'
                },
                body: JSON.stringify(payload)
              });

              if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                throw new Error(`Model ${modelName} returned status ${apiResponse.status} - ${errorText}`);
              }

              const responseJson: any = await apiResponse.json();
              text = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
              successAudio = true;
              break;
            } catch (e: any) {
              console.warn(`[Transcribe Gemini Resiliency] Model ${modelName} failed: ${e.message || e}`);
              lastAudioErr = e;
            }
          }

          if (!successAudio) {
            throw new Error(`Все модели Gemini в каскаде аудио вернули ошибку. Последняя ошибка: ${lastAudioErr?.message || lastAudioErr}`);
          }
        } catch (geminiAudioErr: any) {
          console.error(`[Transcribe API] Ultimate fallback failed. Raw error details:`, geminiAudioErr);
          throw new Error("Не удалось расшифровать аудио с помощью Hugging Face или Gemini.");
        }
      }
    }

    console.log(`[Transcribe API] Final Result text: "${text.trim()}"`);
    res.json({ text: text.trim() });
  } catch (err: any) {
    console.error('[Transcribe Error]', err);
    res.status(500).json({ error: err.message || 'Ошибка транскрипции' });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Не передан текст для озвучивания' });
    }

    console.log(`[TTS API] Translating text to speech, length: ${text.length}`);

    // Multilingual support
    const isEnglish = /[a-zA-Z]{4,}/.test(text.slice(0, 60));
    const modelSelected = isEnglish ? 'facebook/mms-tts-eng' : 'facebook/mms-tts-rus';
    console.log(`[TTS API] Chosen HF model: ${modelSelected}`);

    let base64Audio = '';
    try {
      console.log(`[TTS API] Attempting Hugging Face textToSpeech SDK call...`);
      const responseBlob = await runWithHfRetry(hfInstance => hfInstance.textToSpeech({
        model: modelSelected,
        inputs: text,
      }));

      const arrayBuffer = await responseBlob.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuffer);
      base64Audio = outputBuffer.toString('base64');
    } catch (hfTtsErr: any) {
      console.warn(`[TTS API] Hugging Face TTS call failed: ${hfTtsErr.message || hfTtsErr}. Using server-side fallback...`);
      // Use direct fetch as fallback just in case SDK call failed
      const currentToken = getActiveToken();
      const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${modelSelected}`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({ inputs: text })
      });

      if (hfResponse.ok) {
        const arrayBuffer = await hfResponse.arrayBuffer();
        const outputBuffer = Buffer.from(arrayBuffer);
        base64Audio = outputBuffer.toString('base64');
      } else {
        throw new Error(`HF TTS Fallback API error: ${hfResponse.status}`);
      }
    }

    if (!base64Audio) {
      throw new Error('TTS не вернул валидные аудиоданные');
    }

    res.json({ audioData: base64Audio });
  } catch (err: any) {
    console.error('[TTS Error] Failed generating voice with HuggingFace:', err.message || err);
    res.status(500).json({ error: err.message || 'Ошибка синтеза речи' });
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

  let text = '';
  try {
    const response = await runWithHfRetry(hfInstance => hfInstance.chatCompletion({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages: [promptMessage],
      max_tokens: 1536,
      temperature: 0.6,
    }));

    if (response.choices && response.choices.length > 0) {
      text = response.choices[0].message.content || '';
    }
  } catch (hfError: any) {
    console.warn("HF train-skill failed. Falling back to Gemini Client...:", hfError.message || hfError);
    try {
      text = await callGemini([promptMessage], undefined, {
        temperature: 0.6,
        responseMimeType: "application/json"
      });
    } catch (geminiError: any) {
      console.error("Gemini fallback in train-skill failed:", geminiError);
    }
  }

  if (text) {
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
});

app.post('/api/image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt string' });
  }

  let finalPrompt = prompt;
  
  // Try to use Hugging Face LLM to translate and enhance the prompt to English for better results
  try {
    const promptMessage = {
      role: 'user',
      content: `You are an expert image generation prompt engineer. The user wants an image based on the following text.
Translate it to English if it's not, and enhance it into a highly descriptive, high-quality image generation prompt.
Unless the user explicitly asks for a cartoon, anime, 3D render, illustration, drawing, painting, or vector art, you MUST make the enhanced prompt describe a highly details, professional, realistic, lifelike photograph (e.g. specifying authentic textures, natural lighting, shot on 35mm lens, photorealistic details, high-end production camera). Under no circumstances make it look cartoonish, animated, CGI-like, or like a drawing unless explicitly requested.
Keep it strictly under 55 words. Do not add any conversational text, explanations, or prefixes like "Prompt:". Return ONLY the final English prompt.
User input: ${prompt}`
    };

    let text = '';
    try {
      const response = await runWithHfRetry(hfInstance => hfInstance.chatCompletion({
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [promptMessage],
        max_tokens: 150,
        temperature: 0.7,
      }));

      if (response.choices && response.choices.length > 0) {
        text = response.choices[0].message.content || '';
      }
    } catch (hfErr) {
      console.warn("HF prompt enhancement failed. Falling back to Gemini Client...");
      text = await callGemini([promptMessage]);
    }

    if (text.trim()) {
      finalPrompt = text.trim();
      // Remove common prefixes that models might accidentally add
      finalPrompt = finalPrompt.replace(/^(Enhanced )?(Image )?Prompt:\s*/i, '').trim();
      console.log(`Enhanced Image Prompt: ${finalPrompt}`);
    }
  } catch (err) {
    console.error("Prompt enhancement failed, using original prompt.", err);
  }

  // Fast, free image models on HF
  const modelsToTry = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "prompthero/openjourney"
  ];

  let success = false;
  let imageUrl = '';
  let modelUsed = '';

  for (const model of modelsToTry) {
    try {
      const responseBlob = await runWithHfRetry(hfInstance => hfInstance.textToImage({
        inputs: finalPrompt,
        model: model,
        parameters: {
          negative_prompt: "cartoon, anime, 3d render, CGI, drawing, painting, illustration, vector, sketch, low quality, bad anatomy, ugly, distorted, blurry, doll, toy, unreal engine render",
        }
      })) as unknown as Blob;
      
      const buffer = Buffer.from(await responseBlob.arrayBuffer());
      imageUrl = `data:${responseBlob.type};base64,${buffer.toString('base64')}`;
      modelUsed = model;
      success = true;
      break;
    } catch (e: any) {
      console.warn(`[Failover Warning] Image Model ${model} returned error: ${e.message || e}. Trying next available...`);
    }
  }

  if (success && imageUrl) {
    res.json({ imageUrl, model: modelUsed });
  } else {
    // Ultimate fallback zero-setup working model using public pollinations API
    let safePrompt = finalPrompt.trim();
    if (safePrompt.length > 800) {
      safePrompt = safePrompt.substring(0, 800);
    }
    safePrompt = encodeURIComponent(safePrompt);
    const fallbackUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&nologo=true`;
    res.json({ imageUrl: fallbackUrl, model: "Auto/Pollinations (Fallback)" });
  }
});



app.post('/api/edit-image', async (req, res) => {
  const { image, mask, prompt } = req.body;
  if (!image || !mask || !prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing image, mask, or prompt string' });
  }

  let finalPrompt = prompt;

  // Try to use Hugging Face LLM to translate and enhance the prompt
  try {
    const promptMessage = {
      role: 'user',
      content: `You are an expert image generation prompt engineer. The user wants to modify an image with the following instruction.
Translate it to English if it's not, and enhance it into a highly descriptive, high-quality image generation / inpainting prompt.
Keep it strictly under 50 words. Do not add any conversational text, explanations, or prefixes like "Prompt:". Return ONLY the final English prompt.
Modification instruction: ${prompt}`
    };

    let text = '';
    try {
      const response = await runWithHfRetry(hfInstance => hfInstance.chatCompletion({
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [promptMessage],
        max_tokens: 150,
        temperature: 0.7,
      }));

      if (response.choices && response.choices.length > 0) {
        text = response.choices[0].message.content || '';
      }
    } catch (hfErr) {
      console.warn("HF prompt edit enhancement failed. Falling back to Gemini Client...");
      text = await callGemini([promptMessage]);
    }

    if (text.trim()) {
      finalPrompt = text.trim();
      finalPrompt = finalPrompt.replace(/^(Enhanced )?(Image )?Prompt:\s*/i, '').trim();
      console.log(`Enhanced Edit Prompt: ${finalPrompt}`);
    }
  } catch (err) {
    console.error("Prompt enhancement failed for edit, using original.", err);
  }

  try {
    // Parse helper
    const base64ToBuffer = (base64Str: string) => {
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return { buffer: Buffer.from(base64Str, 'base64'), mimeType: 'image/png' };
      }
      return {
        mimeType: matches[1],
        buffer: Buffer.from(matches[2], 'base64')
      };
    };

    // Load original image
    let imageBuffer: Buffer;
    let imageMime = 'image/png';
    if (image.startsWith('http')) {
      const imgRes = await fetch(image);
      const arrBuf = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrBuf);
      imageMime = imgRes.headers.get('content-type') || 'image/png';
    } else {
      const parsed = base64ToBuffer(image);
      imageBuffer = parsed.buffer;
      imageMime = parsed.mimeType;
    }

    // Load mask
    const parsedMask = base64ToBuffer(mask);
    const maskBuffer = parsedMask.buffer;

    const imageBlob = new Blob([imageBuffer], { type: imageMime });
    const maskBlob = new Blob([maskBuffer], { type: 'image/png' });

    let success = false;
    let editedImageUrl = '';
    let modelUsed = '';

    // 1. Try a list of inpainting models
    const inpaintingModels = [
      "stabilityai/stable-diffusion-2-inpainting",
      "runwayml/stable-diffusion-inpainting",
      "diffusers/stable-diffusion-xl-1.0-inpainting-0.1"
    ];

    for (const model of inpaintingModels) {
      try {
        console.log(`Trying inpainting model: ${model}`);
        const responseBlob = await runWithHfRetry(hfInstance => hfInstance.request({
          model: model,
          inputs: {
            image: imageBlob,
            mask_image: maskBlob,
            prompt: finalPrompt,
          }
        })) as unknown as Blob;

        const buffer = Buffer.from(await responseBlob.arrayBuffer());
        editedImageUrl = `data:${responseBlob.type};base64,${buffer.toString('base64')}`;
        modelUsed = model;
        success = true;
        break;
      } catch (e: any) {
        console.warn(`Inpainting model ${model} failed: ${e.message || e}`);
      }
    }

    // 2. Fallback: Try image-to-image on several models
    if (!success) {
      const img2imgModels = [
        "runwayml/stable-diffusion-v1-5",
        "Lykon/DreamShaper",
        "prompthero/openjourney",
        "stabilityai/stable-diffusion-xl-base-1.0"
      ];

      for (const model of img2imgModels) {
        try {
          console.log(`Trying image-to-image model: ${model}`);
          const responseBlob = await runWithHfRetry(hfInstance => hfInstance.imageToImage({
            model: model,
            inputs: imageBlob,
            parameters: {
              prompt: finalPrompt,
              strength: 0.6,
            }
          })) as unknown as Blob;

          const buffer = Buffer.from(await responseBlob.arrayBuffer());
          editedImageUrl = `data:${responseBlob.type};base64,${buffer.toString('base64')}`;
          modelUsed = `${model} (Img2Img Fallback)`;
          success = true;
          break;
        } catch (e: any) {
          console.warn(`Img2Img model ${model} failed: ${e.message || e}`);
        }
      }
    }

    // 3. Last HF Fail-safe: Fallback to a brand-new Text-to-Image Generation
    if (!success) {
      try {
        console.log(`Inpainting and Img2Img both failed. Running text-to-image fallback with FLUX...`);
        const responseBlob = await runWithHfRetry(hfInstance => hfInstance.textToImage({
          inputs: finalPrompt,
          model: "black-forest-labs/FLUX.1-schnell",
        })) as unknown as Blob;

        const buffer = Buffer.from(await responseBlob.arrayBuffer());
        editedImageUrl = `data:${responseBlob.type};base64,${buffer.toString('base64')}`;
        modelUsed = "black-forest-labs/FLUX.1-schnell (Txt2Img Fallback)";
        success = true;
      } catch (e: any) {
        console.warn(`Text-to-image fallback failed: ${e.message || e}`);
      }
    }

    // 4. Undefeatable Fallback: Pollinations.ai (returns instantly, 100% reliable)
    if (!success) {
      console.log(`All HF image editing models failed. Utilizing Pollinations API fallback...`);
      let safePrompt = finalPrompt.trim();
      if (safePrompt.length > 800) {
        safePrompt = safePrompt.substring(0, 800);
      }
      const encodedPrompt = encodeURIComponent(safePrompt);
      editedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
      modelUsed = "Auto/Pollinations (Ultimate Edit Fallback)";
      success = true;
    }

    if (success && editedImageUrl) {
      res.json({ imageUrl: editedImageUrl, model: modelUsed });
    } else {
      res.status(500).json({ error: 'Не удалось отредактировать изображение. Попробуйте другой запрос.' });
    }
  } catch (err: any) {
    console.error("Error editing image:", err);
    res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера при редактировании.' });
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
