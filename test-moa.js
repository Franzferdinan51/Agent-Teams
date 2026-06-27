#!/usr/bin/env node
// MoA Minimal Test — uses only the loaded model, sequential calls
// Run with: node test-moa.js

const MoA = require('./moa/moa-runtime.js');

async function main() {
  console.log('🔬 MoA Minimal Test');
  console.log('====================');
  const presets = MoA.listPresets();
  console.log(`Presets: ${presets.map(p => `${p.name}[${p.ref_count}refs]`).join(', ')}`);

  // Test the tiny preset (single model, no parallel loading)
  const preset = 'tiny';
  console.log(`\nTesting "${preset}"...`);

  const result = await MoA.runMoA('What is 2+2? Answer in exactly one word.', preset, []);
  console.log(`Refs: ${result.references.length}`);
  for (const ref of result.references) {
    console.log(`  ${ref.label}: "${ref.text.slice(0, 80)}"`);
  }
  console.log(`\nAggregator: "${result.response.slice(0, 200)}"`);

  if (!result.response.trim() || result.response.startsWith('[error')) {
    console.log('\n⚠️  Empty or error response — likely no model loaded in LM Studio');
    console.log('  Load qwythos-9b-claude-mythos-5-1m in LM Studio first, then re-run.');
    process.exit(1);
  }

  console.log('\n✅ MoA wired and working!');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
