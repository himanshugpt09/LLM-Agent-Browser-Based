# LLM-Agent-Browser-Based

An advanced browser-based AI agent that uses multiple tools in a reasoning loop to accomplish complex tasks intelligently.

## ✨ Features

- **Multi-LLM Support**: Works with OpenAI, Anthropic, and Google models  
- **Intelligent Tool Integration**:
  - 🔍 **Google Search API** for real-time web information retrieval  
  - 🤖 **AI Pipe API** for flexible data workflows and processing  
  - 💻 **JavaScript Code Execution** for secure browser-based computation  
- **Smart Reasoning Loop**: Continues executing tools until the task is complete  
- **Professional UI**: Modern, responsive interface with Bootstrap & error handling  

---

## 🚀 Setup

1. Clone or download this repo.  
2. Open `index.html` in a modern web browser.  
3. Configure your API keys in the sidebar:  
   - **LLM Provider API Key** (e.g., OpenAI)  
   - **Google Search API Key**  
   - **Search Engine ID (CX)** from Google  

### 🔑 Getting API Keys

#### OpenAI API Key
1. Visit [OpenAI API](https://platform.openai.com/api-keys)  
2. Create a new API key  
3. Paste into **Advanced Settings → API Key**  

#### Google Search API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)  
2. Enable **Custom Search JSON API**  
3. Create credentials (API key)  
4. Set up a Custom Search Engine at [Custom Search](https://cse.google.com/)  
5. Copy the **CX ID** (from the `cx=` query string)  

---

## 💡 Usage Examples

### Example 1: Research Assistant
```

User: Research the latest developments in quantum computing and create a summary

```
Agent workflow:
1. Calls Google Search for quantum computing news  
2. Analyzes snippets  
3. Produces a concise structured summary  

---

### Example 2: Data Analysis
```

User: Generate some random data and calculate statistics

```
Agent workflow:
1. Executes sandboxed JavaScript to generate data  
2. Calculates mean, variance, etc.  
3. Displays results in a chat card with code formatting  

---

### Example 3: Interview Bot
```

User: Interview me to create a blog post about IBM

```
Agent workflow:
1. Calls Google Search for IBM information  
2. Asks relevant questions back to the user  
3. Organizes answers into a blog-style draft  

---

## 🔧 Tool Capabilities

### 🔍 Google Search
- Fetches web snippets  
- Configurable number of results  
- Uses Custom Search JSON API  

### 🤖 AI Pipe API
- Proxy for custom workflows  
- Supports GET/POST  
- Extendable for summarization, sentiment analysis, translation, etc.  

### 💻 JavaScript Execution
- Runs user/agent-provided code in a sandbox (Web Worker)  
- Captures console logs, results, and errors  
- Displays outputs with syntax highlighting  

---

## 🔒 Security Considerations

- API keys stored **only in browser localStorage**  
- JavaScript runs inside an isolated **Web Worker**  
- No server-side execution  
- CORS policies apply for external APIs  

---

## 🔮 Extension Ideas

- 📂 File Upload: Analyze documents directly  
- 🎨 Image Generation: Add DALL·E or Stable Diffusion support  
- 🎤 Voice Interface: Speech-to-text input  
- 💾 Export Features: Save chats as PDF or Markdown  
- 🧩 Plugin System: Extensible tool registry  
- 📜 Persistent Conversations: Store history in localStorage  

---

## 🛠 Troubleshooting

**"Please provide an API key"**  
→ Enter your LLM provider API key in settings  

**"Google Search API error"**  
→ Check Google Search API key & CX ID, ensure billing/quota is active  

**"CORS Error"**  
→ Some APIs block browser calls. Use a proxy server if needed  

**"Tool execution failed"**  
→ Validate your JavaScript code, or check API endpoint availability  

---

## 📜 License

MIT License — free to use, modify, and extend.  
Contributions welcome!
```

---

👉 Do you also want me to add **screenshots + a demo workflow GIF** section to the README, so it looks more like a GitHub-ready project?
