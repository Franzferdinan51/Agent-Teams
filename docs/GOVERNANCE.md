# Hive Nation Governance Model

## Chain of Command

```
┌─────────────────────────────────────────────────────────────────┐
│                      🏛️ THE SENATE 🏛️                           │
│                    Supreme Authority over All                      │
│                                                                 │
│   Like Congress controls the military,                            │
│   or a board controls employees.                                  │
│                                                                 │
│   The Senate ISSUES DECREES that are BINDING on:                │
│   • All agents                                                  │
│   • All orchestrators                                          │
│   • All systems                                                 │
│   • All decisions                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Issues Decrees
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   🤖 AGENT ORCHESTRATOR                         │
│                  Receives & Enforces Decrees                     │
│                                                                 │
│   • Task decomposition obeys decrees                          │
│   • Agent selection follows decrees                             │
│   • Execution requires decree compliance                        │
│   • Violations are BLOCKED                                     │
│   • Requirements are INJECTED into tasks                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Directs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       👥 AGENTS 👥                               │
│                    Execute Under Senate Control                   │
│                                                                 │
│   • Researcher, Coder, Reviewer, Writer, Meta                   │
│   • All MUST comply with active decrees                        │
│   • Prohibited actions BLOCKED                                 │
│   • Mandatory requirements ENFORCED                            │
│   • Preferences WEIGHTED in decisions                          │
└─────────────────────────────────────────────────────────────────┘
```

## Real-World Parallels

| Hive Nation | Real World |
|-------------|------------|
| **Senate** | Congress / Board of Directors |
| **Decrees** | Laws / Policies |
| **Agents** | Military / Employees |
| **Orchestrator** | Command Structure |
| **Compliance Check** | Legal Review |

## How It Works

### 1. Senate Issues Decree
```bash
hive senate issue "Local Models First" \
  "Agents MUST attempt local models before cloud" \
  --critical
```

### 2. Decree Enforced Automatically
- Agent policies updated
- Memory rules created
- Monitoring alerts set
- Orchestrator constraints applied

### 3. Agent Action Checked
```bash
hive agent execute "use cloud AI for this task"
# ❌ BLOCKED: Violates "MUST attempt local before cloud"

hive agent execute "use local model for this task"  
# ✅ ALLOWED: Complies with Senate decree
```

## Decree Hierarchy

```
CRITICAL (Level 1) ──────┬── BLOCKS everything
                         │
HIGH (Level 2) ─────────┼── Blocks without override
                         │
MEDIUM (Level 3) ───────┼── Warning without Senate override
                         │
LOW (Level 4) ──────────┴── Suggestion only
```

## Example: Full Chain

```bash
# 1. Senate creates policy
hive senate issue "Cost Control" \
  "NEVER use expensive models without approval" \
  --high

# 2. Orchestrator enforces
hive agent execute "use gpt-5 for everything"
# → Check: "NEVER expensive without approval"
# → VIOLATION DETECTED
# → Task BLOCKED

# 3. Agent gets guidance
# → "Use approved model per Senate Cost Control decree"
```

## The Point

**The Senate doesn't ask. It commands.**

Agents don't get to decide if they follow decrees. It's not a suggestion — it's the law of the Hive.

Like a soldier who MUST follow orders, or an employee who MUST follow company policy.

The Senate is the boss. Agents are the workers.

---

## Setting Up

```bash
# Start Senate (creates decrees)
hive senate dashboard

# Start Orchestrator (enforces decrees)  
hive agent dashboard

# They work together automatically
```

---

Updated: 2026-04-19