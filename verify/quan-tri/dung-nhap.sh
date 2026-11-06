#!/usr/bin/env bash
# Draft for a /quan-tri change: worktree /srv/_$NHAP_NAME (branch $NHAP_NAME), its own data copy /srv/_$NHAP_NAME-data and a draft
# server on 127.0.0.1:${PORT_NHAP:-13399} (unit $NHAP_NAME). NHAP_NAME defaults to nhap-nhieu-game.
# "restart" only restarts the draft server; "reset-data" also re-copies the live data (drops test accounts).
# The copy is moved to the per-game layout (data/he-thong, data/games/<game>/...) by scripts/migrate-games-data.mjs while the
# live data is still in the old layout; scripts/migrate-users-grants.mjs then moves the accounts to owner / grants.
# ORIGIN_EXTRA=http://127.0.0.1:13400 also lets pages opened through an ssh tunnel on that laptop port sign in (Origin check).
# The server finds the copy through DATA_ROOT. Test accounts: NEWS_INSECURE_COOKIE=1 DATA_ROOT=$D node verify/quan-tri/make-test-accounts.mjs
set -e
NHAP_NAME=${NHAP_NAME:-nhap-nhieu-game}
R=/srv/3qdc-unified W=/srv/_$NHAP_NAME D=/srv/_$NHAP_NAME-data U=$NHAP_NAME
PORT=${PORT_NHAP:-13399}
if ss -ltn | grep -q ":$PORT " && ! systemctl is-active --quiet $U; then echo "port $PORT busy by something else"; exit 2; fi
# old roles -> owner / grants (only while a copy still has old roles; the owner is the one manager of the live data)
migrate_users() {
  if grep -qE '"role": "(manager|editor|phieu)"' $D/he-thong/users.json 2>/dev/null; then
    node $W/scripts/migrate-users-grants.mjs --root $D --owner "${OWNER_NHAP:-hieule05072003}" --apply --nhap
  fi
}
if [ "$1" != "restart" ]; then
  cd $R
  if [ ! -d $W ]; then
    git config --global --add safe.directory $W
    git worktree add -q $W -b $NHAP_NAME
    mountpoint -q $W/mirror || mount --bind $R/mirror $W/mirror
    ln -sfn $R/node_modules $W/node_modules
    rm -rf $D; cp -a $R/data $D
    [ -d $D/news ] && node $W/scripts/migrate-games-data.mjs --root $D --apply --nhap
    migrate_users
  elif [ "$1" = "reset-data" ]; then
    rm -rf $D; cp -a $R/data $D
    [ -d $D/news ] && node $W/scripts/migrate-games-data.mjs --root $D --apply --nhap
    migrate_users
  fi
fi
chown -R web3q:web3q $W $D
systemctl stop $U 2>/dev/null || true
systemctl reset-failed $U 2>/dev/null || true
systemd-run --unit=$U --uid=web3q --gid=web3q --working-directory=$W -E PORT=$PORT -E DATA_ROOT=$D \
  -E NEWS_INSECURE_COOKIE=1 -E NEWS_ALLOWED_ORIGINS=http://127.0.0.1:$PORT${ORIGIN_EXTRA:+,$ORIGIN_EXTRA} \
  -E NEWS_SITE_ORIGIN=http://127.0.0.1:$PORT -E PHIEU_GOOGLE_CLIENT_ID=x /usr/bin/node server.mjs >/dev/null
sleep 3
systemctl is-active $U
curl -s -o /dev/null -w 'quan-tri %{http_code}\n' http://127.0.0.1:$PORT/quan-tri
journalctl -u $U --since '-20s' --no-pager | tail -3
