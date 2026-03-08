#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const analyzer_1 = require("../analyzer");
const block_1 = require("../analyzer/block");
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: node dist/cli/index.js <fixture.json> OR node dist/cli/index.js --block <blk.dat> <rev.dat> <xor.dat>');
        process.exit(1);
    }
    if (args[0] === '--block') {
        handleBlockMode(args.slice(1));
        return;
    }
    const fixturePath = args[0];
    if (!fs.existsSync(fixturePath)) {
        console.error(`Error: File not found: ${fixturePath}`);
        process.exit(1);
    }
    try {
        const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
        const fixture = JSON.parse(fixtureContent);
        const result = (0, analyzer_1.analyzeTransaction)(fixture);
        const outDir = path.join(process.cwd(), 'out');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        if (result.ok) {
            const outputPath = path.join(outDir, `${result.txid}.json`);
            const outputJson = JSON.stringify(result, null, 2);
            fs.writeFileSync(outputPath, outputJson);
            console.log(outputJson);
            process.exit(0);
        }
        else {
            const errorJson = JSON.stringify(result, null, 2);
            console.error(errorJson);
            process.exit(1);
        }
    }
    catch (error) {
        const errorResponse = {
            ok: false,
            error: {
                code: 'INVALID_FIXTURE',
                message: error.message || 'Failed to read or parse fixture file',
            },
        };
        console.error(JSON.stringify(errorResponse, null, 2));
        process.exit(1);
    }
}
function handleBlockMode(args) {
    if (args.length < 3) {
        const errorResponse = {
            ok: false,
            error: {
                code: 'INVALID_ARGS',
                message: 'Block mode requires 3 files: <blk.dat> <rev.dat> <xor.dat>',
            },
        };
        console.error(JSON.stringify(errorResponse, null, 2));
        process.exit(1);
    }
    const blkPath = args[0];
    const revPath = args[1];
    const xorPath = args[2];
    for (const filePath of [blkPath, revPath, xorPath]) {
        if (!fs.existsSync(filePath)) {
            const errorResponse = {
                ok: false,
                error: {
                    code: 'FILE_NOT_FOUND',
                    message: `File not found: ${filePath}`,
                },
            };
            console.error(JSON.stringify(errorResponse, null, 2));
            process.exit(1);
        }
    }
    try {
        const outDir = path.join(process.cwd(), 'out');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        const results = (0, block_1.analyzeBlocks)(blkPath, revPath, xorPath);
        const result = results[0];
        if (!result) {
            const errorResponse = {
                ok: false,
                error: { code: 'NO_BLOCK_FOUND', message: 'No block found in the provided file' },
            };
            console.error(JSON.stringify(errorResponse, null, 2));
            process.exit(1);
        }
        const blockHash = result.ok ? result.block_header.block_hash : result.block_hash;
        const outputPath = path.join(outDir, `${blockHash}.json`);
        const outputJson = JSON.stringify(result, null, 2);
        fs.writeFileSync(outputPath, outputJson);
        console.log(outputJson);
        process.exit(result.ok ? 0 : 1);
    }
    catch (error) {
        const errorResponse = {
            ok: false,
            error: {
                code: 'BLOCK_PARSE_ERROR',
                message: error.message || 'Failed to parse block file',
            },
        };
        console.error(JSON.stringify(errorResponse, null, 2));
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map