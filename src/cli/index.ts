#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { analyzeTransaction } from '../analyzer';
import { analyzeBlocks } from '../analyzer/block';
import { Fixture } from '../types';

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
    const fixture: Fixture = JSON.parse(fixtureContent);
    
    const result = analyzeTransaction(fixture);
    
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
    } else {
      const errorJson = JSON.stringify(result, null, 2);
      console.error(errorJson);
      process.exit(1);
    }
  } catch (error: any) {
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

function handleBlockMode(args: string[]) {
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
    
    const results = analyzeBlocks(blkPath, revPath, xorPath);

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
  } catch (error: any) {
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
