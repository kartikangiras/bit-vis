import { parseRawTransaction, computeTxid, computeWtxid } from '../parser/transaction';
import { disassembleScript, extractOpReturnData } from '../parser/script';
import { calculateWeight } from './weight';
import { detectRBF, analyzeRelativeTimelock, analyzeLocktime } from './timelocks';
import { calculateSegwitSavings } from './segwit';
import { classifyOutputScript, classifyInputScript } from './classifier';
import { generateAddress } from './address';
import { hexToBytes, bytesToHex } from '../utils/hex';
import { Fixture, TransactionAnalysis, ParsedInput, ParsedOutput, PrevoutData, ErrorResponse } from '../types';

export function analyzeTransaction(fixture: Fixture): TransactionAnalysis | ErrorResponse {
  try {
    const rawTx = parseRawTransaction(fixture.raw_tx);
    const weightCalc = calculateWeight(rawTx, fixture.raw_tx);

    const prevouts: PrevoutData[] = Array.isArray(fixture.prevouts) ? fixture.prevouts : [];

    const prevoutMap = new Map<string, PrevoutData>();
    for (const prevout of prevouts) {
      const key = `${prevout.txid}:${prevout.vout}`;
      if (prevoutMap.has(key)) {
        return {
          ok: false,
          error: {
            code: 'DUPLICATE_PREVOUT',
            message: `Duplicate prevout: ${key}`,
          },
        };
      }
      prevoutMap.set(key, prevout);
    }
    
    let totalInputValue = 0;
    const inputs: ParsedInput[] = [];
    
    for (let i = 0; i < rawTx.inputs.length; i++) {
      const input = rawTx.inputs[i];
      const key = `${input.txid}:${input.vout}`;
      const prevout = prevoutMap.get(key);
      
      if (!prevout) {
        return {
          ok: false,
          error: {
            code: 'MISSING_PREVOUT',
            message: `Missing prevout for input ${i}: ${key}`,
          },
        };
      }
      
      totalInputValue += prevout.value_sats;
      
      const witnessItems = rawTx.segwit && rawTx.witnesses[i] 
        ? rawTx.witnesses[i].map(w => bytesToHex(w))
        : [];
      
      const scriptType = classifyInputScript(
        bytesToHex(input.scriptSig),
        witnessItems,
        prevout.script_pubkey_hex
      );
      
      const address = generateAddress(prevout.script_pubkey_hex, fixture.network as any);
      
      const relativeTimelock = analyzeRelativeTimelock(input.sequence);
      
      const parsedInput: ParsedInput = {
        txid: input.txid,
        vout: input.vout,
        sequence: input.sequence,
        script_sig_hex: bytesToHex(input.scriptSig),
        script_asm: disassembleScript(bytesToHex(input.scriptSig)),
        witness: witnessItems,
        script_type: scriptType,
        address,
        prevout: {
          value_sats: prevout.value_sats,
          script_pubkey_hex: prevout.script_pubkey_hex,
        },
        relative_timelock: relativeTimelock as any,
      };

      if ((scriptType === 'p2wsh' || scriptType === 'p2sh-p2wsh') && witnessItems.length > 0) {
        let witnessScript = witnessItems[witnessItems.length - 1];
        if (witnessScript.startsWith('50') && witnessItems.length >= 2) {
          witnessScript = witnessItems[witnessItems.length - 2];
        }
        parsedInput.witness_script_asm = disassembleScript(witnessScript);
      }

      inputs.push(parsedInput);
    }
    
    let totalOutputValue = 0;
    const outputs: ParsedOutput[] = [];
    
    for (let i = 0; i < rawTx.outputs.length; i++) {
      const output = rawTx.outputs[i];
      const scriptHex = bytesToHex(output.scriptPubKey);
      const scriptType = classifyOutputScript(scriptHex);
      const address = generateAddress(scriptHex, fixture.network as any);
      
      totalOutputValue += Number(output.value);
      
      const parsedOutput: ParsedOutput = {
        n: i,
        value_sats: Number(output.value),
        script_pubkey_hex: scriptHex,
        script_asm: disassembleScript(scriptHex),
        script_type: scriptType,
        address,
      };
      
      if (scriptType === 'op_return') {
        const opReturnData = extractOpReturnData(scriptHex);
        parsedOutput.op_return_data_hex = opReturnData.data_hex;
        parsedOutput.op_return_data_utf8 = opReturnData.data_utf8;
        parsedOutput.op_return_protocol = opReturnData.protocol;
      }
      
      outputs.push(parsedOutput);
    }
    const isCoinbase =
      (rawTx.inputs.length === 1 &&
        rawTx.inputs[0].txid === '0000000000000000000000000000000000000000000000000000000000000000') ||
      rawTx.inputs.some(inp => inp.vout === 0xffffffff) ||
      (totalInputValue === 0 && totalOutputValue > 0);

    const feeSats = isCoinbase ? 0 : Math.max(0, totalInputValue - totalOutputValue);

    const feeRate = isCoinbase ? 0 : (feeSats / weightCalc.vbytes);
    
    const sequences = rawTx.inputs.map(inp => inp.sequence);
    const rbfSignaling = detectRBF(sequences);

    const locktimeAnalysis = analyzeLocktime(rawTx.locktime);
    
    const txid = computeTxid(rawTx);
    const wtxid = rawTx.segwit ? computeWtxid(rawTx, hexToBytes(fixture.raw_tx)) : null;
    
    const warnings: { code: string }[] = [];

    if (rbfSignaling) {
      warnings.push({ code: 'RBF_SIGNALING' });
    }

    if (feeSats > 1_000_000 || feeRate > 200) {
      warnings.push({ code: 'HIGH_FEE' });
    }

    for (const output of outputs) {
      if (output.script_type !== 'op_return' && output.value_sats < 546) {
        warnings.push({ code: 'DUST_OUTPUT' });
        break;
      }
    }

    for (const output of outputs) {
      if (output.script_type === 'unknown') {
        warnings.push({ code: 'UNKNOWN_OUTPUT_SCRIPT' });
        break;
      }
    }
    
    const segwitSavings = rawTx.segwit
      ? calculateSegwitSavings(
          weightCalc.witness_bytes,
          weightCalc.non_witness_bytes,
          weightCalc.size_bytes,
          weightCalc.weight
        )
      : null;
    
    const result: TransactionAnalysis = {
      ok: true,
      is_coinbase: isCoinbase,
      network: fixture.network,
      segwit: rawTx.segwit,
      txid,
      wtxid,
      version: rawTx.version,
      locktime: rawTx.locktime,
      size_bytes: weightCalc.size_bytes,
      weight: weightCalc.weight,
      vbytes: weightCalc.vbytes,
      total_input_sats: totalInputValue,
      total_output_sats: totalOutputValue,
      fee_sats: feeSats,
      fee_rate_sat_vb: Math.round(feeRate * 100) / 100,
      rbf_signaling: rbfSignaling,
      locktime_type: locktimeAnalysis.type,
      locktime_value: locktimeAnalysis.value,
      segwit_savings: segwitSavings,
      vin_count: rawTx.inputs.length,
      vout_count: rawTx.outputs.length,
      vin: inputs,
      vout: outputs,
      warnings,
    };
    
    return result;
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: error.message || 'Failed to parse transaction',
      },
    };
  }
}
