# 🏛️ Hive Senate — Enhanced AI Council System

## Overview

The Hive Senate is an enhanced AI Council system that simulates a real legislative body with 45 specialized senators, proper voting procedures, and congressional mechanics.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏛️ THE HIVE SENATE 2.0                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   👥 45 SENATORS                                                   │
│   ├── 12 Permanent (Leadership roles)                               │
│   ├── 27 2-Year Term (Specialized)                                 │
│   └── 6 1-Year Term (Rotating)                                    │
│                                                                     │
│   🗳️ DEMOCRATIC PROCESSES                                          │
│   ├── Committee System (Topic-focused groups)                      │
│   ├── Partisan Caucuses (Coalition building)                      │
│   ├── Filibuster (Extended debate)                                │
│   ├── Cloture (End filibuster)                                    │
│   └── Supermajority Voting                                         │
│                                                                     │
│   ⚡ EXECUTIVE POWERS                                              │
│   ├── Veto Power (Security, Budget, Emergency)                    │
│   ├── Executive Orders (Quick decisions)                            │
│   └── Joint Sessions (Full congress)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# View all senators
./scripts/hive-senate.sh roster

# Start deliberation
./scripts/hive-senate.sh vote "Should we adopt microservices?"

# Brainstorm ideas (no criticism)
./scripts/hive-senate.sh brainstorm "improve performance"

# Adversarial debate
./scripts/hive-senate.sh debate "migrate to new framework"
```

## Senator Categories

### Permanent Term (12)
| Senator | Party | Expertise | Veto Power |
|---------|-------|----------|------------|
| 🏛️ Speaker | Neutral | Leadership | Votes:2 |
| 🏛️ Technocrat | Neutral | Technical | - |
| 🏛️ Ethicist | Neutral | Ethics | - |
| 🏛️ Pragmatist | Neutral | Practical | - |
| 🏛️ Skeptic | Neutral | Critical | - |
| 🔒 Sentinel | Security | Security | YES |
| 💡 Visionary | Progressive | Innovation | - |
| 📚 Historian | Neutral | History | - |
| 🤝 Diplomat | Neutral | Diplomacy | - |
| 📰 Journalist | Neutral | Communication | - |
| 🧠 Psychologist | Neutral | Human-factors | - |
| 🚨 Emergency Mgr | Security | Emergency | YES |

### 2-Year Term (27)
Business, Technical, Emergency, Plant Science, Vision specialists.

### 1-Year Term (6)
Rotating seats for diverse perspectives.

## Democratic Processes

### 1. Committee System

Form specialized committees for deep dives:

```bash
# Create committee for a topic
./scripts/hive-senate.sh committee security
./scripts/hive-senate.sh committee performance
./scripts/hive-senate.sh committee ethics

# List committees
./scripts/hive-senate.sh committees
```

**Committee Features:**
- Auto-selects senators with matching expertise
- Tracks meetings and recommendations
- Produces formal committee reports

### 2. Partisan Caucuses

Form ideological coalitions:

```bash
# Form caucus by party
./scripts/hive-senate.sh caucus "Innovation Caucus" progressive
./scripts/hive-senate.sh caucus "Fiscal Hawks" conservative
./scripts/hive-senate.sh caucus "Security Council" security

# Bipartisan coalition
./scripts/hive-senate.sh bipartisan

# List caucuses
./scripts/hive-senate.sh caucuses
```

**Caucus Features:**
- Tracks cohesion (how united the group is)
- Bipartisan has 75% cohesion (mixed ideology)
- Party caucuses have 95% cohesion

### 3. Filibuster

Extended debate to delay oremphasize:

```bash
# Start filibuster
./scripts/hive-senate.sh filibuster "This critical measure"

# Give speeches
./scripts/hive-senate.sh speech "I stand here today to speak..."
./scripts/hive-senate.sh speech "My colleagues, consider the implications..."
./scripts/hive-senate.sh speech "History will judge our decision..."

# Call cloture (vote to end)
./scripts/hive-senate.sh cloture
```

**Filibuster Rules:**
- One senator speaks until cloture or yields
- 60% vote required to invoke cloture
- Filibuster can be indefinite

### 4. Voting

```bash
# Simple majority
./scripts/hive-senate.sh vote "Adopt new architecture"

# Supermajority (60%)
# (via joint session)
./scripts/hive-senate.sh joint "Constitutional amendment"
```

**Voting Features:**
- Weighted votes (Speaker has 2 votes)
- Party-based voting patterns
- Veto power for Security/Budget/Emergency
- Minority reports appended to record

## Special Modes

### Brainstorm Mode (No Criticism)

```bash
./scripts/hive-senate.sh brainstorm "improve user engagement"
```

**Rule:** Only ideas, NO criticism, NO judgment.

Output:
```
💡 BRAINSTORM MODE: improve user engagement
   Rule: NO criticism, NO judgment — just ideas

   💡 Visionary: What if we improve user engagement using innovation?
   💡 Journalist: Consider innovation approach to improve user engagement
   💡 Psychologist: What if we improve user engagement using human-factors?
   ...
```

### Red Team / Blue Team

```bash
./scripts/hive-senate.sh debate "migrate to new framework"
```

**Format:**
```
⚔️ ADVERSARIAL DEBATE: migrate to new framework

🔴 RED TEAM (Against):
   🔴 Risk Manager: This proposal has serious risk concerns!
   🔴 Security Expert: Security implications are severe!
   ...

🔵 BLUE TEAM (For):
   🔵 Visionary: The innovation benefits clearly outweigh risks!
   🔵 Data Scientist: Data supports this approach!
   ...

🏛️ RED TEAM WINS (Rejected)
```

### Minority Report

When majority passes a vote, minority can file dissent:

```bash
./scripts/hive-senate.sh minority "adopt microservices" APPROVED
```

### Joint Session

Full congress for critical decisions:

```bash
./scripts/hive-senate.sh joint "national technology priority"
```

All 45 senators speak, then supermajority vote.

## Senator Elections

Rotate non-permanent senators:

```bash
./scripts/hive-senate.sh election
```

**Output:**
```
🗳️ SENATORIAL ELECTIONS

   ✅ Botanist (2-years): 85% RE-ELECTED
   ❌ Data Scientist (2-years): 62% DEFEATED
   ✅ Meteorologist (2-years): 78% RE-ELECTED
   ...
```

## Senator Performance

Track senator effectiveness:

| Senator | Approved | Rejected | Attendance |
|---------|----------|----------|------------|
| Visionary | 45 | 12 | 98% |
| Skeptic | 23 | 34 | 95% |
| Sentinel | 31 | 8 | 100% |

## Veto Powers

Certain senators have veto authority:

| Senator | Veto Domain |
|---------|-------------|
| Sentinel | Security matters |
| Emergency Mgr | Emergency declarations |
| Security Expert | Security matters |
| Finance Expert | Budget/tax matters |

**Example:**
```
VOTE: increase security budget
   📊 Aye: 42 (84%)
   📊 Nay: 8 (16%)
   ⚠️ Vetoes: 1 (Security Expert)
   🏛️ VETO — Security veto sustained
```

## Integration with AI Council

The Hive Senate enhances the existing AI Council:

```javascript
// Full deliberation workflow
const senate = require('./scripts/hive-senate');

// 1. Form committee for deep analysis
senate.committee('security');

// 2. Brainstorm ideas
senate.brainstorm('secure authentication');

// 3. Red vs Blue debate
senate.debate('implement zero-trust');

// 4. Full vote
const result = senate.vote('adopt zero-trust architecture');

// 5. Minority report if rejected
if (result === 'FAILS') {
    senate.minority('adopt zero-trust', 'REJECTED');
}
```

## Deliberation Modes

| Mode | Purpose | Senators | Duration |
|------|---------|----------|----------|
| **Committee** | Deep dive on topic | 5 specialists | Medium |
| **Caucus** | Ideological coalition | 7-15 | Short |
| **Filibuster** | Delay/emphasize | 1 | Long |
| **Brainstorm** | Idea generation | All | Short |
| **Red/Blue** | Adversarial testing | 4 vs 4 | Medium |
| **Joint Session** | Critical decisions | All 45 | Long |

## State Persistence

Senate state saved to `/tmp/hive-senate/state.json`

Includes:
- Active senators
- Committees and meetings
- Caucuses and cohesion
- Filibuster status
- Voting record

## Comparison

| Feature | AI Council v1 | Hive Senate v2 |
|---------|----------------|----------------|
| Senators | 45 | 45 |
| Voting | Simple | Multiple modes |
| Committees | ❌ | ✅ |
| Caucuses | ❌ | ✅ |
| Filibuster | ❌ | ✅ |
| Veto Power | ❌ | ✅ |
| Bipartisan | ❌ | ✅ |
| Elections | ❌ | ✅ |
| Minority Report | ❌ | ✅ |
| Brainstorm | ❌ | ✅ |
| Red/Blue | ❌ | ✅ |

## Scripts

- `hive-senate.js` — Core senate engine
- `hive-senate.sh` — CLI wrapper
- `spawn-council.sh` — AI Council integration

## Status

Added: 2026-04-19
Version: 2.0
Senators: 45
Features: Committee, Caucus, Filibuster, Veto, Elections, Brainstorm, Red/Blue
