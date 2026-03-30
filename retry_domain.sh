#!/bin/bash
# 2小时后重试 skyqing.online 自定义域名绑定

SLEEP_SECONDS=7200  # 2小时

echo "[$(date)] 等待 ${SLEEP_SECONDS} 秒后重试..."
sleep $SLEEP_SECONDS

echo "[$(date)] 开始重试..."

TOKEN="cfat_fxwNEtxjAIDVUeeX0pzgfofaXDlpwHlVKwGDz489c6740bda"
ACCOUNT_ID="f5f3956578d118a6398a891c3aca2605"
ZONE_ID="550e2b63728649bb34c3f6a084dd216c"

# 检查 zone 状态
STATUS=$(curl -s --max-time 15 "https://api.cloudflare.com/client/v4/zones?name=skyqing.online" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['status'])")

echo "[$(date)] Zone 状态: $STATUS"

# 尝试绑定自定义域名
RESULT=$(curl -s --max-time 20 -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/rmbg/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"domain\":\"rmbg.skyqing.online\",\"zone_id\":\"$ZONE_ID\"}" 2>/dev/null)

echo "[$(date)] API 返回: $RESULT"

if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('success') else 1)" 2>/dev/null; then
    echo "[$(date)] ✅ 自定义域名绑定成功！"
else
    ERROR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['errors'][0]['message'])" 2>/dev/null)
    echo "[$(date)] ❌ 失败: $ERROR"
    echo "[$(date)] 等待3小时后再次重试..."
    sleep 10800  # 3小时
    # 最后一次重试
    curl -s --max-time 20 -X POST \
      "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/rmbg/domains" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"domain\":\"rmbg.skyqing.online\",\"zone_id\":\"$ZONE_ID\"}"
    echo "[$(date)] 最终重试完成"
fi
