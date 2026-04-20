// Hive Nation v2.1.0 - With Connections Tab
const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

const API = {
    base: '',
    status: () => fetch('/api/status').then(r => r.json()).catch(() => null),
    council: () => fetch('/api/council').then(r => r.json()).catch(() => null),
    councilors: () => fetch('/api/councilors').then(r => r.json()).catch(() => ({councilors:[]})),
    session: () => fetch('/api/council/session').then(r => r.json()).catch(() => null),
    messages: () => fetch('/api/council/messages').then(r => r.json()).catch(() => ({messages:[]})),
    llm: () => fetch('/api/llm/status').then(r => r.json()).catch(() => null),
    health: () => fetch('/api/health').then(r => r.json()).catch(() => null),
    mesh: () => fetch('/api/mesh/status').then(r => r.json()).catch(() => null),
    agents: () => fetch('/api/mesh/agents').then(r => r.json()).catch(() => []),
};

const app = createApp({
    setup() {
        const currentTab = ref('connections');
        const councilConnected = ref(false);
        const session = ref(null);
        const messages = ref([]);
        const councilors = ref([]);
        const votes = ref({yeas: 0, nays: 0});
        const phase = ref('idle');
        const providers = ref([]);
        const currentProvider = ref('minimax');
        const theme = ref('hive');
        
        // Mesh/Connections
        const meshStatus = ref('disconnected');
        const meshAgents = ref([]);
        const services = ref([]);
        
        let pollTimer = null;
        
        const startPolling = () => {
            pollTimer = setInterval(async () => {
                const [council, ses, msgs, llm, mesh, agents, status] = await Promise.all([
                    API.council(),
                    API.session(),
                    API.messages(),
                    API.llm(),
                    API.mesh().catch(() => null),
                    API.agents().catch(() => []),
                    API.status().catch(() => null)
                ]);
                
                councilConnected.value = council?.connected || false;
                
                if (ses?.session) {
                    session.value = ses.session;
                    phase.value = ses.session.phase || 'idle';
                    votes.value = ses.session.stats || {yeas: 0, nays: 0};
                }
                
                if (msgs?.messages) messages.value = msgs.messages;
                if (llm?.providers) {
                    providers.value = llm.providers;
                    currentProvider.value = llm.current;
                }
                
                if (mesh) {
                    meshStatus.value = mesh.status || 'unknown';
                    meshAgents.value = mesh.agents || agents || [];
                }
                
                // Build services list
                services.value = [
                    { name: 'Hive WebUI', port: 3131, status: 'online', type: 'web' },
                    { name: 'Council API', port: 3007, status: councilConnected.value ? 'online' : 'offline', type: 'api' },
                    { name: 'Full API + MCP', port: 3001, status: 'online', type: 'api' },
                    { name: 'OpenClaw Gateway', port: 18789, status: 'check', type: 'gateway' },
                    { name: 'LM Studio', port: 1234, status: 'unknown', type: 'llm' },
                ];
                
            }, 3000);
        };
        
        onMounted(() => startPolling());
        onUnmounted(() => pollTimer && clearInterval(pollTimer));
        
        const startDeliberation = async (topic) => {
            await fetch('/api/council/deliberate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({topic, mode: 'proposal'})
            });
        };
        
        const switchProvider = async (p) => {
            await fetch('/api/llm/provider', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({provider: p})
            });
            currentProvider.value = p;
        };
        
        const checkService = async (service) => {
            if (service.port === 3131) {
                const res = await fetch('/api/health').catch(() => null);
                return res ? 'online' : 'offline';
            }
            if (service.port === 3007) {
                const res = await fetch('http://localhost:3007/api/health').catch(() => null);
                return res ? 'online' : 'offline';
            }
            if (service.port === 3001) {
                const res = await fetch('http://localhost:3001/api/health').catch(() => null);
                return res ? 'online' : 'offline';
            }
            if (service.port === 18789) {
                const res = await fetch('http://localhost:18789/health').catch(() => null);
                return res ? 'online' : 'offline';
            }
            return 'unknown';
        };
        
        return {
            currentTab, councilConnected, session, messages, councilors, votes, phase,
            providers, currentProvider, theme, startDeliberation, switchProvider,
            meshStatus, meshAgents, services, checkService
        };
    },
    
    template: `
    <div class="hn-app">
        <header class="hn-header">
            <div class="hn-logo">🏛️</div>
            <div class="hn-title">Hive Nation v2.1.0</div>
            <div class="hn-status">
                <span class="dot" :class="councilConnected ? 'green' : 'red'"></span>
                {{ councilConnected ? 'Council Online' : 'Offline' }}
            </div>
        </header>
        
        <nav class="hn-nav">
            <button @click="currentTab='overview'" :class="{active: currentTab==='overview'}">📊 Overview</button>
            <button @click="currentTab='council'" :class="{active: currentTab==='council'}">⚖️ Council</button>
            <button @click="currentTab='connections'" :class="{active: currentTab==='connections'}">🔗 Connections</button>
            <button @click="currentTab='live'" :class="{active: currentTab==='live'}">📡 Live</button>
            <button @click="currentTab='settings'" :class="{active: currentTab==='settings'}">⚙️ Settings</button>
        </nav>
        
        <main class="hn-main">
            
            <!-- Overview -->
            <div v-if="currentTab==='overview'" class="tab-panel">
                <h2>📊 System Overview</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{{ councilors.length || 46 }}</div>
                        <div class="stat-label">Councilors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" :class="phase">{{ phase.toUpperCase() }}</div>
                        <div class="stat-label">Phase</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ services.filter(s=>s.status==='online').length }}/{{ services.length }}</div>
                        <div class="stat-label">Services</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ meshAgents.length || 0 }}</div>
                        <div class="stat-label">Agents</div>
                    </div>
                </div>
                
                <div class="quick-links">
                    <a href="/council" target="_blank" class="btn-primary">🏛️ Full Council WebUI</a>
                </div>
                
                <div class="services-list">
                    <h3>Services</h3>
                    <div v-for="s in services" :key="s.name" class="service-item">
                        <span class="dot" :class="s.status"></span>
                        <span>{{ s.name }} ({{ s.port }})</span>
                        <span class="status">{{ s.status }}</span>
                    </div>
                </div>
            </div>
            
            <!-- Council -->
            <div v-if="currentTab==='council'" class="tab-panel">
                <h2>⚖️ AI Council</h2>
                <div class="council-cta">
                    <a href="/council" target="_blank" class="btn-large">🏛️ Launch Full Council Chamber</a>
                    <p>Access 46+ councilors, deliberation, voting, and more</p>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{{ councilors.length || 46 }}</div>
                        <div class="stat-label">Councilors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ phase.toUpperCase() }}</div>
                        <div class="stat-label">Phase</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ votes.yeas }}/{{ votes.nays }}</div>
                        <div class="stat-label">Yeas/Nays</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ messages.length }}</div>
                        <div class="stat-label">Messages</div>
                    </div>
                </div>
            </div>
            
            <!-- CONNECTIONS TAB -->
            <div v-if="currentTab==='connections'" class="tab-panel">
                <h2>🔗 System Connections</h2>
                
                <!-- Architecture Diagram -->
                <div class="architecture-box">
                    <h3>🏗️ Architecture</h3>
                    <pre class="arch-diagram">
┌─────────────────────────────────────────────────────────────────┐
│                      HIVE NATION v2.1.0                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │  BROWSER    │───▶│  Hive WebUI (3131)                    │  │
│  │  Client     │    │  • Overview Dashboard                  │  │
│  └──────────────┘    │  • Connections Status                 │  │
│                      │  • Quick Actions                       │  │
│                      └──────────────┬───────────────────────────┘  │
│                                     │                              │
│              ┌──────────────────────┼──────────────────────┐      │
│              ▼                      ▼                      ▼      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Council API     │  │  Full API + MCP  │  │  OpenClaw       │ │
│  │  (3007)          │  │  (3001)          │  │  Gateway        │ │
│  │  • 46 Councilors │  │  • 55 Tools      │  │  (18789)        │ │
│  │  • Deliberation  │  │  • Agent Control │  │  • Duck CLI     │ │
│  │  • Voting        │  │  • Mesh API      │  │  • Tools        │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           │                    │                    │          │
│           ▼                    ▼                    ▼          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  MiniMax API     │  │  LM Studio       │  │  Kimi/Other    │ │
│  │  (Primary LLM)   │  │  (Local Fallback)│  │  Providers     │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                    </pre>
                </div>
                
                <!-- Service Grid -->
                <div class="connections-grid">
                    <h3>🌐 Active Services</h3>
                    <div class="service-grid">
                        <div v-for="s in services" :key="s.name" class="service-card" :class="s.status">
                            <div class="service-icon">
                                <span v-if="s.type==='web'">🌐</span>
                                <span v-else-if="s.type==='api'">⚡</span>
                                <span v-else-if="s.type==='gateway'">🦆</span>
                                <span v-else-if="s.type==='llm'">🤖</span>
                                <span v-else>📡</span>
                            </div>
                            <div class="service-name">{{ s.name }}</div>
                            <div class="service-port">:{{ s.port }}</div>
                            <div class="service-status" :class="s.status">{{ s.status }}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Cross-Connections -->
                <div class="cross-connections">
                    <h3>🔄 Cross-Connections</h3>
                    <div class="connection-flow">
                        <div class="flow-item">
                            <span class="flow-icon">🌐</span>
                            <span class="flow-label">WebUI → Council</span>
                            <span class="flow-status active">Active</span>
                        </div>
                        <div class="flow-item">
                            <span class="flow-icon">🌐</span>
                            <span class="flow-label">WebUI → MCP</span>
                            <span class="flow-status active">Active</span>
                        </div>
                        <div class="flow-item">
                            <span class="flow-icon">⚡</span>
                            <span class="flow-label">Council → MiniMax</span>
                            <span class="flow-status active">Active</span>
                        </div>
                        <div class="flow-item">
                            <span class="flow-icon">⚡</span>
                            <span class="flow-label">MCP → LM Studio</span>
                            <span class="flow-status active">Active</span>
                        </div>
                        <div class="flow-item">
                            <span class="flow-icon">🦆</span>
                            <span class="flow-label">Gateway → Tools</span>
                            <span class="flow-status active">Active</span>
                        </div>
                        <div class="flow-item">
                            <span class="flow-icon">🔗</span>
                            <span class="flow-label">Mesh Network</span>
                            <span class="flow-status">Ready</span>
                        </div>
                    </div>
                </div>
                
                <!-- Provider Chain -->
                <div class="provider-chain">
                    <h3>🤖 LLM Provider Chain</h3>
                    <div class="chain-flow">
                        <div v-for="(p, i) in providers" :key="p.id" class="chain-item">
                            <span class="chain-num">{{ i + 1 }}</span>
                            <span class="chain-name">{{ p.name }}</span>
                            <span v-if="p.active" class="chain-active">Primary ✅</span>
                            <span v-else class="chain-fallback">Fallback</span>
                        </div>
                        <div v-if="providers.length === 0" class="chain-item">
                            <span class="chain-num">1</span>
                            <span class="chain-name">MiniMax</span>
                            <span class="chain-active">Primary ✅</span>
                        </div>
                        <div class="chain-item">
                            <span class="chain-num">2</span>
                            <span class="chain-name">LM Studio</span>
                            <span class="chain-fallback">Local</span>
                        </div>
                        <div class="chain-item">
                            <span class="chain-num">3</span>
                            <span class="chain-name">OpenRouter</span>
                            <span class="chain-fallback">Free Tier</span>
                        </div>
                    </div>
                </div>
                
                <!-- MCP Tools -->
                <div class="mcp-tools">
                    <h3>🛠️ MCP Tools (55 available)</h3>
                    <div class="tools-grid">
                        <div class="tool-tag">council:status</div>
                        <div class="tool-tag">council:deliberate</div>
                        <div class="tool-tag">council:list</div>
                        <div class="tool-tag">council:providers</div>
                        <div class="tool-tag">council:modes</div>
                        <div class="tool-tag">llm:test</div>
                        <div class="tool-tag">llm:provider</div>
                        <div class="tool-tag">mesh:agents</div>
                        <div class="tool-tag">mesh:health</div>
                        <div class="tool-tag">+ 46 more</div>
                    </div>
                </div>
            </div>
            
            <!-- Live -->
            <div v-if="currentTab==='live'" class="tab-panel">
                <h2>📡 Live Deliberation</h2>
                <div class="live-phase">{{ phase.toUpperCase() }}</div>
                <div class="live-votes">
                    <span class="yea">✓ {{ votes.yeas }} YEAS</span>
                    <span class="nay">✗ {{ votes.nays }} NAYS</span>
                </div>
                <div class="live-feed">
                    <div v-for="m in messages.slice(-10)" :key="m.id" class="live-message">
                        <strong>{{ m.councilor }}:</strong> {{ m.content?.substring(0,150) }}
                    </div>
                    <div v-if="messages.length===0" class="empty">No active deliberation</div>
                </div>
            </div>
            
            <!-- Settings -->
            <div v-if="currentTab==='settings'" class="tab-panel">
                <h2>⚙️ Settings</h2>
                <div class="settings-section">
                    <h3>LLM Provider</h3>
                    <div class="provider-grid">
                        <button v-for="p in providers" :key="p.id" 
                            @click="switchProvider(p.id)"
                            :class="{active: currentProvider===p.id}"
                            class="provider-btn">
                            {{ p.name }} {{ p.active ? '✅' : '' }}
                        </button>
                        <button v-if="providers.length===0" @click="switchProvider('minimax')"
                            class="provider-btn active">MiniMax ✅</button>
                        <button @click="switchProvider('lmstudio')" class="provider-btn">LM Studio</button>
                        <button @click="switchProvider('openrouter')" class="provider-btn">OpenRouter</button>
                    </div>
                </div>
                <div class="settings-section">
                    <h3>Connection</h3>
                    <div>Council: {{ councilConnected ? 'Connected' : 'Disconnected' }}</div>
                </div>
            </div>
        </main>
    </div>
    `
});

app.mount('#root');
