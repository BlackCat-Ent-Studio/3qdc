#!/usr/bin/env bash
# Draft for the multi-game /quan-tri work: worktree /srv/_nhap-nhieu-game (branch nhap-nhieu-game), its own data copy
# /srv/_nhap-nhieu-game-data and a draft server on 127.0.0.1:${PORT_NHAP:-13399} (unit nhap-nhieu-game).
# "restart" only restarts the draft server; "reset-data" also re-copies the live data (drops test accounts).
set -e
R=/srv/3qdc-unified W=/srv/_nhap-nhieu-game D=/srv/_nhap-nhieu-game-data U=nhap-nhieu-game
PORT=${PORT_NHAP:-13399}
if ss -ltn | grep -q ":$PORT " && ! systemctl is-active --quiet $U; then echo "port $PORT busy by something else"; exit 2; fi
if [ "$1" != "restart" ]; then
  cd $R
  if [ ! -d $W ]; then
    git config --global --add safe.directory $W
    git worktree add -q $W -b nhap-nhieu-game
    mountpoint -q $W/mirror || mount --bind $R/mirror $W/mirror
    ln -sfn $R/node_modules $W/node_modules
    rm -rf $D; cp -a $R/data $D
  elif [ "$1" = "reset-data" ]; then
    rm -rf $D; cp -a $R/data $D
  fi
fi
chown -R web3q:web3q $W $D
systemctl stop $U 2>/dev/null || true
systemctl reset-failed $U 2>/dev/null || true
systemd-run --unit=$U --uid=web3q --gid=web3q --working-directory=$W -E PORT=$PORT -E NEWS_DATA_DIR=$D/news \
  -E SIGNUP_DATA_DIR=$D/dang-ky-som -E PHIEU_DATA_DIR=$D/phieu-be-ngoan -E NEWS_INSECURE_COOKIE=1 \
  -E NEWS_SITE_ORIGIN=http://127.0.0.1:$PORT -E PHIEU_GOOGLE_CLIENT_ID=x /usr/bin/node server.mjs >/dev/null
sleep 3
systemctl is-active $U
curl -s -o /dev/null -w 'quan-tri %{http_code}\n' http://127.0.0.1:$PORT/quan-tri
journalctl -u $U --since '-20s' --no-pager | tail -3
