#!/usr/bin/env node
/**
 * Hive Consensus Engine — Hive-wide decision making
 * Agents vote on tasks, approaches, and priorities
 */

const http = require('http');
const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const WS_URL = MESH_URL.replace('http', 'ws') + '/ws';

class ConsensusEngine {
    constructor() {
        this.polls = new Map();
        this.votes = new Map();
        this.ws = null;
    }

    async start() {
        this.connectWebSocket();
        
        // Load existing polls
        const agents = await this.fetch('/api/agents');
        console.log(`🗳️ Consensus Engine ready — ${agents.length} agents in hive`);
    }

    connectWebSocket() {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
            this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'consensus' }));
        });

        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });
    }

    handleMessage(msg) {
        if (msg.type === 'vote_cast') {
            this.recordVote(msg.pollId, msg.from, msg.choice);
        }
    }

    async createPoll(question, choices, options = {}) {
        const pollId = `poll-${Date.now()}`;
        const timeout = options.timeout || 60000; // 1 minute default
        
        const poll = {
            id: pollId,
            question,
            choices,
            createdAt: Date.now(),
            expiresAt: Date.now() + timeout,
            creator: options.creator || 'consensus-engine',
            allowMultiple: options.allowMultiple || false,
            votes: {},
            status: 'active'
        };

        this.polls.set(pollId, poll);
        this.votes.set(pollId, []);

        console.log(`\n🗳️ NEW POLL: "${question}"`);
        console.log(`   ID: ${pollId}`);
        console.log(`   Choices: ${choices.join(', ')}`);
        console.log(`   Expires: ${timeout / 1000}s`);
        console.log('');

        // Broadcast to hive
        await this.broadcast({
            type: 'new_poll',
            poll
        });

        // Set expiration
        setTimeout(() => this.closePoll(pollId), timeout);

        return poll;
    }

    async vote(pollId, choice, voter = 'anonymous') {
        const poll = this.polls.get(pollId);
        
        if (!poll) {
            return { error: 'Poll not found' };
        }

        if (poll.status !== 'active') {
            return { error: 'Poll is closed' };
        }

        // Record vote
        this.recordVote(pollId, voter, choice);

        // Send via mesh
        await this.broadcast({
            type: 'vote_cast',
            pollId,
            voter,
            choice,
            timestamp: Date.now()
        });

        return {
            success: true,
            pollId,
            choice
        };
    }

    recordVote(pollId, voter, choice) {
        if (!this.votes.has(pollId)) {
            this.votes.set(pollId, []);
        }

        const pollVotes = this.votes.get(pollId);
        pollVotes.push({ voter, choice, at: Date.now() });

        const poll = this.polls.get(pollId);
        poll.votes[voter] = choice;

        console.log(`   🗳️ ${voter} voted: ${choice}`);
    }

    async getResults(pollId) {
        const poll = this.polls.get(pollId);
        
        if (!poll) {
            return { error: 'Poll not found' };
        }

        const votes = this.votes.get(pollId) || [];
        const tally = {};

        for (const choice of poll.choices) {
            tally[choice] = 0;
        }

        for (const vote of votes) {
            if (tally[vote.choice] !== undefined) {
                tally[vote.choice]++;
            }
        }

        const total = votes.length;
        const results = poll.choices.map(choice => ({
            choice,
            votes: tally[choice],
            percentage: total > 0 ? Math.round((tally[choice] / total) * 100) : 0
        }));

        // Sort by votes
        results.sort((a, b) => b.votes - a.votes);

        return {
            poll: {
                id: poll.id,
                question: poll.question,
                status: poll.status,
                totalVotes: total,
                expiresAt: poll.expiresAt
            },
            results,
            winner: results[0]
        };
    }

    async closePoll(pollId) {
        const poll = this.polls.get(pollId);
        
        if (!poll || poll.status !== 'active') {
            return { error: 'Poll not found or already closed' };
        }

        poll.status = 'closed';
        poll.closedAt = Date.now();

        const results = await this.getResults(pollId);

        console.log(`\n📊 POLL CLOSED: "${poll.question}"`);
        console.log(`   🏆 WINNER: ${results.winner.choice}`);
        console.log(`   Votes: ${results.winner.votes}/${results.poll.totalVotes} (${results.winner.percentage}%)`);
        console.log('');

        // Broadcast results
        await this.broadcast({
            type: 'poll_closed',
            pollId,
            results
        });

        return results;
    }

    async broadcastResults(pollId) {
        const results = await this.getResults(pollId);
        
        await this.broadcast({
            type: 'consensus_result',
            pollId,
            question: results.poll.question,
            winner: results.winner.choice,
            results: results.results
        });

        return results;
    }

    async broadcast(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    async fetch(endpoint, options = {}) {
        const url = new URL(endpoint, MESH_URL);
        const resp = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        return resp.json();
    }

    // Convenience methods
    async yesNo(question, timeout = 30000) {
        return this.createPoll(question, ['Yes', 'No'], { timeout });
    }

    async pickBest(question, options, timeout = 60000) {
        return this.createPoll(question, options, { timeout });
    }

    async priority(question, items, timeout = 60000) {
        return this.createPoll(question, items, { timeout });
    }
}

// CLI
if (require.main === module) {
    const engine = new ConsensusEngine();
    const command = process.argv[2];

    (async () => {
        await engine.start();

        switch (command) {
            case 'poll':
                const question = process.argv[3];
                const choices = process.argv[4]?.split(',') || ['Yes', 'No'];
                await engine.createPoll(question, choices);
                break;

            case 'vote':
                const pollId = process.argv[3];
                const choice = process.argv[4];
                const voter = process.argv[5] || 'cli';
                const result = await engine.vote(pollId, choice, voter);
                console.log(result);
                break;

            case 'results':
                const r = await engine.getResults(process.argv[3]);
                console.log(JSON.stringify(r, null, 2));
                break;

            case 'close':
                const closeResult = await engine.closePoll(process.argv[3]);
                console.log(JSON.stringify(closeResult, null, 2));
                break;

            case 'yesno':
                await engine.yesNo(process.argv[3] || 'Is this a good idea?');
                break;

            default:
                console.log(`
🗳️ Consensus Engine v1.0.0

Usage:
  node hive-consensus.js poll "Question" "choice1,choice2,choice3"
  node hive-consensus.js vote <pollId> <choice> [voter-name]
  node hive-consensus.js results <pollId>
  node hive-consensus.js close <pollId>
  node hive-consensus.js yesno "Is this a good idea?"

Example:
  node hive-consensus.js poll "REST or GraphQL?" "REST,GraphQL,gRPC"
  node hive-consensus.js vote poll-123 REST duck-cli
  node hive-consensus.js results poll-123
                `);
        }

        setTimeout(() => process.exit(0), 1000);
    })();
}

module.exports = { ConsensusEngine };
