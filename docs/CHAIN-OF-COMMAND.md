# Chain of Command

How directives flow from the Senate through to agents — and how each branch can intervene.

## The Chain

```
SENATE (Legislative)
    │
    │ Issues DECREES (binding laws on all agents)
    │
    ▼
PRESIDENT (Executive)
    │
    │ Can VETO decrees (overridden by 67% Senate vote)
    │
    ▼
ORCHESTRATOR
    │
    │ Enforces decrees, decomposes tasks, routes to agents
    │
    ▼
AGENTS
    │
    │ Subject to Judicial review
    ▼
COURT (Judicial)
    │
    │ Can rule decrees UNCONSTITUTIONAL (struck down)
    │
    ▼
SENATE (can amend or revoke)
```

---

## Step-by-Step Flow

### Step 1: Senate Issues Decree

The Senate passes a decree by simple majority vote.

```bash
hive-senate-complete.js decree "Local Models First" "All agents MUST attempt local models before cloud" --critical
```

**Result:** Decree #N is now BINDING ON ALL AGENTS.

---

### Step 2: Executive Veto (Optional)

The President can veto the decree within 48 hours.

```bash
hive-congress.js veto <decreeNumber> "Concerns about latency"
```

**If vetoed:** The decree is paused. Senate can override with 67% vote.

```bash
hive-senate-complete.js dv <decreeNumber> <senator> yes  # Repeat 67 times to override
```

**If not overridden:** Decree dies. President wins.

---

### Step 3: Orchestrator Enforces

Once decree is active (not vetoed or override succeeded), the Orchestrator enforces it automatically.

- Agent behavior policies updated
- Memory rules injected into all agent contexts
- Monitoring alerts created for violations
- Task routing adjusts to comply

```bash
# Check if an action complies with all active decrees
hive-senate-complete.js check "use cloud AI for everything"
# ❌ VIOLATION: Decree Local Models First says NO cloud before local
```

---

### Step 4: Agents Execute Under Decree Control

Agents must comply with all active decrees.

```
Agent: "use cloud AI for everything"
# ❌ BLOCKED by Orchestrator — violates "Local Models First" decree

Agent: "attempt local model first"
# ✅ ALLOWED — complies with decree
```

---

### Step 5: Judicial Review (Optional)

If an agent believes a decree is unconstitutional or overreaching, the Court can rule on it.

```bash
hive-congress.js case "Hive v. Local Models Decree"
# Court reviews decree scope and authority
# Court rules: "DECREE STRUCK DOWN" or "DECREE UPHELD"
```

**If struck down:** Decree is void. Orchestrator removes enforcement.

**If upheld:** Decree remains active. No further appeal.

---

## Voting Requirements Summary

| Action | Threshold | Notes |
|--------|-----------|-------|
| Pass a decree | 51% (simple majority) | Senate only |
| Override veto | 67% (2/3 supermajority) | Both chambers |
| Veto a decree | President alone | One person |
| Rule unconstitutional | Court majority | Judicial review |
| Elect senators | 70% approval rating | Annual elections |

---

## Executive Veto Powers

The President can veto:
- ❌ Any Senate decree
- ❌ Funding bills
- ❌ Constitutional amendments

The President CANNOT:
- ❌ Veto court rulings
- ❌ Veto override votes
- ❌ Issue laws (only executive orders within decree scope)

---

## Judicial Review Powers

The Court can:
- ✅ Rule decrees unconstitutional (struck down)
- ✅ Interpret decree meaning
- ✅ Issue injunctions against agents
- ✅ Judge compliance disputes

The Court CANNOT:
- ❌ Write new laws
- ❌ Enforce rulings directly (relies on Executive)
- ❌ Veto Senate decrees directly (must rule on challenge)

---

## Citizen Role

Citizens (users) elect senators annually.

```bash
# Hold elections
hive-senate-complete.js election

# Each senator needs 70%+ approval to stay
# Below 70% = removed from office
# Re-elected senators extend their terms
```

**Why it matters:**
- Citizens control who makes decrees
- Citizens indirectly control all agent behavior
- Elections prevent any senator from holding permanent power

---

## Quick Commands

```bash
# Issue a decree (Senate)
hive-senate-complete.js decree "Title" "Content"

# Veto a decree (President)
hive-congress.js veto <decreeNumber> "Reason"

# Override veto (Senate)
hive-senate-complete.js dv <#> <senator> yes  # x67

# Check compliance (Orchestrator)
hive-senate-complete.js check "action to check"

# Court challenge
hive-congress.js case "Case Name"

# Hold elections (Citizens)
hive-senate-complete.js election
```

---

## Visual Chain

```
CITIZENS
    ↓ (elect)
SENATORS ───────────────────────────────┐
    │ (pass decrees)                     │
    ▼                                    │ (can veto)
PRESIDENT ───────────────────────────────┤
    │ (enforces)                         │
    ▼                                    │
ORCHESTRATOR ────────────────────────────┤
    │ (directs)                          │
    ▼                                    │
AGENTS ──────────────────────────────────┤
    │ (dispute)                          │
    ▼                                    │
COURT ───────────────────────────────────┘
    │ (rules on constitutionality)
    ↓
SENATE (amend or revoke)
```

---

Updated: 2026-04-19
Version: 1.9.0
