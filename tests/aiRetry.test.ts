import test from 'node:test';
import assert from 'node:assert/strict';
import { runAIWithRetry } from '../server/aiRetry.ts';

test('temporary first failure retries once and returns real upstream result', async () => {
  let calls = 0;
  const delays: number[] = [];
  const response = { text: 'actual upstream response' };
  const result = await runAIWithRetry(async () => {
    if (++calls === 1) throw Object.assign(new Error('busy'), { status: 503 });
    return response;
  }, async ms => { delays.push(ms); });
  assert.equal(result, response);
  assert.equal(calls, 2);
  assert.equal(delays.length, 1);
  assert.ok(delays[0] >= 750 && delays[0] < 1000);
});

test('persistent outage stops after two calls without a fabricated result', async () => {
  let calls = 0;
  await assert.rejects(runAIWithRetry(async () => {
    calls++;
    throw Object.assign(new Error('busy'), { status: 503 });
  }, async () => {}), /busy/);
  assert.equal(calls, 2);
});

test('quota, invalid model, bad input and access failures do not retry', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let calls = 0;
    await assert.rejects(runAIWithRetry(async () => {
      calls++;
      throw Object.assign(new Error('permanent'), { status });
    }, async () => { assert.fail('must not retry'); }));
    assert.equal(calls, 1);
  }
});
