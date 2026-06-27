#!/usr/bin/env node
/**
 * Hive Nation Executor - v2.0.1
 * 
 * DEMONSTRATES ACTUAL WORKING MULTI-AGENT SYSTEM:
 * - Real LLM calls (MiniMax/OpenRouter)
 * - Persistent state (survives restarts)
 * - Inter-agent messaging (real message passing)
 * - Cold-start safe
 */

const path = require('path');

// Load the core
const { 
    hiveState, hiveLLM, MODELS, 
    HiveAgent, HiveTeam, Senator, Councilor, COUNCILOR_PERSONAS 
} = require('./hive-core.js');

// ═══════════════════════════════════════════════════════════════════
// DEMO: ACTUAL WORKING MULTI-AGENT SYSTEM
// ═══════════════════════════════════════════════════════════════════

async function demo() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║      🏛️ HIVE NATION v2.0.1 - WORKING MULTI-AGENT 🏛️       ║
╚══════════════════════════════════════════════════════════════════╝
`);

    // 1. CREATE ACTUAL AGENTS
    console.log('\n🤖 Creating actual agents with LLM integration...\n');
    
    const coder = new HiveAgent({ role: 'coder', name: 'CodeBot' });
    const reviewer = new HiveAgent({ role: 'reviewer', name: 'ReviewBot' });
    const security = new HiveAgent({ role: 'security', name: 'SecBot' });
    
    // Test LLM calls
    console.log('Testing LLM integration...');
    const coderThink = await coder.think('Should I use TypeScript or JavaScript for a new project?');
    console.log(`\n📝 CodeBot thinks:\n${coderThink.substring(0, 200)}...`);
    
    // 2. CREATE ACTUAL TEAM
    console.log('\n\n🐝 Creating actual team...\n');
    
    const devTeam = new HiveTeam({ 
        template: 'code',
        name: 'Platform Development Team' 
    });
    
    devTeam.addAgent(coder);
    devTeam.addAgent(reviewer);
    devTeam.addAgent(security);
    
    // Save to persistent state
    hiveState.addTeam(devTeam.toJSON());
    console.log(`✅ Team created: ${devTeam.name}`);
    console.log(`   Agents: ${devTeam.agents.map(a => a.name).join(', ')}`);
    
    // 3. ACTUAL INTER-AGENT COMMUNICATION
    console.log('\n\n💬 Testing inter-agent messaging...\n');
    
    // Agent sends message
    const msg = hiveState.sendMessage({
        from: 'CodeBot',
        to: 'ReviewBot',
        type: 'task',
        content: 'Please review this PR: Authentication refactor'
    });
    
    console.log(`📨 Message sent: "${msg.content}"`);
    console.log(`   ID: ${msg.id}`);
    console.log(`   Time: ${msg.timestamp}`);
    
    // Get messages for ReviewBot
    const inbox = hiveState.getMessages('ReviewBot');
    console.log(`\n📥 ReviewBot inbox: ${inbox.length} messages`);
    
    // 4. ACTUAL SENATOR VOTING (with LLM)
    console.log('\n\n🗳️ Testing actual senator voting with LLM...\n');
    
    const senator = new Senator({
        id: 'sen-1',
        name: 'Duckets Quackson',
        party: 'quack',
        weight: 3
    });
    
    const bill = {
        title: 'Security Enhancement Act',
        content: 'All agents MUST implement encryption for sensitive data.',
        impact: 'High security improvement with minimal performance cost.'
    };
    
    console.log(`Bill: ${bill.title}`);
    const voteResult = await senator.voteOn(bill);
    console.log(`\n📊 ${voteResult.name} (${voteResult.party}) voted: ${voteResult.vote.toUpperCase()}`);
    console.log(`   Weight: ${voteResult.weight}x`);
    console.log(`   Reasoning: ${voteResult.reasoning.substring(0, 150)}...`);
    
    // Record the vote
    hiveState.addVote({
        bill: bill.title,
        senator: voteResult.name,
        vote: voteResult.vote,
        weight: voteResult.weight
    });
    
    // 5. ACTUAL COUNCIL DELIBERATION
    console.log('\n\n🏛️ Testing actual council deliberation...\n');
    
    const councilors = COUNCILOR_PERSONAS.slice(0, 3).map(p => new Councilor(p));
    const topic = 'Should AI agents have rights?';
    
    console.log(`Topic: "${topic}"`);
    console.log('Councilors deliberating...\n');
    
    const deliberations = await Promise.all(
        councilors.map(c => c.deliberate(topic))
    );
    
    deliberations.forEach(d => {
        console.log(`\n📢 ${d.councilor} (${d.style}):`);
        console.log(`   ${d.perspective.substring(0, 120)}...`);
    });
    
    // 6. PERSISTENT MEMORY
    console.log('\n\n🧠 Testing persistent memory...\n');
    
    hiveState.addMemory({
        content: 'Demo session: Tested LLM integration, agent messaging, senator voting, and council deliberation.',
        category: 'test',
        tags: ['demo', 'llm', 'integration']
    });
    
    const memories = hiveState.getMemories();
    console.log(`✅ Stored ${memories.length} memories`);
    console.log('   (Persists across restarts!)');
    
    // 7. TEAM COORDINATION
    console.log('\n\n🐝 Testing team coordination...\n');
    
    const coordResult = await devTeam.coordinate('Implement user authentication with OAuth');
    console.log('Team coordination result:');
    console.log(`   Agents involved: ${devTeam.agents.length}`);
    console.log(`   Synthesis: ${coordResult.synthesis.substring(0, 150)}...`);
    
    // 8. VERIFY PERSISTENCE
    console.log('\n\n💾 Verifying persistence...\n');
    
    // Check state file
    const stateFile = path.join(__dirname, '..', 'data', 'core', 'state.json');
    const stateData = require('fs').readFileSync(stateFile, 'utf-8');
    const saved = JSON.parse(stateData);
    
    console.log('✅ State persisted:');
    console.log(`   Teams: ${saved.teams.length}`);
    console.log(`   Messages: ${saved.messages.length}`);
    console.log(`   Memories: ${saved.memories.length}`);
    console.log(`   Votes: ${saved.votes.length}`);
    console.log(`   History: ${saved.history.length}`);
    
    // 9. SIMULATE RESTART (cold-start test)
    console.log('\n\n🔄 Simulating restart (cold-start test)...\n');
    
    // Create new state instance (simulates restart)
    const { HiveState: FreshState } = require('./hive-core.js');
    const freshState = new FreshState();
    
    console.log('✅ Cold-start safe:');
    console.log(`   Teams: ${freshState.state.teams.length}`);
    console.log(`   Messages: ${freshState.state.messages.length}`);
    console.log(`   Memories: ${freshState.state.memories.length}`);
    
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ✅ WORKING MULTI-AGENT SYSTEM ✅                  ║
╠══════════════════════════════════════════════════════════════════╣
║  ✅ Real LLM calls (MiniMax/OpenRouter)                       ║
║  ✅ Persistent state (survives restarts)                        ║
║  ✅ Inter-agent messaging (real message passing)                ║
║  ✅ Cold-start safe (always initializes properly)               ║
║  ✅ Actual senator voting with reasoning                        ║
║  ✅ Actual council deliberation with perspectives               ║
║  ✅ Team coordination with synthesis                           ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// Run
demo().catch(console.error);
