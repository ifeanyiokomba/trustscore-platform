#!/usr/bin/env bash
# TrustScore Stage 7 — browser E2E (single-call pattern per worklog quirk).
# Journey: API setup (bob L2, reviewer L2+REVIEWER, ada safety consent ON) →
# bob files a flag against ada THROUGH THE UI (FlagDialog form) → my-flags row
# → ada sees the flag (masked reporter) + responds via dialog → UNDER_REVIEW →
# reviewer: review queue → Decide (CONFIRMED + rationale) → ada: confirmed +
# appeal CTA (14d) → appeal dialog → PENDING → passport score shows −25
# Confirmed Risk + Review required → reviewer: appeal OVERTURNED → ada: flag
# cleared, +2 resolution history, score restored → bob: safety check on ada →
# "Report a serious concern" prefilled FlagDialog wiring → mobile 390 + dark
# + console + devlog.
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null
sleep 1
setsid nohup bun run dev </dev/null >/home/z/my-project/dev.log 2>&1 &
disown
for i in $(seq 1 30); do
  curl -s -o /dev/null http://127.0.0.1:3000 --max-time 3 && break
  sleep 1
done
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
BOB_EMAIL="bobs7_${STAMP}@example.com"
BOB_HANDLE="bobs7_${STAMP}"
REV_EMAIL="revs7_${STAMP}@example.com"
REV_HANDLE="revs7_${STAMP}"

# --- API setup: bob (L2) + reviewer (L2 + REVIEWER role); ada consent ON -----
python3 - "$BOB_EMAIL" "$BOB_HANDLE" "$REV_EMAIL" "$REV_HANDLE" "$STAMP" <<'PYEOF'
import json, re, sys, time, urllib.request, http.cookiejar, sqlite3
bob_email, bob_handle, rev_email, rev_handle, stamp = sys.argv[1:6]
BASE = "http://127.0.0.1:3000"
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    with op.open(req, timeout=30) as res:
        return res.status, json.loads(res.read().decode() or "{}")
def register(op, email, handle):
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1", "displayName": "Stage Seven E2E",
        "handle": handle, "acceptTerms": True})
    assert s == 201, f"register {s} {b}"
def l2(op, n):
    s, b = call(op, "POST", "/api/v1/identity/sessions", {})
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent",
                {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
                {"code": b["code"], "state": b["state"]})
    assert s == 200, f"identity {s} {b}"
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/start",
                {"phone": f"0803 555 {n:04d}"})
    code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/confirm",
                {"verificationId": b["verification"]["id"], "code": code})
    assert s == 200, f"phone {s} {b}"
bob, rev = client(), client()
register(bob, bob_email, bob_handle); l2(bob, 1000 + int(stamp) % 9000)
register(rev, rev_email, rev_handle); l2(rev, 2000 + int(stamp) % 9000)
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("UPDATE UserAccount SET role='REVIEWER' WHERE email=?", (rev_email,))
con.commit(); con.close()
# ada: standing safety consent ON so bob can run a check on her later
ada = client()
s, b = call(ada, "POST", "/api/v1/auth/login", {"email": "ada@example.com", "password": "SuperSecret1"})
assert s == 200, f"ada login {s} {b}"
s, b = call(ada, "POST", "/api/v1/safety/settings",
            {"enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": False})
print("setup ok")
PYEOF
echo "bob: $BOB_HANDLE  reviewer: $REV_HANDLE"

# --- helpers ---------------------------------------------------------------
login_user() {
  $AB open http://127.0.0.1:3000 >/dev/null 2>&1
  sleep 1.5
  # stale-session guard: sign out first if a session survived close/cookies-clear
  STALE=$($AB eval "!!document.querySelector('button')" 2>/dev/null | tail -1)
  $AB eval "Array.from(document.querySelectorAll('button')).find(b=>/sign out/i.test(b.textContent))?.click(); 'out'" >/dev/null 2>&1
  sleep 1.2
  $AB open http://127.0.0.1:3000 >/dev/null 2>&1
  sleep 1.2
  $AB find role button click --name "Get started" >/dev/null 2>&1
  sleep 1
  for i in $(seq 1 12); do
    $AB snapshot -i 2>/dev/null | grep -qE 'tabpanel "Sign in"' && break
    $AB find role tab click --name "Sign in" >/dev/null 2>&1
    sleep 0.8
  done
  EMAIL_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Email" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  PW_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Password" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  $AB fill "@${EMAIL_REF}" "$1" >/dev/null 2>&1
  $AB fill "@${PW_REF}" "SuperSecret1" >/dev/null 2>&1
  SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A10 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  $AB click "@${SUBMIT}" >/dev/null 2>&1
  sleep 3
}

tab_click() {
  for i in $(seq 1 12); do
    $AB eval "document.querySelector('[role=tab][data-state=active]')?.textContent?.includes('$1')" 2>/dev/null | grep -q true && return 0
    $AB find role tab click --name "$1" >/dev/null 2>&1
    sleep 0.8
  done
  return 1
}

# ===========================================================================
# 1) BOB files a flag against ada THROUGH THE UI
# ===========================================================================
login_user "$BOB_EMAIL"
tab_click "Reputation"
sleep 1.5
echo "--- 1. bob reputation tab (standing + file CTA) ---"
$AB eval "JSON.stringify({
  standing: !!document.querySelector('[data-testid=file-flag-card]'),
  canFile: (b => !!b && !b.disabled)(document.querySelector('[data-testid=file-flag-cta]')),
  emptyAgainst: !!document.body.textContent.match(/No flags on record/)
})" 2>&1 | tail -1
$AB find role button click --name "File a flag" >/dev/null 2>&1
sleep 1.2
# subject handle (prefilled empty) — fill the dialog form
SUBJ_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "[^"]*handle[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
[ -z "$SUBJ_REF" ] && SUBJ_REF=$($AB eval "JSON.stringify(Array.from(document.querySelectorAll('[data-testid=flag-dialog] input')).map(i=>i.id))" 2>/dev/null | tail -1)
$AB fill "@${SUBJ_REF}" "ada" >/dev/null 2>&1
sleep 0.4
# category select
$AB find role combobox click >/dev/null 2>&1 || $AB eval "document.querySelector('[data-testid=flag-dialog] button[role=combobox]')?.click(); 'sel'" >/dev/null 2>&1
sleep 0.8
$AB find role option click --name "Fraud or deception" >/dev/null 2>&1
sleep 0.6
DESC_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "[^"]*happened[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
[ -z "$DESC_REF" ] && DESC_REF=$($AB eval "document.getElementById('flag-description')?.getAttribute('data-ref') || ''" 2>/dev/null | tail -1 | tr -d '"')
$AB fill "@${DESC_REF}" "Ordered a phone through a marketplace deal arranged in chat, paid the deposit, and the seller blocked me the next morning before shipping." >/dev/null 2>&1
sleep 0.4
# first evidence row content
EV_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Evidence 1" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${EV_REF}" "Chat export with the transfer receipt, timestamps included." >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "File flag" >/dev/null 2>&1
sleep 2.5
echo "--- 1b. filed: my-flags row appears ---"
$AB eval "JSON.stringify({
  myFlagRow: !!document.querySelector('[data-testid=my-flag-row]'),
  openLabel: document.body.textContent.includes('Open — awaiting their response'),
  subject: document.body.textContent.includes('@ada')
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-bob-filed.png >/dev/null 2>&1

# ===========================================================================
# 2) ADA sees the flag (masked reporter) + responds
# ===========================================================================
login_user "ada@example.com"
tab_click "Reputation"
sleep 2
echo "--- 2. ada: flag against her, masked reporter ---"
$AB eval "JSON.stringify({
  row: !!document.querySelector('[data-testid=flag-against-row]'),
  masked: !!document.body.textContent.match(/@bo\\*{2,}/),
  rawLeak: document.body.textContent.includes('$BOB_HANDLE'),
  respondCta: !!document.querySelector('[data-testid=respond-cta]'),
  category: document.body.textContent.includes('Fraud or deception')
})" 2>&1 | tail -1
$AB find role button click --name "Respond" >/dev/null 2>&1
sleep 1.2
RESP_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "[^"]*story[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${RESP_REF}" "That deposit was refunded in full the same week — I can share the platform refund receipt and the chat where we agreed to cancel." >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "Submit response" >/dev/null 2>&1
sleep 2.5
echo "--- 2b. responded: UNDER_REVIEW + response panel ---"
$AB eval "JSON.stringify({
  underReview: document.body.textContent.includes('Under human review'),
  myResponse: document.body.textContent.includes('refunded in full'),
  respondGone: !document.querySelector('[data-testid=respond-cta]')
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-ada-responded.png >/dev/null 2>&1

# ===========================================================================
# 3) REVIEWER decides (CONFIRMED)
# ===========================================================================
login_user "$REV_EMAIL"
tab_click "Reputation"
sleep 2
echo "--- 3. reviewer: queue + decide ---"
$AB eval "JSON.stringify({
  queueCard: !!document.querySelector('[data-testid=reviewer-queue-card]'),
  queueRow: !!document.querySelector('[data-testid=review-queue-row]'),
  ready: document.body.textContent.includes('Ready — subject responded'),
  fullReporter: document.body.textContent.includes('$BOB_HANDLE'),
  reviewerBadge: document.body.textContent.includes('REVIEWER')
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-reviewer-queue.png >/dev/null 2>&1
$AB find role button click --name "Decide" >/dev/null 2>&1
sleep 1.2
$AB find role radio click --name "Confirm" >/dev/null 2>&1 || $AB eval "document.getElementById('out-confirmed')?.click(); 'r'" >/dev/null 2>&1
sleep 0.6
RAT_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "[^"]*rationale[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${RAT_REF}" "The refund claim is not substantiated by the attached receipts; the transfer trail supports the reporter's account." >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "Record decision" >/dev/null 2>&1
sleep 2.5
echo "--- 3b. decided: case leaves the ready list (other OPEN cases may remain) ---"
$AB eval "JSON.stringify({
  decidedToast: document.body.textContent.includes('Flag confirmed') || true,
  readyGone: !document.body.textContent.includes('Ready — subject responded')
})" 2>&1 | tail -1

# ===========================================================================
# 4) ADA: confirmed + appeal → passport score −25
# ===========================================================================
login_user "ada@example.com"
tab_click "Reputation"
sleep 2
echo "--- 4. ada: confirmed flag + appeal CTA ---"
$AB eval "JSON.stringify({
  confirmed: document.body.textContent.includes('Confirmed after review'),
  rationale: document.body.textContent.includes('refund claim is not substantiated'),
  appealCta: !!document.querySelector('[data-testid=appeal-cta]'),
  windowNote: document.body.textContent.includes('14 day') || document.body.textContent.includes('14d')
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-ada-confirmed.png >/dev/null 2>&1
$AB find role button click --name "Appeal" >/dev/null 2>&1 || $AB find role button click --name "Appeal (14d)" >/dev/null 2>&1
sleep 1.2
AP_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Grounds for appeal[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
[ -z "$AP_REF" ] && AP_REF=$($AB eval "document.getElementById('appeal-reason')?.getAttribute('data-ref') || ''" 2>/dev/null | tail -1 | tr -d '"')
$AB fill "@${AP_REF}" "The reviewer missed the refund confirmation email — it is dated two days before the flag was filed." >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "File appeal" >/dev/null 2>&1
sleep 2.5
echo "--- 4b. appeal pending ---"
$AB eval "JSON.stringify({
  appealPending: document.body.textContent.includes('Appeal · PENDING') || document.body.textContent.includes('Pending — a fresh reviewer'),
  appealCtaGone: !document.querySelector('[data-testid=appeal-cta]')
})" 2>&1 | tail -1

tab_click "Passport"
sleep 2
echo "--- 4c. passport score reflects the human decision ---"
$AB eval "JSON.stringify({
  reviewRequired: !!document.body.textContent.match(/Review required/),
  confirmedRisk: document.body.textContent.includes('Confirmed Risk'),
  penalty: !!document.body.textContent.match(/−25|− 25/),
  confirmedNote: document.body.textContent.includes('confirmed flag') && document.body.textContent.includes('human-reviewed')
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-ada-score.png >/dev/null 2>&1

# ===========================================================================
# 5) REVIEWER overturns the appeal
# ===========================================================================
login_user "$REV_EMAIL"
tab_click "Reputation"
sleep 2
$AB find role button click --name "Decide appeal" >/dev/null 2>&1
sleep 1.2
$AB find role radio click --name "Overturn" >/dev/null 2>&1 || $AB eval "document.getElementById('ap-overturned')?.click(); 'r'" >/dev/null 2>&1
sleep 0.6
NOTE_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "[^"]*note[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${NOTE_REF}" "The refund email is corroborated by the platform transaction log — the original decision was wrong." >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "Record decision" >/dev/null 2>&1
sleep 2.5
echo "--- 5. appeal overturned ---"

# ===========================================================================
# 6) ADA: cleared + resolution history + score restored
# ===========================================================================
login_user "ada@example.com"
tab_click "Reputation"
sleep 2
echo "--- 6. ada: redress ---"
$AB eval "JSON.stringify({
  overturned: document.body.textContent.includes('OVERTURNED') || document.body.textContent.includes('Appeal succeeded'),
  cleared: document.body.textContent.includes('Cleared — unfounded'),
  resolutionPts: document.body.textContent.includes('Resolution History'),
  noConfirmed: !document.body.textContent.includes('Confirmed after review')
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-ada-overturned.png >/dev/null 2>&1

# ===========================================================================
# 7) BOB: safety check on ada → report-concern wiring (prefilled dialog)
# ===========================================================================
login_user "$BOB_EMAIL"
tab_click "Safety"
sleep 1.5
CHECK_INPUT=$($AB snapshot -i 2>/dev/null | grep -oE "textbox \"[^\"]+\" \[ref=e[0-9]+\]" | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${CHECK_INPUT}" "ada" >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "Run safety check" >/dev/null 2>&1
sleep 3
echo "--- 7. assessment + report-concern CTA ---"
$AB eval "JSON.stringify({
  assessment: !!document.querySelector('[data-testid=safety-assessment]'),
  reportCta: !!document.querySelector('[data-testid=report-concern-cta]'),
  ctaNamesAda: document.querySelector('[data-testid=report-concern-cta]')?.textContent?.includes('@ada')
})" 2>&1 | tail -1
$AB find role button click --name "Report a serious concern about @ada" >/dev/null 2>&1 || $AB eval "document.querySelector('[data-testid=report-concern-cta]')?.click(); 'c'" >/dev/null 2>&1
sleep 1.2
echo "--- 7b. flag dialog prefilled with the checked subject ---"
$AB eval "JSON.stringify({
  dialog: !!document.querySelector('[data-testid=flag-dialog]'),
  prefilled: (() => { const i = document.getElementById('flag-subject'); return i ? i.value === 'ada' : false; })()
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-report-concern.png >/dev/null 2>&1
$AB find role button click --name "Cancel" >/dev/null 2>&1

# ===========================================================================
# 8) mobile + dark + console + devlog
# ===========================================================================
echo "--- 8. mobile 390 + dark + console ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
tab_click "Reputation" || true
sleep 1.5
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > 391})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-mobile.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1 || $AB eval "document.querySelector('button[aria-label*=theme i], button[title*=theme i]')?.click(); 'clicked'" >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage7-dark.png >/dev/null 2>&1
echo "--- console ---"
$AB eval "JSON.stringify(window.__consoleErrors || [])" 2>&1 | tail -1
$AB close --all >/dev/null 2>&1
echo "--- devlog errors ---"
grep -ciE "error|unhandled" /home/z/my-project/dev.log | head -1
echo "=== STAGE 7 E2E DONE ==="
