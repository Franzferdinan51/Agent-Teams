// Hive Nation v2.1.0 - Enhanced WebUI with Full Council Link
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
        const currentTab = ref('overview');
        const councilConnected = ref(false);
        const session = ref(null);
        const messages = ref([]);
        const councilors = ref([]);
        const votes = ref({yeas: 0, nays: 0});
        const phase = ref('idle');
        const providers = ref([]);
        const currentProvider = ref('minimax');
        const theme = ref('hive');
        
        let pollTimer = null;
        
        const startPolling = () => {
            pollTimer = setInterval(async () => {
                const [council, ses, msgs, llm] = await Promise.all([
                    API.council(),
                    API.session(),
                    API.messages(),
                    API.llm()
                ]);
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
        
        return {
            currentTab, councilConnected, session, messages, councilors, votes, phase,
            providers, currentProvider, theme, startDeliberation, switchProvider
        };
    },
    
    template: `
    <div class="hn-app">
        <header class="hn-header">
            <div class="hn-logo">🏛️</div>
            <div class="hn-title">Hive Nation v2.1.0</div>
            <div class="hn-status">
                <span class="dot" :class="councilConnected ? 'green' : 'red'"></span>
                {{ councilConnected ? 'Online' : 'Offline' }}
            </div>
        </header>
        
        <nav class="hn-nav">
            <button @click="currentTab='overview'" :class="{active: currentTab==='overview'}">📊 Overview</button>
            <button @click="currentTab='council'" :class="{active: currentTab==='council'}">⚖️ Council</button>
            <button @click="currentTab='live'" :class="{active: currentTab==='live'}">📡 Live</button>
            <button @click="currentTab='settings'" :class="{active: currentTab==='settings'}">⚙️ Settings</button>
        </nav>
        
        <main class="hn-main">
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
                        <div class="stat-value">{{ messages.length }}</div>
                        <div class="stat-label">Messages</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ votes.yeas }}/{{ votes.nays }}</div>
                        <div class="stat-label">Votes</div>
                    </div>
                </div>
                
                <div class="quick-links">
                    <h3>🚀 Quick Access</h3>
                    <a href="/council" target="_blank" class="btn-primary">
                        🏛️ Open Full AI Council WebUI
                    </a>
                </div>
                
                <div class="services-list">
                    <h3>Services</h3>
                    <div class="service-item"><span class="dot green"></span> Council API (3007)</div>
                    <div class="service-item"><span class="dot green"></span> Hive WebUI (3131)</div>
                    <div class="service-item"><span class="dot green"></span> Full API+MCP (3001)</div>
                </div>
            </div>
            
            <div v-if="currentTab==='council'" class="tab-panel">
                <h2>⚖️ AI Council</h2>
                <div class="council-cta">
                    <a href="/council" target="_blank" class="btn-large">
                        🏛️ Launch Full Council Chamber
                    </a>
                    <p>Access the complete deliberation system with 46 councilors</p>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{{ councilors.length }}</div>
                        <div class="stat-label">Councilors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ phase.toUpperCase() }}</div>
                        <div class="stat-label">Session</div>
                    </div>
                </div>
            </div>
            
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
                    <h3>Connection</h3>
                    <div>Council: {{ councilConnected ? 'Connected' : 'Disconnected' }}</div>
                </div>
            </div>
        </main>
    </div>
    `
});

app.mount('#root');
