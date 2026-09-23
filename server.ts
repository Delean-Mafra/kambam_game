import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Application & License metadata
const LICENSE_INFO = {
  name: 'CC BY-NC 4.0',
  full_name: 'Creative Commons Atribuição-NãoComercial 4.0 Internacional',
  url: 'https://delean-mafra.github.io/Ahtools/CC_BY_NC_4.0',
  author: 'Delean P. Mafra',
  year: '2026',
  project: 'Kanban EV GAME',
};

const VERSION_INFO = {
  app: 'KANBAN EV GAME',
  number: '1.1.0',
  scheme: 'semver',
  release_date: '2026-03-12',
  build: process.env.KANBAN_EV_BUILD || 'local',
  generated_at: new Date().toISOString().split('T')[0],
};

// In-memory tasks store initialized from dados.json if present
interface Task {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: string;
  deadline?: string;
  timestamps?: Record<string, string>;
}

let tasks: Task[] = [];
try {
  const dadosPath = path.join(__dirname, 'dados.json');
  if (fs.existsSync(dadosPath)) {
    const raw = fs.readFileSync(dadosPath, 'utf-8');
    const parsed = JSON.parse(raw);
    tasks = parsed.tasks || [];
  }
} catch (err) {
  console.warn('Could not read dados.json, initializing empty tasks array');
}

app.use(express.json());

// Add version header to all responses
app.use((req, res, next) => {
  res.setHeader('X-App-Version', VERSION_INFO.number);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Servidor Kanban EV funcionando!',
    license: LICENSE_INFO,
    version: VERSION_INFO,
  });
});

// Version endpoint
app.get('/version', (req: Request, res: Response) => {
  res.json({
    version: VERSION_INFO,
    license: LICENSE_INFO,
  });
});

// License endpoint
app.get('/license', (req: Request, res: Response) => {
  res.json({
    license: LICENSE_INFO,
    terms: {
      attribution: 'Você deve dar crédito apropriado ao autor',
      non_commercial: 'Você não pode usar para fins comerciais',
      share_alike: 'Modificações devem manter a mesma licença',
    },
  });
});

// Favicon endpoint
app.get('/favicon.ico', (req: Request, res: Response) => {
  const faviconPath = path.join(__dirname, 'templates', 'favicon.svg');
  if (fs.existsSync(faviconPath)) {
    res.type('image/svg+xml').sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
});

// Kanban Tasks Analytics API (from kanbam.py)
app.get('/api/tasks', (req: Request, res: Response) => {
  res.json({ tasks });
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const { title, description = '', column = 'backlog', priority = 'media', deadline = '' } = req.body;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toTimeString().slice(0, 5);
  const newTask: Task = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
    title: title || 'Nova Tarefa',
    description,
    column,
    priority,
    deadline,
    timestamps: {
      [column]: dateStr,
    },
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Tarefa não encontrada' });
    return;
  }
  tasks[idx] = { ...tasks[idx], ...req.body };
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  tasks = tasks.filter((t) => t.id !== id);
  res.json({ status: 'ok', message: 'Tarefa removida com sucesso' });
});

// Serve templates folder for static assets (regras_demo.js, style.css, favicon.svg, etc.)
app.use('/templates', express.static(path.join(__dirname, 'templates')));
app.use('/assets', express.static(path.join(__dirname, 'templates')));
app.use('/static', express.static(path.join(__dirname, 'templates')));

// Serve root static files (Banner.png, etc.)
app.use(express.static(__dirname, { index: false }));

// Main page
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🏭 Kanban EV Game running on http://${HOST}:${PORT}`);
});
