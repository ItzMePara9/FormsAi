# FormGenius AI — Self-Hosted AI Google Forms Builder

FormGenius AI is a modern, production-grade, self-hosted web application that transforms natural language prompts into complete, professionally structured Google Forms. Powered by Google AI Studio (Gemini 3.8 Flash & Pro) and OpenAI-compatible providers, it includes a visual drag-and-drop canvas editor, interactive multi-device preview, AI copilot chat with version history, and 1-click publishing directly to your Google account via the official Google Forms API.

---

## Key Features

- **Self-Hosted & Private**: First-time administrator wizard, secure session cookies, and zero public registration.
- **Enterprise Security (AES-256-GCM)**: All AI API keys and Google OAuth refresh tokens are encrypted at rest with unique cryptographic IVs. Secrets are never exposed to browsers or logs.
- **AI Model Flexibility**: Unlimited provider configurations:
  - Google AI Studio (Gemini 3.8 Flash, Gemini 3.8 Pro, Gemini 2.0 Flash)
  - OpenAI-compatible endpoints (GPT-4o, Groq, DeepSeek, Local Ollama/vLLM)
- **Natural Language Generator**: Generates comprehensive surveys, quizzes, and applications with intelligent type selection (Multiple Choice, Checkboxes, Dropdown, Short Answer, Paragraph, Linear Scale, Date/Time).
- **Interactive Form Canvas**: Edit questions, reorganize sections, toggle required fields, configure validation, and manage options inline.
- **Live Multi-Device Preview**: Switch between Desktop, Tablet, and Mobile viewports with live Google Forms theme styling.
- **Conversational AI Copilot**: Chat with AI to revise questions, translate languages, tone-adjust, or expand options, backed by automatic version snapshots and 1-click undo.
- **Direct Google Forms Publishing**: Publishes live forms into Google Drive using the Google Forms API (`forms.body` and `drive.file` scopes) and returns public shareable URLs.
- **13 Built-in Blueprints**: Pre-loaded starter templates across HR, Customer Feedback, Events, Education, and Operations.

---

## Technology Stack

- **Runtime**: Node.js >= 20.x (Recommended: Node.js 24)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Express.js, TypeScript (`tsx` in dev, `esbuild` / `node` in prod)
- **Database**: SQLite (default, self-hosted) with PostgreSQL-compatible Prisma ORM
- **AI Integrations**: `@google/genai` TypeScript SDK and OpenAI SDK
- **OAuth & APIs**: Google APIs Node.js client (`googleapis`) and Google Forms API

---

## Quickstart (Development)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database**:
   ```bash
   DATABASE_URL="file:./dev.db" npx prisma db push
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser. If no administrator account exists, you will be automatically redirected to `/setup`.

---

## Production Deployment (Ubuntu 22.04 / 24.04 VPS)

### 1. System Requirements & Node.js 24 Installation

```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 24 LTS and build tools
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Clone & Build FormGenius AI

```bash
# Create application directory
sudo mkdir -p /var/www/formgenius
sudo chown -R $USER:$USER /var/www/formgenius
cd /var/www/formgenius

# Clone your repository
git clone <your-repo-url> .

# Install dependencies
npm ci

# Configure environment variables
cp .env.example .env
nano .env
```

Ensure `.env` contains:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL="file:./dev.db"
APP_URL="https://formgenius.yourdomain.com"
ENCRYPTION_KEY="<generate-with-openssl-rand-hex-32>"
SESSION_SECRET="<generate-with-openssl-rand-base64-32>"
```

Generate random encryption secrets:
```bash
openssl rand -hex 32
openssl rand -base64 32
```

### 3. Push Database Schema & Build

```bash
DATABASE_URL="file:./dev.db" npx prisma db push
npm run build
```

### 4. PM2 Process Configuration

Create `/var/www/formgenius/ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'formgenius-ai',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/var/www/formgenius',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

Launch with PM2:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5. Nginx Reverse Proxy with SSL

Create `/etc/nginx/sites-available/formgenius`:
```nginx
server {
    listen 80;
    server_name formgenius.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and configure Let's Encrypt SSL:
```bash
sudo ln -s /etc/nginx/sites-available/formgenius /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot and obtain free SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d formgenius.yourdomain.com
```

---

## Google Cloud OAuth 2.0 Setup

To allow FormGenius AI to publish forms to Google Accounts:

1. Visit [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project: `FormGenius AI`.
3. Enable APIs:
   - **Google Forms API**
   - **Google Drive API**
4. Configure **OAuth consent screen**:
   - User Type: **External** (or Internal for Workspace).
   - Scopes:
     - `https://www.googleapis.com/auth/forms.body`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/userinfo.email`
5. Create **Credentials** -> **OAuth Client ID**:
   - Application Type: **Web application**.
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/google/callback`
     - Production: `https://formgenius.yourdomain.com/api/google/callback`
6. In FormGenius AI, navigate to **Settings** and paste the **Google Client ID** and **Google Client Secret**.

---

## License

Apache-2.0
