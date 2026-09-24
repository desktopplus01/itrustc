#!/usr/bin/env bash
# End-to-end check of the admin-approval money flows, cards and investments.
# Requires the dev server on :3001 and an admin token in /tmp/admintok.
set -u
BASE=http://localhost:3001/api
pass=0; fail=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "  PASS $1";
  elif awk -v a="$2" -v b="$3" 'BEGIN { exit !(a ~ /^[0-9.]+$/ && b ~ /^[0-9.]+$/ && (a+0) == (b+0)) }'; then pass=$((pass+1)); echo "  PASS $1";
  else fail=$((fail+1)); echo "  FAIL $1 (expected=$2 actual=$3)"; fi
}

add() { awk -v x="$1" -v y="$2" 'BEGIN { printf "%.2f", x + y }'; }
sub() { awk -v x="$1" -v y="$2" 'BEGIN { printf "%.2f", x - y }'; }

json() { grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed "s/\"$1\":\"//;s/\"$//"; }
num()  { grep -o "\"$1\":$2" | head -1 | sed "s/\"$1\"://"; }

ADM=$(cat /tmp/admintok)
ALICE=$(node scripts/dev-test-user.js alice.smoke@itrustc.test 5000 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token))")
BOB=$(node scripts/dev-test-user.js bob.smoke@itrustc.test 1000 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token))")

jpost() { curl -s -X POST "$BASE$2" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d "$3"; }
jget()  { curl -s "$BASE$2" -H "Authorization: Bearer $1"; }

echo "— Deposit addresses —"
ADDR=$(jpost "$ADM" /admin/addresses '{"currency":"USDT","network":"TRC-20","address":"TXYZsmokeTestAddress1234567890","label":"Smoke test"}')
ADDR_ID=$(echo "$ADDR" | json id)
check "admin creates address" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/admin/addresses" -H "Content-Type: application/json" -H "Authorization: Bearer $ADM" -d '{"currency":"BTC","network":"Bitcoin","address":"bc1qs smokesecondaddress00000000"}' )"
check "address id present" "1" "$([ -n "$ADDR_ID" ] && echo 1 || echo 0)"

echo "— Wallet deposit (pending → approved) —"
BAL0=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
DEP=$(jpost "$ALICE" /payments/deposit "{\"amount\":1000,\"addressId\":\"$ADDR_ID\",\"txHash\":\"0xsmoketxhash12345\"}")
DEP_REQ=$(echo "$DEP" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
check "short tx hash rejected" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/payments/deposit" -H "Content-Type: application/json" -H "Authorization: Bearer $ALICE" -d "{\"amount\":50,\"addressId\":\"$ADDR_ID\",\"txHash\":\"short\"}")"
check "deposit created" "1" "$([ -n "$DEP_REQ" ] && echo 1 || echo 0)"
BAL1=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "balance held (unchanged) before approval" "$BAL0" "$BAL1"

APR=$(jpost "$ADM" "/admin/requests/$DEP_REQ/approve" '{"note":"verified on chain"}')
check "admin approves deposit" "APPROVED" "$(echo "$APR" | grep -o '"status":"[A-Z]*"' | head -1 | sed 's/"status":"//;s/"//')"
BAL2=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "balance credited after approval" "$(add "$BAL0" 1000)" "$BAL2"

echo "— Withdrawal (held → rejected → refunded) —"
WD=$(jpost "$ALICE" /payments/withdraw '{"amount":200,"method":"bank"}')
WD_REQ=$(echo "$WD" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
BAL_WD=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "withdrawal holds funds" "$(sub "$BAL2" 200)" "$BAL_WD"
REJ=$(jpost "$ADM" "/admin/requests/$WD_REQ/reject" '{"note":"need wallet address"}')
BAL_REJ=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "rejection refunds funds" "$BAL2" "$BAL_REJ"

echo "— Wallet → wallet send by email —"
TR=$(jpost "$ALICE" /payments/transfer '{"recipientEmail":"bob.smoke@itrustc.test","amount":150,"note":"rent"}')
TR_REQ=$(echo "$TR" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
BOB0=$(jget "$BOB" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
jpost "$ADM" "/admin/requests/$TR_REQ/approve" '{}' > /dev/null
BOB1=$(jget "$BOB" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "recipient credited on approval" "$(add "$BOB0" 150)" "$BOB1"

echo "— Card funding via crypto → card → wallet/send —"
CARD=$(jpost "$ALICE" /payments/cards '{"label":"Smoke Card","spendLimit":5000}')
CARD_ID=$(echo "$CARD" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
if [ -z "$CARD_ID" ]; then
  # Alice already holds 5 cards — reuse the first one that isn't frozen.
  CARD_ID=$(jget "$ALICE" /payments/cards | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=(JSON.parse(s).cards||[]).find(x=>!x.frozen);console.log(c?c.id:'')})")
  echo "  (reusing existing card ${CARD_ID})"
fi
cardbal() { jget "$ALICE" /payments/cards | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=(JSON.parse(s).cards||[]).find(x=>x.id==='$CARD_ID');console.log(c?c.balance.toFixed(2):'?')})"; }
CARD_BAL_BEFORE=$(cardbal)
CF=$(jpost "$ALICE" "/payments/cards/$CARD_ID/fund" "{\"amount\":500,\"addressId\":\"$ADDR_ID\",\"txHash\":\"0xcardfundtx999\"}")
CF_REQ=$(echo "$CF" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
jpost "$ADM" "/admin/requests/$CF_REQ/approve" '{}' > /dev/null
CARD_BAL=$(cardbal)
check "card credited after approval" "$(node -e "console.log((parseFloat('$CARD_BAL_BEFORE')+500).toFixed(2))")" "$CARD_BAL"

# Responses list `card` before `request` — pull the id out of the request object.
reqid() { echo "$1" | grep -o '"request":{[^}]*}' | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//'; }

CTW=$(jpost "$ALICE" "/payments/cards/$CARD_ID/to-wallet" '{"amount":200}')
CTW_REQ=$(reqid "$CTW")
BAL_PRE=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
jpost "$ADM" "/admin/requests/$CTW_REQ/approve" '{}' > /dev/null
BAL_POST=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "card → wallet credits wallet" "$(add "$BAL_PRE" 200)" "$BAL_POST"

CS=$(jpost "$ALICE" "/payments/cards/$CARD_ID/send" '{"recipientEmail":"bob.smoke@itrustc.test","amount":50}')
CS_REQ=$(reqid "$CS")
jpost "$ADM" "/admin/requests/$CS_REQ/approve" '{}' > /dev/null
BOB2=$(jget "$BOB" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "card send credits recipient" "$(add "$BOB1" 50)" "$BOB2"

echo "— Investments —"
PLANS=$(jget "$ALICE" /investments/plans)
PLAN_ID=$(echo "$PLANS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).plans.filter(x=>x.minAmount<=500&&(x.maxAmount==null||x.maxAmount>=500)).sort((a,b)=>b.returnPercent-a.returnPercent)[0];console.log(p?p.id:'')})")
BAL_INV0=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
INV=$(jpost "$ALICE" /investments "{\"planId\":\"$PLAN_ID\",\"amount\":500}")
check "investment created" "1" "$(echo "$INV" | grep -c 'investment')"
BAL_INV1=$(jget "$ALICE" /payments | grep -o '"balance":[0-9.]*' | head -1 | sed 's/"balance"://')
check "principal debited" "$(sub "$BAL_INV0" 500)" "$BAL_INV1"
MYINV=$(jget "$ALICE" /investments)
ACTIVE_N=$(echo "$MYINV" | grep -o '"status":"ACTIVE"' | wc -l | tr -d ' ')
check "investment listed active" "1" "$( [ "$ACTIVE_N" -ge 1 ] && echo 1 || echo 0 )"
check "claim before maturity blocked" "400" "$(INV_ID=$(echo "$MYINV" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//'); curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/investments/$INV_ID/claim" -H "Authorization: Bearer $ALICE")"

echo "— Bonus lock messaging —"
ME=$(jget "$ALICE" /users/me)
check "money state returned" "1" "$(echo "$ME" | grep -c 'bonusUnlocked')"

echo; echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
