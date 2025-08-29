/* script.js — LLM Agent POC: Browser-Based Multi-Tool Reasoning
 * - OpenAI-style tool calling
 * - Tools: Google Search (snippets), AI Pipe proxy, JS execution (sandbox)
 * - Bootstrap alerts for errors
 * - Minimal & hackable vanilla JS
 */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const html = String.raw;

const els = {
  apiSidebar: $('#api-sidebar'),
  exampleQuestions: $('#example-questions'),
  results: $('#results'),
  status: $('#status'),
  question: $('#question'),
  form: $('#task-form'),
  apiKey: $('#apiKeyInput'),
  baseUrl: $('#baseUrlInput'),
  model: $('#model'),
  systemPrompt: $('#system-prompt'),
  attempts: $('#attempts'),
};

// ---------- Persistence ----------
// ---------- Persistence (sessionStorage) ----------
const SAVE_KEY = 'apiagent:prefs:v2';

function loadPrefs() {
  try {
    const v = JSON.parse(sessionStorage.getItem(SAVE_KEY) || '{}');
    els.apiKey.value = v.apiKey || '';
    els.baseUrl.value = v.baseUrl || 'https://api.openai.com/v1';
    els.model.value = v.model || 'gpt-4.1-nano';
    els.systemPrompt.value = v.systemPrompt || defaultSystemPrompt();
    els.attempts.value = v.attempts ?? 3;

    // Tool config
    $('#google-key').value = v.googleKey || '';
    $('#google-cx').value = v.googleCx || '';
    $('#aipipe-base').value = v.aipipeBase || 'https://aipipe.org/openai/v1';
    $('#aipipe-route').value = v.aipipeRoute || '/run';
  } catch {
    /* noop */
  }
}

function savePrefs() {
  const v = {
    apiKey: els.apiKey.value.trim(),
    baseUrl: els.baseUrl.value.trim(),
    model: els.model.value.trim(),
    systemPrompt: els.systemPrompt.value,
    attempts: +els.attempts.value || 3,
    googleKey: $('#google-key').value.trim(),
    googleCx: $('#google-cx').value.trim(),
    aipipeBase: $('#aipipe-base').value.trim(),
    aipipeRoute: $('#aipipe-route').value.trim(),
  };
  sessionStorage.setItem(SAVE_KEY, JSON.stringify(v));
}


// ---------- Sidebar ----------
function renderSidebar() {
  els.apiSidebar.innerHTML = html`
    <div class="accordion-item bg-dark text-light">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#toolGoogle">
          <i class="bi bi-google me-2"></i> Google Search API
        </button>
      </h2>
      <div id="toolGoogle" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="mb-2">
            <label class="form-label">API Key</label>
            <input id="google-key" class="form-control" placeholder="AIza...">
          </div>
          <div>
            <label class="form-label">Custom Search CX</label>
            <input id="google-cx" class="form-control" placeholder="your_cx_id">
          </div>
          <div class="form-text">Returns top snippet results via Custom Search JSON API.</div>
        </div>
      </div>
    </div>

    <div class="accordion-item bg-dark text-light">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#toolAIPipe">
          <i class="bi bi-diagram-3 me-2"></i> AI Pipe Proxy
        </button>
      </h2>
      <div id="toolAIPipe" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="mb-2">
            <label class="form-label">Base URL</label>
            <input id="aipipe-base" class="form-control" placeholder="https://aipipe-proxy.example.com">
          </div>
          <div>
            <label class="form-label">Route</label>
            <input id="aipipe-route" class="form-control" value="/run">
          </div>
          <div class="form-text">Flexible dataflow proxy. The agent provides <code>name</code> and <code>params</code>.</div>
        </div>
      </div>
    </div>

    <div class="accordion-item bg-dark text-light">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#toolJS">
          <i class="bi bi-braces-asterisk me-2"></i> JS Execution (Sandbox)
        </button>
      </h2>
      <div id="toolJS" class="accordion-collapse collapse">
        <div class="accordion-body">
          Runs user/agent JS safely in a Web Worker; returns logs, result, and errors.
        </div>
      </div>
    </div>

    <div class="p-3">
      <button class="btn btn-outline-light w-100" id="save-prefs"><i class="bi bi-save me-2"></i>Save Settings</button>
    </div>
  `;
  $('#save-prefs').addEventListener('click', () => {
    savePrefs();
    toast('Settings saved', 'success');
  });
}

// ---------- Example Questions ----------
const EXAMPLES = [
  'Interview me to create a blog post.',
  'What’s the weather in Tokyo? Then summarize in 2 bullet points.',
  'Search for IBM basics and draft a 3-bullet overview.',
  'Call my AI pipe: name=currency_convert params={from:"USD",to:"INR",amount:10}.',
  'Run JS: compute primes under 100 and return the count.',
];
function renderExamples() {
  els.exampleQuestions.innerHTML = EXAMPLES.map(q => html`
    <button class="list-group-item list-group-item-action">${q}</button>
  `).join('');
  $$('#example-questions button').forEach(b => {
    b.addEventListener('click', () => { els.question.value = b.textContent; });
  });
}

// ---------- Alerts ----------
function toast(msg, type = 'info') {
  els.status.className = `alert alert-${type} mx-auto my-3 narrative`;
  els.status.textContent = msg;
  els.status.classList.remove('d-none');
  if (type !== 'danger') setTimeout(() => els.status.classList.add('d-none'), 2500);
}
function alertCard(message) {
  const div = document.createElement('div');
  div.className = 'alert alert-danger my-3';
  div.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${message}`;
  els.results.prepend(div);
}

// ---------- Chat rendering ----------
function addChat(role, content, cls = '') {
  const card = document.createElement('div');
  card.className = `p-3 my-2 chat-card shadow ${cls} ${role}`;

  // Add a label (User, Assistant, Tool, Error)
  const label = document.createElement('div');
  label.className = 'fw-bold small mb-1 opacity-75';
  label.textContent =
    role === 'user' ? '👤 User' :
    role === 'assistant' ? '🤖 Assistant' :
    role === 'tool' ? '🛠 Tool' :
    '⚠️ Error';
  card.append(label);

  // Add main content
  if (typeof content === 'string') {
    const div = document.createElement('div');
    div.innerHTML = sanitize(content);
    card.append(div);
  } else {
    card.append(content);
  }

  els.results.append(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function codeBlock(lang, code) {
  const pre = document.createElement('pre');
  pre.innerHTML = `<code class="language-${lang}">${escapeHtml(code)}</code>`;
  setTimeout(() => window.hljs?.highlightElement(pre.firstElementChild), 0);
  return pre;
}
function sanitize(s) { return s.replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function escapeHtml(s) { return sanitize(String(s)); }

// ---------- JS Sandbox ----------
async function runSandboxedJS(code) {
  const blob = new Blob([`
    const logs = [];
    const safeConsole = {
      log: (...a) => { logs.push(a.join(' ')); },
      error: (...a) => { logs.push('[error] ' + a.join(' ')); },
      warn: (...a) => { logs.push('[warn] ' + a.join(' ')); },
    };
    self.console = safeConsole;
    self.onmessage = (e) => {
      let result, error=null;
      try {
        result = (new Function('console', 'self', e.data.code))(safeConsole, null);
      } catch (err) { error = String(err && err.stack || err); }
      self.postMessage({ logs, result, error });
      self.close();
    };
  `], { type: 'application/javascript' });

  const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
  return new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage({ code });
  });
}

// ---------- Tools ----------
function toolSpecs() {
  return [
    {
      type: 'function',
      function: {
        name: 'search',   // FIXED: simpler name to match spec
        description: 'Google Custom Search: return snippet results.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            num: { type: 'integer', description: 'Number of results (1-10)', default: 5 },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ai_pipe',   // FIXED: simpler name to match spec
        description: 'Invoke an AI Pipe by name with params via proxy API.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Pipeline name' },
            params: { type: 'object', description: 'Arbitrary parameters for the pipeline' },
            method: { type: 'string', enum: ['GET','POST'], default: 'POST' }
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'run_js',   // FIXED: matches spec example
        description: 'Sandboxed JavaScript execution in a web worker; returns logs and result.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'JavaScript code to run' }
          },
          required: ['code'],
        },
      },
    },
  ];
}

// Tool runners
async function call_search(args) {
  const key = $('#google-key').value.trim();
  const cx = $('#google-cx').value.trim();
  if (!key || !cx) throw new Error('Google Search not configured. Add API key & CX in the sidebar.');
  const { query, num = 5 } = args;

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', Math.max(1, Math.min(10, num)));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google API error ${res.status}`);
  const data = await res.json();
  const items = (data.items || []).map(it => ({
    title: it.title,
    link: it.link,
    snippet: it.snippet,
    displayLink: it.displayLink,
  }));
  return { query, results: items };
}

async function call_ai_pipe(args) {
  const base = $('#aipipe-base').value.trim();
  const route = $('#aipipe-route').value.trim() || '/run';
  if (!base) throw new Error('AI Pipe base URL not configured.');
  const url = new URL(route, base).toString();

  const { name, params = {}, method = 'POST' } = args;
  const body = { name, params };
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`AI Pipe error ${res.status}`);
  const data = await res.json().catch(() => ({}));
  return { ok: true, data };
}

async function call_run_js(args) {
  const { code } = args;
  const out = await runSandboxedJS(code);
  return out;
}

const TOOL_RUNNERS = {
  search: call_search,
  ai_pipe: call_ai_pipe,
  run_js: call_run_js,
};

// ---------- LLM call ----------
async function llmCall(messages, { apiKey, baseUrl, model }) {
  const url = `${baseUrl.replace(/\/+$/,'')}/chat/completions`;
  const body = {
    model,
    messages,
    tools: toolSpecs(),
    temperature: 0.2,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`LLM error ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message || {};
  const tool_calls = msg.tool_calls || [];
  return { message: msg, tool_calls };
}

// ---------- Core Loop ----------
async function agentLoop(userText) {
  const apiKey = els.apiKey.value.trim();
  if (!apiKey) return alertCard('Please set your API key in Advanced Settings → API Key');

  const cfg = {
    apiKey,
    baseUrl: els.baseUrl.value.trim(),
    model: els.model.value.trim(),
    attempts: +els.attempts.value || 3,
  };
  const messages = [];
  if (els.systemPrompt.value.trim()) {
    messages.push({ role: 'system', content: els.systemPrompt.value });
  }
  messages.push({ role: 'user', content: userText });

  addChat('user', userText, 'user');
  let tries = cfg.attempts;

  while (tries-- > 0) {
    els.status.classList.add('d-none');

    let out;
    try {
      out = await llmCall(messages, cfg);
    } catch (err) {
      alertCard(err.message);
      break;
    }

    const { message, tool_calls } = out;
    const assistantText = message.content || '';

    if (assistantText?.trim()) {
      addChat('assistant', assistantText, 'assistant');
      messages.push({ role: 'assistant', content: assistantText });
    }

    if (!tool_calls?.length) {
      // No tools → break loop, but user can continue conversation manually
      break;
    }

    const toolPromises = tool_calls.map(async (tc) => {
      const fn = tc.function?.name;
      const args = safeJsonParse(tc.function?.arguments || '{}');
      try {
        const runner = TOOL_RUNNERS[fn];
        if (!runner) throw new Error(`Unknown tool: ${fn}`);
        const result = await runner(args);

        const pre = codeBlock('json', JSON.stringify(result, null, 2));
        const wrap = document.createElement('div');
        wrap.innerHTML = `<div class="small opacity-75 mb-2"><i class="bi bi-tools me-2"></i>Tool: <code>${fn}</code></div>`;
        wrap.append(pre);
        addChat('assistant', wrap, 'assistant');

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: fn,
          content: JSON.stringify(result),
        });
      } catch (e) {
        alertCard(`Tool ${fn} failed: ${e.message}`);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: fn,
          content: JSON.stringify({ error: String(e.message || e) }),
        });
      }
    });

    await Promise.all(toolPromises);
    // loop continues until no more tool calls
  }
}

// ---------- Helpers ----------
function defaultSystemPrompt() {
  return [
    'You are API Agent: a minimal browser-based LLM agent.',
    'You have access to these tools:',
    ' - search(query, num) → fetches Google search snippets',
    ' - ai_pipe(name, params) → calls API proxy with JSON params',
    ' - run_js(code) → executes sandboxed JavaScript and MUST return a small JSON result',
    '',
    'Guidelines:',
    ' - Always prefer concise, factual answers.',
    ' - Cite URLs only if they appear in tool results.',
    ' “When using run_js, always end with an explicit return statement returning a compact JSON object, e.g., { "result": value }. Do not just print or calculate.”',
  ].join(' ');
}

function safeJsonParse(s, dflt={}) {
  try { return JSON.parse(s); } catch { return dflt; }
}

// ---------- Form ----------
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  savePrefs();

  const q = els.question.value.trim();
  if (!q) return toast('Type a question first.', 'warning');
  els.question.value = '';
  agentLoop(q);
});

// ---------- Theme toggle ----------
document.addEventListener('click', (e) => {
  const v = e.target?.getAttribute?.('data-bs-theme-value');
  if (!v) return;
  document.documentElement.setAttribute('data-bs-theme', v);
});

// ---------- Boot ----------
renderSidebar();
renderExamples();
loadPrefs();
toast('Ready. Configure tools in the sidebar or just ask a question.', 'info');
