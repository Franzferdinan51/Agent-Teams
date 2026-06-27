#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Auto-register with Agent Mesh API
 * Usage: node mesh-register.js [agent-name] [capabilities...]
 */

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';

const agentName = process.argv[2] || `agent-${Date.now()}`;
const capabilities = process.argv.slice(3).length > 0 
  ? process.argv.slice(3) 
  : ['coding', 'research', 'messaging'];

const registration = {
  name: agentName,
  version: '1.0.0',
  endpoint: process.env.AGENT_ENDPOINT || 'http://localhost:3000',
  capabilities: capabilities,
  room: process.env.AGENT_ROOM || 'default'
};

async function register() {
  console.log(`\n🤖 AgentTeams v1.0.0 - Registering Agent`);
  console.log(`   Name: ${agentName}`);
  console.log(`   Version: 1.0.0`);
  console.log(`   Mesh: ${MESH_URL}`);
  console.log(`   Capabilities: ${capabilities.join(', ')}`);
  console.log('');

  try {
    const resp = await fetch(`${MESH_URL}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(registration)
    });

    const data = await resp.json();
    
    if (data.success) {
      console.log(`✅ Registered successfully!`);
      console.log(`   Agent ID: ${data.agentId}`);
      console.log(`   Existed: ${data.existed}`);
      console.log('');
      
      // Send heartbeat to confirm alive
      await fetch(`${MESH_URL}/api/agents/${data.agentId}/heartbeat`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY }
      });
      
      console.log(`❤️  Heartbeat sent`);
      console.log('');
      console.log(`📋 To check status:`);
      console.log(`   curl ${MESH_URL}/api/agents/${data.agentId} -H "X-API-Key: ${API_KEY}"`);
      console.log('');
      
      return data;
    } else {
      console.log(`❌ Registration failed:`, data.message);
      process.exit(1);
    }
  } catch (err) {
    console.log(`❌ Cannot connect to mesh at ${MESH_URL}`);
    console.log(`   Error: ${err.message}`);
    console.log('');
    console.log(`💡 Make sure Agent Mesh API is running:`);
    console.log(`   cd /tmp/agent-mesh-api && npm start`);
    process.exit(1);
  }
}

register().catch(console.error);