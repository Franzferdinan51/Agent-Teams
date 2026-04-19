// Hive Nation v2.1.0 - Unified Web Application
// AI Council + Agent Teams Integration with Vue 3

const { createApp, ref, onMounted } = Vue;

const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════
// UNIFIED VUE APP
// ═══════════════════════════════════════════════════════════════════

const app = createApp({
    setup() {
        // Navigation
        const currentTab = ref('council');
        
        // Council State
        const councilConnected = ref(false);
        const councilors = ref([]);
        const sessionActive = ref(false);
        const sessionPhase = ref('idle');
        const messages = ref([]);
        const votes = ref({ yeas: 0, nays: 0 });
        
        // Agent State
        const agents = ref([]);
        const hiveStatus = ref('disconnected');
        
        // Settings
        const provider = ref('minimax');
        const providers = ref([]);
        const lmStudioConnected = ref(false);
        
        // UI State
        const loading = ref(true);
        const error = ref(null);
        
        // Methods
        const checkServices = async () => {
            try {
                // Check Council via proxy
                const council = await fetch('/council').catch(() => null);
                councilConnected.value = !!council;
                
                // Get councilors
                const councilorsData = await fetch('/councilors').catch(() => null);
                if (councilorsData && councilorsData.ok) {
                    const data = await councilorsData.json();
                    councilors.value = data.councilors || [];
                }
                
                // Get providers
                const providersData = await fetch('/llm/providers').catch(() => null);
                if (providersData && providersData.ok) {
                    const data = await providersData.json();
                    providers.value = data.providers || [];
                    provider.value = data.current || 'minimax';
                }
                
            } catch (e) {
                error.value = e.message;
            }
        };
        
        const startDeliberation = async (topic) => {
            try {
                const res = await fetch('/council/deliberate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, mode: 'proposal' })
                });
                const data = await res.json();
                if (data.success) {
                    sessionActive.value = true;
                    sessionPhase.value = 'opening';
                    pollSession();
                }
            } catch (e) {
                error.value = e.message;
            }
        };
        
        const pollSession = async () => {
            if (!sessionActive.value) return;
            
            try {
                const session = await fetch('/council/all').then(r => r.json());
                if (session && session.current) {
                    messages.value = session.current.messages || [];
                    sessionPhase.value = session.current.phase || 'opening';
                    votes.value = session.current.stats || { yeas: 0, nays: 0 };
                    
                    if (sessionPhase.value === 'ended') {
                        sessionActive.value = false;
                    } else {
                        setTimeout(pollSession, 2000);
                    }
                }
            } catch (e) {
                setTimeout(pollSession, 5000);
            }
        };
        
        const switchProvider = async (p) => {
            provider.value = p;
            await fetch('/llm/provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: p })
            });
        };
        
        onMounted(async () => {
            await checkServices();
            loading.value = false;
        });
        
        return {
            currentTab, councilConnected, councilors, sessionActive,
            sessionPhase, messages, votes, agents, hiveStatus,
            provider, providers, lmStudioConnected, loading, error,
            checkServices, startDeliberation, switchProvider
        };
    },
    
    template: `
    <div class="unified-app">
        <!-- Header -->
        <header class="header">
            <div class="header-title">
                <span class="logo">🏛️</span>
                <span class="title">Hive Nation v2.1.0</span>
            </div>
            <div class="header-status">
                <span class="status-dot" :class="councilConnected ? 'connected' : 'disconnected'"></span>
                <span>Council</span>
            </div>
        </header>
        
        <!-- Navigation -->
        <nav class="nav">
            <button @click="currentTab = 'council'" :class="{ active: currentTab === 'council' }">⚖️ AI Council</button>
            <button @click="currentTab = 'live'" :class="{ active: currentTab === 'live' }">📡 Live View</button>
            <button @click="currentTab = 'agents'" :class="{ active: currentTab === 'agents' }">🤖 Agents</button>
            <button @click="currentTab = 'settings'" :class="{ active: currentTab === 'settings' }">⚙️ Settings</button>
        </nav>
        
        <!-- Main Content -->
        <main class="main">
            <!-- Council Tab -->
            <div v-if="currentTab === 'council'" class="tab-content">
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
                        <div class="stat-value">{{ messages.length }}</div>
                        <div class="stat-label">Messages</div>
                    </div>
                    <div class="stat-card" :class="{ success: sessionActive }">
                        <div class="stat-value">{{ sessionPhase.toUpperCase() }}</div>
                        <div class="stat-label">Phase</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ votes.yeas }}/{{ votes.nays }}</div>
                        <div class="stat-label">Yeas/Nays</div>
                    </div>
                </div>
                
                <div class="councilor-grid">
                    <div v-for="c in councilors.slice(0, 20)" :key="c.id" class="councilor-card">
                        <div class="councilor-avatar">{{ c.name?.charAt(0) }}</div>
                        <div class="councilor-name">{{ c.name }}</div>
                        <div class="councilor-role">{{ c.role }}</div>
                    </div>
                </div>
            </div>
            
            <!-- Live View -->
            <div v-if="currentTab === 'live'" class="tab-content">
                <h2>📡 Live Deliberation</h2>
                <div class="live-phase">{{ sessionPhase.toUpperCase() }}</div>
                <div class="live-messages">
                    <div v-for="m in messages" :key="m.id" class="live-msg">
                        <strong>{{ m.councilor }}:</strong> {{ m.content?.substring(0, 100) }}
                    </div>
                </div>
            </div>
            
            <!-- Agents -->
            <div v-if="currentTab === 'agents'" class="tab-content">
                <h2>🤖 Agent Teams</h2>
                <p>Hive Status: {{ hiveStatus }}</p>
            </div>
            
            <!-- Settings -->
            <div v-if="currentTab === 'settings'" class="tab-content">
                <h2>⚙️ LLM Provider</h2>
                <div class="provider-list">
                    <button v-for="p in providers" :key="p.id" @click="switchProvider(p.id)" :class="{ active: provider === p.id }">
                        {{ p.name }} {{ p.active ? '✅' : '' }}
                    </button>
                </div>
            </div>
        </main>
    </div>
    `
});

app.mount('#root');
