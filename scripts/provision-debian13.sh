#!/usr/bin/env bash
set -Eeuo pipefail

# Ensure root's PATH includes all necessary system directories
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH}"

APP_NAME="babyly"
APP_USER="babyly"
SSH_USER="deploy"
APP_DIR="/opt/${APP_NAME}"
APP_WORKDIR="${APP_DIR}/web"
REPO_URL="git@github.com:pSecurIT/babyly.git"
BRANCH="main"
CONFIGURE_SSH="0"

usage() {
  cat <<'EOF'
Usage: provision-debian13.sh [--repo-url URL] [--branch BRANCH] [--configure-ssh]

Prepares a clean Debian 13 server for Babyly production deployment.
It does not create production secrets or start the application.

--repo-url URL       Git repository URL to clone into /opt/babyly
                     (default: git@github.com:pSecurIT/babyly.git)
--branch BRANCH      Git branch to deploy (default: main)
--configure-ssh      Disable SSH password/root login after validating sshd config
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url)
      [[ $# -ge 2 ]] || { echo "Missing value for --repo-url" >&2; exit 2; }
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || { echo "Missing value for --branch" >&2; exit 2; }
      BRANCH="$2"
      shift 2
      ;;
    --configure-ssh)
      CONFIGURE_SSH="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ "$(id -u)" -eq 0 ]] || { echo "Run this script as root." >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive

apt-get update
dpkg --configure -a
if dpkg-query -W -f='${db:Status-Abbrev}' docker-compose 2>/dev/null | grep -q '^ii'; then
  apt-get remove -y docker-compose
fi
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  gnupg \
  openssl \
  sudo \
  awscli \
  ufw \
  unattended-upgrades

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

. /etc/os-release
cat > /etc/apt/sources.list.d/docker.list <<EOF
 deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable
EOF
sed -i 's/^ //' /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y --no-install-recommends \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
systemctl enable --now docker

if ! getent group "$APP_USER" >/dev/null; then
  groupadd --system "$APP_USER"
fi
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --gid "$APP_USER" --home-dir "$APP_DIR" --create-home --shell /usr/sbin/nologin "$APP_USER"
fi
usermod -aG docker "$APP_USER"

if ! id "$SSH_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$SSH_USER"
fi
usermod -aG sudo "$SSH_USER"
usermod -aG docker "$SSH_USER"

if [[ -r /root/.ssh/authorized_keys ]]; then
  install -d -o "$SSH_USER" -g "$SSH_USER" -m 0700 "/home/$SSH_USER/.ssh"
  install -o "$SSH_USER" -g "$SSH_USER" -m 0600 \
    /root/.ssh/authorized_keys "/home/$SSH_USER/.ssh/authorized_keys"
else
  echo "Warning: /root/.ssh/authorized_keys is missing; SSH login for $SSH_USER is not ready." >&2
fi

install -d -o "$APP_USER" -g docker -m 0750 "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -c "safe.directory=$APP_DIR" -C "$APP_DIR" fetch --prune origin
  git -c "safe.directory=$APP_DIR" -C "$APP_DIR" checkout "$BRANCH"
  git -c "safe.directory=$APP_DIR" -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:docker" "$APP_DIR"
chmod 0750 "$APP_DIR"

if [[ ! -f "$APP_WORKDIR/.env.production" && -f "$APP_WORKDIR/.env.production.example" ]]; then
  install -o "$APP_USER" -g "$APP_USER" -m 0600 \
    "$APP_WORKDIR/.env.production.example" "$APP_WORKDIR/.env.production"
  echo "Created $APP_WORKDIR/.env.production from the example; replace every CHANGE_THIS value before starting." >&2
fi

if [[ -f "$APP_WORKDIR/.env.production" ]]; then
  chown root:docker "$APP_WORKDIR/.env.production"
  chmod 0640 "$APP_WORKDIR/.env.production"
fi

# Run database migrations before starting the service
if [[ -f "$APP_WORKDIR/.env.production" ]]; then
  echo "Starting database and running migrations..." >&2
  cd "$APP_WORKDIR"
  
  # Start the database in the background
  /usr/bin/docker compose up -d db
  
  # Wait for database to be ready using healthcheck
  echo "Waiting for database to be ready..." >&2
  max_attempts=30
  attempt=0
  while [ $attempt -lt $max_attempts ]; do
    if /usr/bin/docker compose ps db 2>/dev/null | grep -q healthy; then
      echo "Database is ready." >&2
      break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
      echo "Database failed to become ready within 30 seconds." >&2
      /usr/bin/docker compose logs db
      exit 1
    fi
    sleep 1
  done
  
  # Run migrations as root in the app container
  # Rebuild so the image includes the checked-out Prisma schema and dependencies.
  /usr/bin/docker compose run --build --rm --user root app \
    node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma
  
  # Stop the database for now (it will be started by the service)
  /usr/bin/docker compose down
  echo "Database migrations completed." >&2
else
  echo "Warning: $APP_WORKDIR/.env.production not found; database migrations skipped." >&2
fi

cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=Babyly production Docker Compose stack
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=$APP_USER
WorkingDirectory=$APP_WORKDIR
ExecStart=/usr/bin/docker compose up -d --build
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
echo "Starting production application stack..." >&2
/usr/bin/docker compose up -d --build
systemctl enable "$APP_NAME.service"

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now unattended-upgrades

if [[ "$CONFIGURE_SSH" == "1" ]]; then
  [[ -s "/home/$SSH_USER/.ssh/authorized_keys" ]] || {
    echo "Cannot configure SSH: $SSH_USER has no authorized_keys file." >&2
    exit 1
  }
  install -d -m 0755 /etc/ssh/sshd_config.d
  cat > /etc/ssh/sshd_config.d/99-babyly-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
X11Forwarding no
AllowTcpForwarding no
EOF
  sshd -t
  systemctl reload ssh
fi

cat <<EOF
Server preparation complete.

Application directory: $APP_DIR
Compose directory:     $APP_WORKDIR
Service:              $APP_NAME.service

Before deployment:
1. Review and edit $APP_WORKDIR/.env.production.
2. Configure Cloudflare DNS for baby.example.invalid.
3. Configure Resend and SPF/DKIM/DMARC.
4. Create /etc/babyly/backup-encryption-password with mode 600.
5. Configure backup variables in $APP_WORKDIR/.env.production.
6. Check with: docker compose ps && docker compose logs --tail=100 caddy
EOF
