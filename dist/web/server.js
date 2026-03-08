"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const multer_1 = __importDefault(require("multer"));
const analyzer_1 = require("../analyzer");
const block_1 = require("../analyzer/block");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
app.use(express_1.default.json({ limit: '10mb' }));
const upload = (0, multer_1.default)({ dest: os.tmpdir() });
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.post('/api/analyze', (req, res) => {
    try {
        const body = req.body;
        if (!body?.raw_tx) {
            res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'raw_tx is required' } });
            return;
        }
        const fixture = {
            network: body.network || 'mainnet',
            raw_tx: body.raw_tx.replace(/\s+/g, ''),
            prevouts: Array.isArray(body.prevouts) ? body.prevouts : [],
        };
        res.json((0, analyzer_1.analyzeTransaction)(fixture));
    }
    catch (error) {
        res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
});
app.post('/api/analyze-block', upload.fields([
    { name: 'blk', maxCount: 1 },
    { name: 'rev', maxCount: 1 },
    { name: 'xor', maxCount: 1 },
]), (req, res) => {
    const files = req.files;
    const blkFile = files?.['blk']?.[0];
    const revFile = files?.['rev']?.[0];
    const xorFile = files?.['xor']?.[0];
    if (!blkFile || !revFile || !xorFile) {
        res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'blk, rev, and xor files are required' } });
        return;
    }
    try {
        const blocks = (0, block_1.analyzeBlocks)(blkFile.path, revFile.path, xorFile.path);
        res.json({ ok: true, blocks });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
    finally {
        [blkFile.path, revFile.path, xorFile.path].forEach(p => { try {
            fs.unlinkSync(p);
        }
        catch { } });
    }
});
app.use((err, _req, res, _next) => {
    const status = err.status ?? err.statusCode ?? 500;
    res.status(status).json({
        ok: false,
        error: { code: err.type ?? 'SERVER_ERROR', message: err.message ?? 'Unknown error' },
    });
});
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir))
    app.use(express_1.default.static(publicDir));
const fixturesDir = path.join(process.cwd(), 'fixtures');
if (fs.existsSync(fixturesDir))
    app.use('/fixtures', express_1.default.static(fixturesDir));
app.get('/*splat', (_req, res) => {
    const idx = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(idx))
        res.sendFile(idx);
    else
        res.status(503).json({ error: 'Frontend not built. Run: npm run build:web' });
});
app.listen(PORT, '127.0.0.1', () => {
    console.log(`http://127.0.0.1:${PORT}`);
});
//# sourceMappingURL=server.js.map