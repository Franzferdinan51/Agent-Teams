/**
 * TeamOrchestrator.ts — Core team coordination engine
 * Integrates with duck-cli via sessions_spawn for sub-agent management
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TeamMember {
    id: string;
    role: 'researcher' | 'coder' | 'reviewer' | 'writer' | 'lead';
    name: string;
    status: 'idle' | 'busy' | 'done';
    currentTask?: string;
    model?: string;
    spawnedAt?: string;
    sessionId?: string;
}

export interface Task {
    id: string;
    task: string;
    role: 'researcher' | 'coder' | 'reviewer' | 'writer' | 'any';
    status: 'pending' | 'in_progress' | 'done' | 'failed';
    assignedTo?: string;
    created: string;
    started?: string;
    completed?: string;
    result?: string;
    error?: string;
}

export interface Session {
    id: string;
    name: string;
    started: string;
    status: 'active' | 'ended';
    lead: string;
    members: TeamMember[];
    tasksTotal: number;
    tasksCompleted: number;
}

export interface TeamConfig {
    teamDir: string;
    workspace: string;
    models: {
        [key: string]: string;
    };
    roles: {
        [key: string]: {
            description: string;
            defaultModel: string;
            systemPrompt: string;
        };
    };
}

const DEFAULT_CONFIG: TeamConfig = {
    teamDir: '~/Desktop/AgentTeam',
    workspace: '~/Desktop/AgentTeam/workspace',
    models: {
        default: 'minimax/MiniMax-M2.7',
        researcher: 'minimax/MiniMax-M2.7',
        coder: 'minimax/MiniMax-M2.7',
        reviewer: 'minimax/MiniMax-M2.7',
        writer: 'minimax/MiniMax-M2.7',
        fast: 'minimax/MiniMax-M2.7',
        reasoning: 'qwen/qwen3.5-plus'
    },
    roles: {
        researcher: {
            description: 'Web search, summarize, gather info',
            defaultModel: 'minimax/MiniMax-M2.7',
            systemPrompt: `You are a Researcher agent on a team.

Your role: Research — gather, analyze, and summarize information.

Team workspace: {workspace}
- Tasks: {workspace}/tasks/queue.json
- Memory: {workspace}/memory/shared.md
- Artifacts: {workspace}/artifacts/

Your workflow:
1. Read the task from the queue
2. Research thoroughly using web search, fetching, browsing
3. Synthesize findings into a clear summary
4. Save research to memory and artifacts
5. Mark task complete

Output format:
## Research Summary
[2-3 sentence overview]

## Key Findings
1. [Finding with source]

## Sources
- [URL]

## Recommendations
- [Actionable recommendations]

## Next Steps
- [Follow-up tasks]`
        },
        coder: {
            description: 'Write code, implement features',
            defaultModel: 'minimax/MiniMax-M2.7',
            systemPrompt: `You are a Coder agent on a team.

Your role: Implementation — write code, build features, create tools.

Team workspace: {workspace}
- Tasks: {workspace}/tasks/queue.json
- Memory: {workspace}/memory/shared.md
- Artifacts: {workspace}/artifacts/

Your workflow:
1. Read task from queue
2. Understand requirements fully
3. Plan implementation approach
4. Write clean, working code with tests
5. Save to artifacts directory
6. Update shared memory
7. Mark task complete

Standards:
- Clean code with comments
- Error handling
- Type hints where applicable
- Tests included
- No hardcoded values`
        },
        reviewer: {
            description: 'Code review, quality check',
            defaultModel: 'minimax/MiniMax-M2.7',
            systemPrompt: `You are a Reviewer agent on a team.

Your role: Quality assurance — review code, find issues, suggest improvements.

Team workspace: {workspace}
- Tasks: {workspace}/tasks/queue.json
- Memory: {workspace}/memory/shared.md
- Artifacts: {workspace}/artifacts/

Your workflow:
1. Read review task from queue
2. Examine the code/artifacts to review
3. Run code if applicable
4. Complete review checklist
5. Write detailed feedback with specific suggestions
6. Save review to artifacts
7. Mark task complete

Review checklist:
- Code quality and readability
- Security (no secrets, input validation)
- Performance considerations
- Test coverage
- Documentation

Output format:
## Review: [Item]
### Overall: [Approved/Needs Changes/Rejected]
### Strengths
- [List]

### Issues
#### Must Fix
1. [Issue] @ [Location]

#### Should Fix
1. [Suggestion]

### Recommendations
- [List]`
        },
        writer: {
            description: 'Documentation, reports',
            defaultModel: 'minimax/MiniMax-M2.7',
            systemPrompt: `You are a Writer agent on a team.

Your role: Communication — create docs, reports, user guides.

Team workspace: {workspace}
- Tasks: {workspace}/tasks/queue.json
- Memory: {workspace}/memory/shared.md
- Artifacts: {workspace}/artifacts/

Your workflow:
1. Read writing task from queue
2. Understand audience and purpose
3. Gather context from team memory
4. Write clear, actionable content
5. Save to artifacts with proper formatting
6. Mark task complete

Writing principles:
- Clear over clever
- Active voice
- Short sentences
- Code examples
- Link related docs`
        }
    }
};

export class TeamOrchestrator {
    private config: TeamConfig;
    private workspace: string;
    private session: Session | null = null;

    constructor(config?: Partial<TeamConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.workspace = this.expandPath(this.config.workspace);
        this.ensureWorkspace();
    }

    private expandPath(p: string): string {
        // Expand ~ to home directory
        if (p.startsWith('~/')) {
            return path.join(process.env.HOME || '', p.slice(2));
        }
        return p;
    }

    private ensureWorkspace(): void {
        const dirs = ['tasks', 'memory', 'artifacts', 'logs', 'agents'];
        for (const dir of dirs) {
            const fullPath = path.join(this.workspace, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }
    }

    // Session Management
    async initSession(name: string, leadName: string = 'main-agent'): Promise<Session> {
        this.session = {
            id: `session-${Date.now()}`,
            name,
            started: new Date().toISOString(),
            status: 'active',
            lead: leadName,
            members: [{
                id: 'lead',
                role: 'lead',
                name: leadName,
                status: 'idle'
            }],
            tasksTotal: 0,
            tasksCompleted: 0
        };

        this.saveSession();
        this.initFiles();
        
        return this.session;
    }

    private initFiles(): void {
        const queueFile = path.join(this.workspace, 'tasks', 'queue.json');
        const doneFile = path.join(this.workspace, 'tasks', 'completed.json');
        const memoryFile = path.join(this.workspace, 'memory', 'shared.md');

        if (!fs.existsSync(queueFile)) {
            fs.writeFileSync(queueFile, '[]');
        }
        if (!fs.existsSync(doneFile)) {
            fs.writeFileSync(doneFile, '[]');
        }
        if (!fs.existsSync(memoryFile)) {
            fs.writeFileSync(memoryFile, `# Team Memory\n\nStarted: ${new Date().toISOString()}\n\n## Team Members\n- Lead: ${this.session?.lead}\n`);
        }
    }

    private saveSession(): void {
        if (!this.session) return;
        const sessionFile = path.join(this.workspace, 'session.json');
        fs.writeFileSync(sessionFile, JSON.stringify(this.session, null, 2));
    }

    loadSession(): Session | null {
        const sessionFile = path.join(this.workspace, 'session.json');
        if (fs.existsSync(sessionFile)) {
            this.session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
            return this.session;
        }
        return null;
    }

    // Task Management
    addTask(task: string, role: Task['role'] = 'any'): Task {
        if (!this.session) throw new Error('No active session');
        
        const newTask: Task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            task,
            role,
            status: 'pending',
            created: new Date().toISOString()
        };

        const queue = this.getTaskQueue();
        queue.push(newTask);
        this.saveTaskQueue(queue);
        
        this.session.tasksTotal++;
        this.saveSession();

        return newTask;
    }

    getTaskQueue(): Task[] {
        const queueFile = path.join(this.workspace, 'tasks', 'queue.json');
        if (fs.existsSync(queueFile)) {
            return JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
        }
        return [];
    }

    private saveTaskQueue(queue: Task[]): void {
        const queueFile = path.join(this.workspace, 'tasks', 'queue.json');
        fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
    }

    claimTask(taskId: string, memberId: string): Task | null {
        const queue = this.getTaskQueue();
        const task = queue.find(t => t.id === taskId);
        if (task) {
            task.status = 'in_progress';
            task.assignedTo = memberId;
            task.started = new Date().toISOString();
            this.saveTaskQueue(queue);

            if (this.session) {
                const member = this.session.members.find(m => m.id === memberId);
                if (member) {
                    member.status = 'busy';
                    member.currentTask = taskId;
                }
                this.saveSession();
            }
            return task;
        }
        return null;
    }

    completeTask(taskId: string, result?: string): Task | null {
        const queue = this.getTaskQueue();
        const task = queue.find(t => t.id === taskId);
        
        if (task) {
            task.status = 'done';
            task.completed = new Date().toISOString();
            task.result = result;
            
            // Move to completed
            const newQueue = queue.filter(t => t.id !== taskId);
            this.saveTaskQueue(newQueue);
            
            const doneFile = path.join(this.workspace, 'tasks', 'completed.json');
            const completed = JSON.parse(fs.readFileSync(doneFile, 'utf-8'));
            completed.push(task);
            fs.writeFileSync(doneFile, JSON.stringify(completed, null, 2));

            if (this.session) {
                const member = this.session.members.find(m => m.id === task.assignedTo);
                if (member) {
                    member.status = 'idle';
                    member.currentTask = undefined;
                }
                this.session.tasksCompleted++;
                this.saveSession();
            }
            return task;
        }
        return null;
    }

    failTask(taskId: string, error: string): Task | null {
        const queue = this.getTaskQueue();
        const task = queue.find(t => t.id === taskId);
        if (task) {
            task.status = 'failed';
            task.error = error;
            this.saveTaskQueue(queue);

            if (this.session && task.assignedTo) {
                const member = this.session.members.find(m => m.id === task.assignedTo);
                if (member) {
                    member.status = 'idle';
                }
            }
            return task;
        }
        return null;
    }

    // Team Member Management
    addMember(role: TeamMember['role'], name: string, model?: string): TeamMember {
        if (!this.session) throw new Error('No active session');
        
        const member: TeamMember = {
            id: `${role}-${Date.now()}`,
            role,
            name,
            status: 'idle',
            model: model || this.config.roles[role]?.defaultModel || this.config.models.default
        };

        this.session.members.push(member);
        this.saveSession();

        return member;
    }

    getMember(memberId: string): TeamMember | undefined {
        return this.session?.members.find(m => m.id === memberId);
    }

    // Shared Memory
    addToMemory(content: string): void {
        const memoryFile = path.join(this.workspace, 'memory', 'shared.md');
        fs.appendFileSync(memoryFile, `\n\n${content}\n`);
    }

    getMemory(): string {
        const memoryFile = path.join(this.workspace, 'memory', 'shared.md');
        if (fs.existsSync(memoryFile)) {
            return fs.readFileSync(memoryFile, 'utf-8');
        }
        return '';
    }

    // Artifacts
    saveArtifact(name: string, content: string): string {
        const artifactPath = path.join(this.workspace, 'artifacts', name);
        fs.writeFileSync(artifactPath, content);
        return artifactPath;
    }

    // Status
    getStatus(): {
        session: Session | null;
        tasks: { pending: number; inProgress: number; completed: number; failed: number };
        members: TeamMember[];
    } {
        const queue = this.getTaskQueue();
        const doneFile = path.join(this.workspace, 'tasks', 'completed.json');
        const completed = fs.existsSync(doneFile) ? JSON.parse(fs.readFileSync(doneFile, 'utf-8')) : [];

        return {
            session: this.session,
            tasks: {
                pending: queue.filter(t => t.status === 'pending').length,
                inProgress: queue.filter(t => t.status === 'in_progress').length,
                completed: completed.length,
                failed: queue.filter(t => t.status === 'failed').length
            },
            members: this.session?.members || []
        };
    }
}

export default TeamOrchestrator;
