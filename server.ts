import express from 'express';
import { createServer as createViteServer } from 'vite';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to download the project source code as a zip
  app.get('/api/download-project', (req, res) => {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    res.attachment('project-source.zip');

    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Append files from the current directory, excluding node_modules and .git
    archive.glob('**/*', {
      cwd: __dirname,
      ignore: ['node_modules/**', '.git/**', 'dist/**', '.DS_Store', 'project-source.zip']
    });

    archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // SPA fallback
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
