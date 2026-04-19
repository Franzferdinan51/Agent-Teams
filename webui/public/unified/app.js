// Hive Nation v2.1.0 - Enhanced WebUI with All Features
// Features: Overview, Council, Live, Agents, Tools, Settings

const { createApp, ref, onMounted, onUnmounted } = Vue;

const API = {
    base: '',
    status: () => fetch('/api/status').then(r => r.json()).catch(() => null),
    council: () => fetch('/api/council').then(r => r.json()).catch(() => null),
    councilors: () => fetch('/api/councilors').then(r => r.json()).catch(() => ({councilors:[]})),
    session: () => fetch('/api/council/session').then(r => r.json()).catch(() => null),
    messages: () => fetch('/api/council/messages').then(r => r.json()).catch(() => ({messages:[]})),
    llm: () => fetch('/api/llm/status').then(r => r.json()).catch(() => null),
    health: () => fetch('/api/health').then(r => r.json()).catch(() => null),
};

const app = createApp({
    setup() {
        // Tab state
        const currentTab = ref('overview');
        
        // Overview data
        const systemStatus = ref({});
        const services = ref([]);
        const metrics = ref({cpu: 0, memory: 0, uptime: 0});
        
        // Council data
        const councilConnected = ref(false);
        const session = ref(null);
        const messages = ref([]);
        const councilors = ref([]);
        const votes = ref({yeas: 0, nays: 0});
        const phase = ref('idle');
        
        // Agent data
        const agents = ref([]);
        const meshStatus = ref('disconnected');
        
        // LLM providers
        const providers = ref([]);
        const currentProvider = ref('minimax');
        
        // Settings
        const theme = ref('midnight');
        const themes = {
            midnight: { bg: '#0a0a0f', surface: '#111118', accent: '#6366f1' },
            hive: { bg: '#0a0e17', surface: '#111827', accent: '#f59e0b' },
            forest: { bg: '#0a120a', surface: '#0f1a0f', accent: '#4ade80' }
        };
        
        // Polling
        let pollTimer = null;
        
        const startPolling = () => {
            pollTimer = setInterval(async () => {
                const [sys, council, ses, msgs, llm] = await Promise.all([
                    API.status(),
                    API.council(),
                    API.session(),
                    API.messages(),
                    API.llm()
                ]);
                
                if (sys) systemStatus.value = sys;
                if (council) councilConnected.value = council.connected;
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
            }, 3000);
        };
        
        const stopPolling = () => {
            if (pollTimer) clearInterval(pollTimer);
        };
        
        onMounted(() => {
            startPolling();
        });
        
        onUnmounted(() => {
            stopPolling();
        });
        
        // Actions
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
        
        const setTheme = (t) => {
            theme.value = t;
            const colors = themes[t];
            if (colors) {
                document.documentElement.style.setProperty('--bg', colors.bg);
                document.documentElement.style.setProperty('--surface', colors.surface);
                document.documentElement.style.setProperty('--accent', colors.accent);
            }
        };
        
        return {
            currentTab, systemStatus, services, metrics,
            councilConnected, session, messages, councilors, votes, phase,
            agents, meshStatus, providers, currentProvider, theme,
            startDeliberation, switchProvider, setTheme
        };
    },
    
    template: `
    <div class="hn-app">
        <!-- Header -->
        <header class="hn-header">
            <div class="hn-logo">🏛️</div>
            <div class="hn-title">Hive Nation v2.1.0</div>
            <div class="hn-status">
                <span class="dot" :class="councilConnected ? 'green' : 'red'"></span>
                Council: {{ councilConnected ? 'Online' : 'Offline' }}
            </div>
        </header>
        
        <!-- Tab Navigation -->
        <nav class="hn-nav">
            <button @click="currentTab='overview'" :class="{active: currentTab==='overview'}">📊 Overview</button>
            <button @click="currentTab='council'" :class="{active: currentTab==='council'}">⚖️ Council</button>
            <button @click="currentTab='live'" :class="{active: currentTab==='live'}">📡 Live</button>
            <button @click="currentTab='agents'" :class="{active: currentTab==='agents'}">🤖 Agents</button>
            <button @click="currentTab='tools'" :class="{active: currentTab==='tools'}">🛠️ Tools</button>
            <button @click="currentTab='settings'" :class="{active: currentTab==='settings'}">⚙️ Settings</button>
        </nav>
        
        <!-- Main Content -->
        <main class="hn-main">
            
            <!-- Overview Tab -->
            <div v-if="currentTab==='overview'" class="tab-panel">
                <h2>📊 System Overview</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Councilors</div>
                        <div class="stat-value">{{ councilors.length || 46 }}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Session Phase</div>
                        <div class="stat-value" :class="phase">{{ phase.toUpperCase() }}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Messages</div>
                        <div class="stat-value">{{ messages.length }}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Votes</div>
                        <div class="stat-value">{{ votes.yeas }}/{{ votes.nays }}</div>
                    </div>
                </div>
                
                <div class="services-list">
                    <h3>Services</h3>
                    <div class="service-item">
                        <span class="dot green"></span>
                        <span>Council API (3007)</span>
                        <span class="status">Online</span>
                    </div>
                    <div class="service-item">
                        <span class="dot green"></span>
                        <span>Hive WebUI (3131)</span>
                        <span class="status">Online</span>
                    </div>
                    <div class="service-item">
                        <span class="dot yellow"></span>
                        <span>OpenClaw Gateway</span>
                        <span class="status">Check</span>
                    </div>
                </div>
            </div>
            
            <!-- Council Tab -->
            <div v-if="currentTab==='council'" class="tab-panel">
                <div class="section-header">
                    <h2>⚖️ AI Council</h2>
                    <button @click="startDeliberation('Test Deliberation')" class="btn-primary">🚀 Start</button>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{{ councilors.length }}</div>
                        <div class="stat-label">Councilors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ session?.stats?.messages || 0 }}</div>
                        <div class="stat-label">Messages</div>
                    </div>
                    <div class="stat-card" :class="{success: phase==='voting'}">
                        <div class="stat-value">{{ phase.toUpperCase() }}</div>
                        <div class="stat-label">Phase</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ votes.yeas }}/{{ votes.nays }}</div>
                        <div class="stat-label">Yeas/Nays</div>
                    </div>
                </div>
                
                <div class="councilor-section">
                    <h3>Council Members</h3>
                    <div class="councilor-grid">
                        <div v-for="c in councilors.slice(0,20)" :key="c.id" class="councilor-card">
                            <div class="councilor-avatar">{{ c.name?.charAt(0) }}</div>
                            <div class="councilor-name">{{ c.name }}</div>
                            <div class="councilor-role">{{ c.role }}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Live Tab -->
            <div v-if="currentTab==='live'" class="tab-panel">
                <h2>📡 Live Deliberation</h2>
                <div class="live-phase">{{ phase.toUpperCase() }}</div>
                <div class="live-votes">
                    <span class="yea">{{ votes.yeas }} YEAS</span>
                    <span class="nay">{{ votes.nays }} NAYS</span>
                </div>
                <div class="live-feed">
                    <div v-for="m in messages.slice(-10)" :key="m.id" class="live-message">
                        <strong>{{ m.councilor }}:</strong>
                        <span>{{ m.content?.substring(0,150) }}</span>
                    </div>
                    <div v-if="messages.length===0" class="empty">No active deliberation</div>
                </div>
            </div>
            
            <!-- Agents Tab -->
            <div v-if="currentTab==='agents'" class="tab-panel">
                <h2>🤖 Agent Teams</h2>
                <div class="agents-status">
                    <div>Mesh Status: {{ meshStatus }}</div>
                </div>
                <div class="agents-grid">
                    <div class="agent-card">
                        <div class="agent-icon">🏛️</div>
                        <div class="agent-name">Council</div>
                        <div class="agent-status">Active</div>
                    </div>
                    <div class="agent-card">
                        <div class="agent-icon">🎯</div>
                        <div class="agent-name">Senate</div>
                        <div class="agent-status">Available</div>
                    </div>
                    <div class="agent-card">
                        <div class="agent-icon">⚡</div>
                        <div class="agent-name">Swarm</div>
                        <div class="agent-status">Available</div>
                    </div>
                </div>
            </div>
            
            <!-- Tools Tab -->
            <div v-if="currentTab==='tools'" class="tab-panel">
                <h2>🛠️ Tools</h2>
                <p>MCP Tools available via port 3001</p>
                <div class="tool-list">
                    <div class="tool-item">Council Status</div>
                    <div class="tool-item">Council Deliberate</div>
                    <div class="tool-item">Council Messages</div>
                    <div class="tool-item">LLM Provider</div>
                </div>
            </div>
            
            <!-- Settings Tab -->
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
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Theme</h3>
                    <div class="theme-grid">
                        <button @click="setTheme('midnight')" :class="{active: theme==='midnight'}">🌙 Midnight</button>
                        <button @click="setTheme('hive')" :class="{active: theme==='hive'}">🏛️ Hive</button>
                        <button @click="setTheme('forest')" :class="{active: theme==='forest'}">🌲 Forest</button>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Connection Status</h3>
                    <div class="connection-list">
                        <div>Council API: {{ councilConnected ? 'Connected' : 'Disconnected' }}</div>
                        <div>WebUI: Connected</div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    `
});

app.mount('#root');
