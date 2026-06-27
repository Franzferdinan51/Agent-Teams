#!/usr/bin/env node
/**
 * Hive Task Queue — Distributed priority queue across the hive
 * Agents enqueue/dequeue tasks with priority and load balancing
 */

const http = require('http');
const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const WS_URL = MESH_URL.replace('http', 'ws') + '/ws';

const PRIORITY = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
    BATCH: 4
};

class TaskQueue {
    constructor() {
        this.queue = [];
        this.processing = new Map();
        this.completed = [];
        this.maxHistory = 100;
        this.workerLoad = new Map();
        this.ws = null;
    }

    async connect() {
        this.connectWebSocket();
        console.log('📋 Task Queue ready');
    }

    connectWebSocket() {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
            this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'queue' }));
        });

        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });
    }

    handleMessage(msg) {
        if (msg.type === 'task_enqueued') {
            this.receiveTask(msg.task);
        }
        
        if (msg.type === 'task_completed') {
            this.markCompleted(msg.taskId, msg.result);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ENQUEUE
    // ═══════════════════════════════════════════════════════════

    enqueue(task, options = {}) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const entry = {
            id: taskId,
            task,
            priority: options.priority || PRIORITY.NORMAL,
            createdAt: Date.now(),
            createdBy: options.createdBy || 'anonymous',
            requiredCapabilities: options.requiredCapabilities || [],
            timeout: options.timeout || 300000, // 5 min default
            retryCount: 0,
            maxRetries: options.maxRetries || 3,
            metadata: options.metadata || {}
        };

        this.queue.push(entry);
        this.sortQueue();

        console.log(`\n📋 ENQUEUED: ${taskId}`);
        console.log(`   Task: ${task}`);
        console.log(`   Priority: ${this.priorityName(entry.priority)}`);
        console.log(`   Position: ${this.queue.length}`);

        // Broadcast to hive
        this.broadcast({
            type: 'task_enqueued',
            task: entry
        });

        return taskId;
    }

    enqueueCritical(task, createdBy = 'system') {
        return this.enqueue(task, { priority: PRIORITY.CRITICAL, createdBy, timeout: 60000 });
    }

    enqueueHigh(task, createdBy = 'system') {
        return this.enqueue(task, { priority: PRIORITY.HIGH, createdBy, timeout: 120000 });
    }

    enqueueBatch(tasks, createdBy = 'system') {
        return tasks.map(task => this.enqueue(task, { 
            priority: PRIORITY.BATCH, 
            createdBy,
            timeout: 600000 
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // DEQUEUE
    // ═══════════════════════════════════════════════════════════

    dequeue(worker = 'anonymous', requiredCapabilities = []) {
        // Find best task for worker
        let bestTask = null;
        let bestScore = -1;

        for (const task of this.queue) {
            // Skip if processing elsewhere
            if (this.processing.has(task.id)) continue;
            
            // Skip if worker lacks capabilities
            if (requiredCapabilities.length > 0) {
                const hasCaps = requiredCapabilities.every(cap => 
                    task.requiredCapabilities.includes(cap)
                );
                if (!hasCaps) continue;
            }

            // Score based on priority and wait time
            const waitTime = Date.now() - task.createdAt;
            const priorityScore = (PRIORITY.BATCH - task.priority) * 10000;
            const waitScore = Math.min(waitTime / 1000, 1000);
            const score = priorityScore + waitScore;

            if (score > bestScore) {
                bestScore = score;
                bestTask = task;
            }
        }

        if (!bestTask) {
            console.log('📋 Queue empty or no matching tasks');
            return null;
        }

        // Remove from queue
        this.queue = this.queue.filter(t => t.id !== bestTask.id);
        
        // Mark as processing
        this.processing.set(bestTask.id, {
            task: bestTask,
            worker,
            startedAt: Date.now()
        });

        // Update worker load
        this.workerLoad.set(worker, (this.workerLoad.get(worker) || 0) + 1);

        console.log(`\n🎯 DEQUEUED: ${bestTask.id}`);
        console.log(`   Task: ${bestTask.task}`);
        console.log(`   Worker: ${worker}`);
        console.log(`   Priority: ${this.priorityName(bestTask.priority)}`);
        console.log(`   Queue remaining: ${this.queue.length}`);

        // Broadcast
        this.broadcast({
            type: 'task_dequeued',
            taskId: bestTask.id,
            worker
        });

        return bestTask;
    }

    // ═══════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════

    complete(taskId, result = null, worker = 'anonymous') {
        const processing = this.processing.get(taskId);
        
        if (!processing) {
            console.log(`❌ Task ${taskId} not found in processing`);
            return false;
        }

        const entry = {
            ...processing,
            completedAt: Date.now(),
            result
        };

        this.completed.push(entry);
        this.processing.delete(taskId);
        this.workerLoad.set(worker, Math.max(0, (this.workerLoad.get(worker) || 1) - 1));

        // Trim history
        if (this.completed.length > this.maxHistory) {
            this.completed.shift();
        }

        console.log(`\n✅ COMPLETED: ${taskId}`);
        console.log(`   Worker: ${worker}`);
        console.log(`   Duration: ${entry.completedAt - entry.startedAt}ms`);

        this.broadcast({
            type: 'task_completed',
            taskId,
            result,
            worker
        });

        return true;
    }

    markCompleted(taskId, result) {
        // Handle completion from other sources
        if (this.processing.has(taskId)) {
            this.complete(taskId, result, this.processing.get(taskId).worker);
        }
    }

    fail(taskId, error, worker = 'anonymous') {
        const processing = this.processing.get(taskId);
        
        if (!processing) {
            return false;
        }

        const task = processing.task;
        task.retryCount++;

        if (task.retryCount < task.maxRetries) {
            // Requeue with same priority
            console.log(`\n🔄 RETRY ${task.retryCount}/${task.maxRetries}: ${taskId}`);
            this.queue.push(task);
            this.sortQueue();
        } else {
            // Mark as permanently failed
            console.log(`\n❌ FAILED (max retries): ${taskId}`);
            this.completed.push({
                ...processing,
                completedAt: Date.now(),
                error,
                failed: true
            });
        }

        this.processing.delete(taskId);
        this.workerLoad.set(worker, Math.max(0, (this.workerLoad.get(worker) || 1) - 1));

        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // QUEUE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    sortQueue() {
        this.queue.sort((a, b) => {
            // Priority first
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Then by creation time (FIFO)
            return a.createdAt - b.createdAt;
        });
    }

    peek(limit = 10) {
        return this.queue.slice(0, limit);
    }

    getStatus() {
        return {
            queued: this.queue.length,
            processing: this.processing.size,
            completed: this.completed.length,
            byPriority: {
                critical: this.queue.filter(t => t.priority === PRIORITY.CRITICAL).length,
                high: this.queue.filter(t => t.priority === PRIORITY.HIGH).length,
                normal: this.queue.filter(t => t.priority === PRIORITY.NORMAL).length,
                low: this.queue.filter(t => t.priority === PRIORITY.LOW).length,
                batch: this.queue.filter(t => t.priority === PRIORITY.BATCH).length
            },
            workerLoad: Object.fromEntries(this.workerLoad)
        };
    }

    getWorkerLoad(worker) {
        return this.workerLoad.get(worker) || 0;
    }

    // ═══════════════════════════════════════════════════════════
    // MESH SYNC
    // ═══════════════════════════════════════════════════════════

    receiveTask(task) {
        if (!this.queue.find(t => t.id === task.id)) {
            this.queue.push(task);
            this.sortQueue();
        }
    }

    broadcast(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...message,
                channel: 'queue'
            }));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    priorityName(priority) {
        return Object.entries(PRIORITY).find(([, v]) => v === priority)?.[0] || 'UNKNOWN';
    }

    size() {
        return this.queue.length;
    }
}

// CLI
if (require.main === module) {
    const queue = new TaskQueue();
    const command = process.argv[2];

    (async () => {
        await queue.connect();

        switch (command) {
            case 'enqueue':
                queue.enqueue(process.argv[3], {
                    priority: parseInt(process.argv[4]) || PRIORITY.NORMAL,
                    createdBy: process.argv[5] || 'cli'
                });
                break;

            case 'critical':
                queue.enqueueCritical(process.argv[3] || 'Critical task', process.argv[4] || 'cli');
                break;

            case 'high':
                queue.enqueueHigh(process.argv[3] || 'High priority task', process.argv[4] || 'cli');
                break;

            case 'batch':
                const tasks = process.argv[3]?.split('|') || ['task1', 'task2', 'task3'];
                queue.enqueueBatch(tasks, process.argv[4] || 'cli');
                break;

            case 'dequeue':
                const task = queue.dequeue(process.argv[3] || 'cli', process.argv[4]?.split(',') || []);
                if (task) {
                    console.log(JSON.stringify(task, null, 2));
                }
                break;

            case 'complete':
                queue.complete(process.argv[3], process.argv[4], process.argv[5] || 'cli');
                break;

            case 'fail':
                queue.fail(process.argv[3], process.argv[4], process.argv[5] || 'cli');
                break;

            case 'peek':
                console.log(JSON.stringify(queue.peek(parseInt(process.argv[3]) || 10), null, 2));
                break;

            case 'status':
                console.log(JSON.stringify(queue.getStatus(), null, 2));
                break;

            default:
                console.log(`
📋 Task Queue v1.0.0

Usage:
  node hive-queue.js enqueue <task> [priority] [creator]
  node hive-queue.js critical <task> [creator]
  node hive-queue.js high <task> [creator]
  node hive-queue.js batch <task1|task2|task3> [creator]
  node hive-queue.js dequeue [worker] [capabilities]
  node hive-queue.js complete <taskId> [result] [worker]
  node hive-queue.js fail <taskId> [error] [worker]
  node hive-queue.js peek [limit]
  node hive-queue.js status

Priority: 0=CRITICAL, 1=HIGH, 2=NORMAL, 3=LOW, 4=BATCH

Example:
  node hive-queue.js critical "Fix production bug"
  node hive-queue.js enqueue "Generate image" 2
  node hive-queue.js dequeue worker1 "image-generation,coding"
  node hive-queue.js complete task-123 "Done!" worker1
                `);
        }

        setTimeout(() => process.exit(0), 1000);
    })();
}

module.exports = { TaskQueue, PRIORITY };
