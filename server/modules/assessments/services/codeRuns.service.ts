/**
 * Assessment Code Runs Service
 * ----------------------------------------------------------------------
 * Glue between Judge0 + the `assessment_code_runs` table. Used by
 * `attempts.service.ts` when an answer needs to be executed (either
 * candidate-triggered "Run Code" or auto-grading on submit).
 */

import * as codeRunsRepo from "../repositories/codeRuns.repository";
import { judge0Client } from "./judge0Client.service";
import { CodeRunResult, CodeTestSuiteResult, TestCase } from "../types";

function normalize(s: string | null | undefined): string {
  return (s ?? "").replace(/\r\n/g, "\n").trim();
}

function rowToDto(row: any): CodeRunResult {
  return {
    id: row.id,
    answerId: row.answerId,
    language: row.language,
    judge0Token: row.judge0Token,
    statusId: row.statusId,
    statusDescription: row.statusDescription,
    stdout: row.stdout,
    stderr: row.stderr,
    compileOutput: row.compileOutput,
    runtimeMs: row.runtimeMs,
    memoryKb: row.memoryKb,
    passed: row.passed === null ? null : !!row.passed,
  };
}

export class CodeRunsService {
  /**
   * Single-case run: submit source code with optional stdin, wait for
   * Judge0 to finish, persist the row, and return the DTO. Pass set is
   * the optional `expectedStdout` check.
   */
  async runOnce(
    answerId: number,
    language: string,
    sourceCode: string,
    stdin?: string,
    expectedStdout?: string,
  ): Promise<CodeRunResult> {
    const result = await judge0Client.submitAndWait({
      language,
      sourceCode,
      stdin,
      expectedStdout,
    });
    const passed =
      expectedStdout !== undefined
        ? normalize(result.stdout) === normalize(expectedStdout)
        : result.statusId === 3; // Accepted

    const id = await codeRunsRepo.insert({
      answerId,
      language,
      sourceCode,
      stdin: stdin ?? null,
      expectedStdout: expectedStdout ?? null,
      judge0Token: result.token,
      statusId: result.statusId,
      statusDescription: result.statusDescription,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      runtimeMs: result.runtimeMs,
      memoryKb: result.memoryKb,
      passed: passed ? 1 : 0,
    });
    const row = await codeRunsRepo.findById(id);
    return rowToDto(row);
  }

  /**
   * Run the full test suite for an answer. Each case is submitted in
   * sequence (Judge0 free-tier hosts don't love parallel submissions).
   * Returns per-case results + aggregate counts; persists one
   * `assessment_code_runs` row per case so reviewers see the trail.
   */
  async runTestSuite(
    answerId: number,
    language: string,
    sourceCode: string,
    testCases: TestCase[],
  ): Promise<CodeTestSuiteResult> {
    const cases: CodeTestSuiteResult["cases"] = [];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const result = await judge0Client.submitAndWait({
          language,
          sourceCode,
          stdin: tc.input,
          expectedStdout: tc.expectedOutput,
        });
        const passed = normalize(result.stdout) === normalize(tc.expectedOutput);
        await codeRunsRepo.insert({
          answerId,
          language,
          sourceCode,
          stdin: tc.input,
          expectedStdout: tc.expectedOutput,
          judge0Token: result.token,
          statusId: result.statusId,
          statusDescription: result.statusDescription,
          stdout: result.stdout,
          stderr: result.stderr,
          compileOutput: result.compileOutput,
          runtimeMs: result.runtimeMs,
          memoryKb: result.memoryKb,
          passed: passed ? 1 : 0,
        });
        if (passed) passedCount += 1;
        cases.push({
          index: i,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          hidden: !!tc.hidden,
          actualOutput: result.stdout,
          passed,
          runtimeMs: result.runtimeMs,
          error: result.stderr || result.compileOutput || null,
        });
      } catch (err: any) {
        cases.push({
          index: i,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          hidden: !!tc.hidden,
          actualOutput: null,
          passed: false,
          runtimeMs: null,
          error: err?.message || "Judge0 error",
        });
      }
    }

    return {
      cases,
      passedCount,
      totalCount: testCases.length,
      allPassed: passedCount === testCases.length && testCases.length > 0,
    };
  }

  async latestForAnswer(answerId: number): Promise<CodeRunResult | null> {
    const row = await codeRunsRepo.latestForAnswer(answerId);
    return row ? rowToDto(row) : null;
  }
}

export const codeRunsService = new CodeRunsService();
