import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSpotStatus } from '../server/reportStatus.ts';
import { parsePhoto, parseRecommendations, withTimeout, aiError } from '../server/validation.ts';
import type { SpotReport } from '../src/types.ts';

const report = (overrides: Partial<SpotReport> = {}): SpotReport => ({id:'test',spotId:'library',crowd:'light',noise:'quiet',outlets:'unknown',timestamp:Date.now(),...overrides});
test('stale and future reports do not count as live conditions', () => {
  const result = computeSpotStatus('library', [report({timestamp:Date.now()-3600001}),report({timestamp:Date.now()+60000})]);
  assert.equal(result.hasRecentReports,false);
  assert.equal(result.currentStatus,null);
});
test('unknown outlets never become an invented outlet rating', () => {
  assert.equal(computeSpotStatus('library',[report()]).currentStatus?.outlets,'unknown');
  assert.equal(computeSpotStatus('library',[report(),report({outlets:'none',timestamp:Date.now()-1000})]).currentStatus?.outlets,'none');
});
test('malformed and incomplete photo results fail instead of inventing findings', () => {
  assert.throws(()=>parsePhoto('not json'));
  assert.throws(()=>parsePhoto('{}'));
  const p = parsePhoto(JSON.stringify({visibleSeatsEstimate:'2 visible seats',lighting:'window light',visibleOutlets:'Not visible',suggestedOutletAvailability:'none',suggestedCrowdLevel:'empty'}));
  assert.equal(p.suggestedOutletAvailability,null);
  assert.equal(p.suggestedCrowdLevel,null);
});
test('recommendations reject invented locations, duplicates, and empty responses', () => {
  const spots=[{id:'library',name:'Campus Library',floorsOrZones:['Lobby']}];
  const rec={spotId:'library',spotName:'Wrong name',rank:99,badge:'Study',rationale:'No current reports',dataFreshnessNote:'No reports',recommendedZone:'Invented floor'};
  assert.throws(()=>parseRecommendations('{}',spots));
  assert.throws(()=>parseRecommendations(JSON.stringify({summary:'Test',recommendations:[{...rec,spotId:'fake'}]}),spots));
  assert.throws(()=>parseRecommendations(JSON.stringify({summary:'Test',recommendations:[rec,rec]}),spots));
  const result=parseRecommendations(JSON.stringify({summary:'Test',recommendations:[rec]}),spots);
  assert.equal(result.recommendations[0].spotName,'Campus Library');
  assert.equal(result.recommendations[0].rank,1);
  assert.equal(result.recommendations[0].recommendedZone,undefined);
});
test('network timeout is bounded and rejected writes remain failures', async () => {
  await assert.rejects(withTimeout(new Promise(()=>{}),10),/timed out/);
  await assert.rejects(withTimeout(Promise.reject(new Error('permission denied')),20),/permission denied/);
  assert.equal(await withTimeout(Promise.resolve('saved')),'saved');
});
test('quota, model, and permission errors have distinct messages', () => {
  assert.match(aiError({status:429}),/quota/);
  assert.match(aiError({status:404}),/model/);
  assert.match(aiError({status:403}),/API key/);
  assert.match(aiError({status:503}),/busy/);
});
