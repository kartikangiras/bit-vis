import express, { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import multer from 'multer';
import { analyzeTransaction } from '../analyzer';
import { analyzeBlocks } from '../analyzer/block';
import { Fixture } from '../types';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

const upload = multer({ dest: os.tmpdir() });

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post('/api/analyze', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body?.raw_tx) {
      res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'raw_tx is required' } });
      return;
    }
    const fixture: Fixture = {
      network: body.network || 'mainnet',
      raw_tx: (body.raw_tx as string).replace(/\s+/g, ''),
      prevouts: Array.isArray(body.prevouts) ? body.prevouts : [],
    };
    res.json(analyzeTransaction(fixture));
  } catch (error: any) {
    res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post(
  '/api/analyze-block',
  upload.fields([
    { name: 'blk', maxCount: 1 },
    { name: 'rev', maxCount: 1 },
    { name: 'xor', maxCount: 1 },
  ]),
  (req: Request, res: Response) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const blkFile = files?.['blk']?.[0];
    const revFile = files?.['rev']?.[0];
    const xorFile = files?.['xor']?.[0];
    if (!blkFile || !revFile || !xorFile) {
      res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'blk, rev, and xor files are required' } });
      return;
    }
    try {
      const blocks = analyzeBlocks(blkFile.path, revFile.path, xorFile.path);
      res.json({ ok: true, blocks });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message } });
    } finally {
      [blkFile.path, revFile.path, xorFile.path].forEach(p => { try { fs.unlinkSync(p); } catch {} });
    }
  }
);

app.use((err: any, _req: Request, res: Response, _next: any) => {
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    ok: false,
    error: { code: err.type ?? 'SERVER_ERROR', message: err.message ?? 'Unknown error' },
  });
});

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

const fixturesDir = path.join(process.cwd(), 'fixtures');
if (fs.existsSync(fixturesDir)) app.use('/fixtures', express.static(fixturesDir));

app.get('/*splat', (_req: Request, res: Response) => {
  const idx = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx);
  else res.status(503).json({ error: 'Frontend not built. Run: npm run build:web' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}`);
});
