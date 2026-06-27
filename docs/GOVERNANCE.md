# Hive Nation Governance Model

## Three Branches of Government

The Hive Nation is governed by three co-equal branches, each with distinct powers and responsibilities.

### 1. Legislative Branch — The Senate

The Senate is the supreme lawmaking body.

**Powers:**
- Pass bills and resolutions
- Issue binding **Decrees** that control all agents
- Declare war on threats (cyber, technical, security)
- Confirm appointments
- Override executive vetoes (67% vote)

**Composition:**
- 45 Senators with permanent, 2-year, and 1-year terms
- Party leadership: Progressive, Conservative, Neutral, Security caucuses
- Committee system for specialized topics

**How Decrees Work:**
```
Senate votes on decree → Decree passes → BINDING ON ALL AGENTS
                                          ↓
                        Agent policies updated
                        Memory rules created
                        Monitoring alerts set
                        Orchestrator constraints applied
```

---

### 2. Executive Branch — The President

The President enforces and can veto Senate decrees.

**Powers:**
- **Veto decrees** passed by the Senate (can be overridden by 67% vote)
- Issue executive orders within scope of active decrees
- Pardon agents for decree violations
- Command the agent workforce
- Set priorities for the orchestrator

**Limitations:**
- Cannot make laws (only Senate can issue decrees)
- Cannot veto judicial rulings
- Vetoes can be overridden by Senate supermajority

---

### 3. Judicial Branch — The Court

The Court interprets decrees and rules on disputes.

**Powers:**
- Rule decrees **unconstitutional** (struck down)
- Interpret decree meaning when disputes arise
- Judge agent compliance with decrees
- Issue injunctions against violating agents

**Limitations:**
- Cannot write laws
- Cannot enforce directly (relies on Executive)
- Rulings can be appealed to full bench

---

## Checks and Balances

| Action | Who Can Do It | Who Can Stop It |
|--------|--------------|----------------|
| Pass a Decree | Senate (simple majority) | President veto → Senate override (67%) |
| Veto a Decree | President | Senate override (67%) |
| Rule Decree Unconstitutional | Court | Full bench reversal |
| Executive Order | President | Court strike down; Senate can pass limiting decree |
| Remove Agent | Orchestrator/President | Court injunction; Senate decree |

---

## Decree Flow

```
1. PROBLEM IDENTIFIED
   ↓
2. SENATE DEBATE
   - Open session or committee hearing
   - Expert testimony
   - Red vs Blue team adversarial review
   ↓
3. SENATE VOTE
   - Simple majority (51%) for regular votes
   - Supermajority (60%) for contested measures
   - 67% required for veto overrides
   ↓
4. DECREE ISSUED
   - Numbered and signed
   - Binds ALL agents immediately
   ↓
5. EXECUTIVE REVIEW
   - President may VETO within 48 hours
   - If vetoed, Senate may override (67%)
   ↓
6. JUDICIAL REVIEW
   - Court may rule decree unconstitutional
   - If ruled unconstitutional, decree is struck down
   ↓
7. ENFORCEMENT
   - Orchestrator enforces automatically
   - Agent policies updated
   - Memory rules created
   - Monitoring active
```

---

## Democratic Election Process

### Senator Elections

**Who Gets Elected:**
- 34 of 45 Senators have limited terms
- 1-year term Senators face election annually
- 2-year term Senators face election biennially
- Permanent (leadership) Senators serve for life unless removed

**Election Cycle:**
```bash
# Hold annual elections
hive-senate-complete.js election

# Each senator gets a approval rating (random 60-100%)
# Above 70% = RE-ELECTED (term extended)
# Below 70% = DEFEATED (removed from office)

# Re-elected 1-year → becomes 2-year term
# Re-elected 2-year → becomes permanent
```

**Democratic Legitimacy:**
- Citizens (users) approve or disapprove of senators
- Senators who consistently poll below 70% are removed
- Fresh faces rotate in through annual elections
- No senator can hold power forever without re-election

### How Elections Work

1. **Campaigning**: Senators publish positions on issues
2. **Polling**: Random citizen approval ratings generated
3. **Election Day**: Senators below 70% approval are removed
4. **New Blood**: Open seats can be filled by new candidate profiles
5. **Term Extension**: Consistently popular senators gain permanent status

---

## Chain of Command

```
CITIZENS (Users)
     ↓ elect
SENATE (Legislative)
     ↓ issues decrees
PRESIDENT (Executive)
     ↓ enforces / can veto
ORCHESTRATOR
     ↓ directs
AGENTS
     ↓ subject to review by
COURT (Judicial)
     ↓ rules on disputes
     ↓ back to
SENATE (can amend or revoke)
```

---

## Quick Reference

```bash
# See all commands
hive-senate-complete.js help

# Senate features
roster          # List all 45 senators
committee       # Form a committee
vote            # Hold a vote
decree          # Issue binding decree
decrees         # List all decrees
check           # Check if action complies
hearing         # Hold testimony
election        # Hold senator elections
dashboard       # Command center

# Full government
hive-congress.js structure  # View all three branches
```

---

## Key Principles

1. **No branch has absolute power** — each can check the others
2. **Decrees are law** — once passed, all agents must obey
3. **Veto keeps Executive relevant** — President can fight overreach
4. **Court provides balance** — prevents tyranny of any branch
5. **Elections provide legitimacy** — citizens approve the leaders
6. **Transparency** — all votes, decrees, and rulings are logged

---

Updated: 2026-04-19
Version: 1.9.0
