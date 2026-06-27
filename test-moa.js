const MoA = require('./moa/moa-runtime.js');
async function test() {
  console.log('=== MoA End-to-End Test ===');
  console.log('Presets:', MoA.listPresets().map(p => `${p.name} [${p.enabled?'ON':'OFF'}] refs=${p.ref_count}`).join(', '));
  console.log('\nRunning MoA...');
  const result = await MoA.runMoA('What is 2+2? Answer in one word.', 'default', []);
  console.log('Preset:', result.preset, '| Aggregator:', result.aggregator);
  console.log('Ref count:', result.references.length);
  result.references.forEach((r,i) => console.log('  ['+i+']', r.label, '->', r.text.slice(0,120)));
  console.log('Response:', result.response.slice(0,250));
  console.log('\n=== Test PASSED ===');
}
test().catch(e => { console.error('TEST FAILED:', e.message); process.exit(1); });
