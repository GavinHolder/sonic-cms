#!/usr/bin/env python3
"""
Bootstrap script — sonicweb.dedicated.co.za
Runs ONCE as root (password auth) to fully configure the production server.

Usage:
    pip install paramiko bcrypt
    python deploy/bootstrap.py

What it does:
    1. Generates Ed25519 SSH keypair at ~/.ssh/sonic_cloud (if not exists)
    2. Creates 'cms' OS user on the server
    3. Installs SSH public key for passwordless login
    4. Hardens SSH: disables root login and password auth
    5. Installs Docker CE
    6. Installs and configures UFW firewall (allow 22/80/443/8443/9443 only)
    7. Uploads Traefik and Portainer compose + env files
    8. Creates traefik-public Docker network
    9. Starts Traefik stack, waits, starts Portainer stack
    10. Prints all credentials and SSH config
"""

import secrets
import string
import subprocess
import sys
import time
from pathlib import Path

try:
    import paramiko
    import bcrypt
except ImportError:
    print("Missing dependencies. Run: pip install paramiko bcrypt")
    sys.exit(1)

# ── Config ─────────────────────────────────────────────────────────────────────
SERVER_IP      = "165.73.86.236"
SERVER_HOST    = "sonicweb.dedicated.co.za"
ROOT_PASSWORD  = "3ZfEcV"
CMS_USER       = "sonic"
DEPLOY_DIR     = f"/home/{CMS_USER}/sonic-deploy"
ACME_EMAIL     = "admin@sonic.co.za"
DOMAIN         = "sonic.co.za"
SSH_KEY_NAME   = "sonic_cloud"
SSH_KEY_PATH   = Path.home() / ".ssh" / SSH_KEY_NAME

# Paths to local compose files (relative to this script's directory)
SCRIPT_DIR         = Path(__file__).parent
TRAEFIK_COMPOSE    = SCRIPT_DIR / "traefik" / "docker-compose.yml"
PORTAINER_COMPOSE  = SCRIPT_DIR / "portainer" / "docker-compose.yml"



# ── Helpers ────────────────────────────────────────────────────────────────────

def generate_password(length: int = 24) -> str:
    """Generate a cryptographically random password with letters, digits, and symbols."""
    alphabet = string.ascii_letters + string.digits + "!@#%^&*-_"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def make_traefik_auth(password: str) -> str:
    """
    Return a Traefik-compatible BasicAuth string: "admin:<bcrypt-hash>".
    Traefik accepts both $2b$ and $2y$ bcrypt prefix variants.
    """
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10))
    return f"admin:{hashed.decode()}"


def generate_ssh_key() -> str:
    """
    Generate Ed25519 SSH keypair at SSH_KEY_PATH if it does not already exist.
    Returns the public key string.
    """
    if SSH_KEY_PATH.exists():
        print(f"  SSH key already exists: {SSH_KEY_PATH}")
    else:
        subprocess.run(
            [
                "ssh-keygen", "-t", "ed25519",
                "-f", str(SSH_KEY_PATH),
                "-C", "sonic-cloud-deploy",
                "-N", "",
            ],
            check=True,
        )
        print(f"  Generated: {SSH_KEY_PATH}")
    pub_path = SSH_KEY_PATH.with_suffix(".pub")
    return pub_path.read_text().strip()


class SSH:
    """Thin paramiko wrapper for running commands and uploading file content."""

    def __init__(self, host: str, user: str, password: str = None, key_path: Path = None):
        """Connect to host. Use password auth OR key-based auth (not both)."""
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        if key_path:
            self.client.connect(
                host, username=user, key_filename=str(key_path), timeout=30
            )
        else:
            self.client.connect(
                host, username=user, password=password, timeout=30
            )

    def run(self, cmd: str) -> tuple:
        """
        Run a shell command on the remote server.
        Returns (stdout, stderr, exit_code).
        Prints a warning on non-zero exit but does not raise.
        """
        _, stdout, stderr = self.client.exec_command(cmd, timeout=180)
        code = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if code != 0:
            print(f"  [WARN] exit={code}  cmd={cmd!r}")
            if err:
                print(f"         stderr: {err[:300]}")
        return out, err, code

    def upload_str(self, content: str, remote_path: str):
        """Upload a string as a remote file via SFTP, creating parent dirs as needed."""
        sftp = self.client.open_sftp()
        # Ensure parent directory exists
        parent = "/".join(remote_path.split("/")[:-1])
        if parent:
            try:
                sftp.mkdir(parent)
            except IOError:
                pass  # Directory already exists
        with sftp.open(remote_path, "w") as f:
            f.write(content)
        sftp.close()

    def upload_file(self, local_path: Path, remote_path: str):
        """Upload a local file to the remote server via SFTP."""
        self.upload_str(local_path.read_text(), remote_path)

    def close(self):
        """Close the SSH connection."""
        self.client.close()


# ── Bootstrap steps ────────────────────────────────────────────────────────────

def main():
    """
    Full server bootstrap: connect as root, set up cms user + SSH key,
    harden SSH, install Docker + UFW, upload stacks, start services.
    """
    print("=" * 60)
    print("White-Label CMS — Production Server Bootstrap")
    print(f"Target: {SERVER_HOST} ({SERVER_IP})")
    print("=" * 60)

    # Step 1: Generate SSH keypair locally
    print("\n[1/10] Generating SSH keypair...")
    public_key = generate_ssh_key()

    # Step 2: Generate service credentials
    print("\n[2/10] Generating credentials...")
    traefik_password   = generate_password()
    portainer_password = generate_password()
    traefik_auth       = make_traefik_auth(traefik_password)
    print(f"  Traefik dashboard password : {traefik_password}")
    print(f"  Portainer admin password   : {portainer_password}  (set on first login)")

    # Step 3: Connect as root (password-based, one-time)
    print(f"\n[3/10] Connecting as root@{SERVER_IP}...")
    s = SSH(SERVER_IP, "root", password=ROOT_PASSWORD)

    # Step 4: Create cms user (idempotent — skips if exists)
    print(f"\n[4/10] Creating user '{CMS_USER}'...")
    s.run(f"id {CMS_USER} 2>/dev/null || adduser --disabled-password --gecos '' {CMS_USER}")
    s.run(f"usermod -aG sudo {CMS_USER}")

    # Step 5: Install SSH public key for cms user
    print(f"\n[5/10] Installing SSH authorized key for {CMS_USER}...")
    s.run(f"mkdir -p /home/{CMS_USER}/.ssh && chmod 700 /home/{CMS_USER}/.ssh")
    s.run(f"echo '{public_key}' > /home/{CMS_USER}/.ssh/authorized_keys")
    s.run(f"chmod 600 /home/{CMS_USER}/.ssh/authorized_keys")
    s.run(f"chown -R {CMS_USER}:{CMS_USER} /home/{CMS_USER}/.ssh")

    # Step 6: Harden SSH — disable root login and password auth
    # Ubuntu 24 renamed ChallengeResponseAuthentication to KbdInteractiveAuthentication
    print("\n[6/10] Hardening SSH...")
    harden_cmds = [
        "sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config",
        "sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config",
        "sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config",
        "sed -i 's/^#*KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config",
        "sshd -t && systemctl restart ssh.service",  # Ubuntu 24 uses ssh.service not sshd.service
    ]
    for cmd in harden_cmds:
        s.run(cmd)

    # Step 7: Install Docker CE
    print("\n[7/10] Installing Docker CE...")
    s.run("apt-get update -qq")
    s.run("curl -fsSL https://get.docker.com | sh")
    s.run(f"usermod -aG docker {CMS_USER}")
    s.run("systemctl enable docker && systemctl start docker")

    # Step 8: Install UFW and open only required ports
    # All services (Traefik dashboard, Portainer, app) are served via port 443
    # subdomains — no separate management ports needed.
    print("\n[8/10] Configuring UFW firewall...")
    ufw_cmds = [
        "apt-get install -y ufw",
        "ufw --force reset",
        "ufw default deny incoming",
        "ufw default allow outgoing",
        "ufw allow 22/tcp comment 'SSH'",
        "ufw allow 80/tcp comment 'HTTP and Lets Encrypt'",
        "ufw allow 443/tcp comment 'HTTPS — all services via subdomains'",
        "ufw --force enable",
    ]
    for cmd in ufw_cmds:
        s.run(cmd)

    # Step 9: Create deploy directory tree, upload compose and env files
    print("\n[9/10] Uploading Traefik and Portainer stacks...")

    for d in [f"{DEPLOY_DIR}/traefik/acme", f"{DEPLOY_DIR}/portainer"]:
        s.run(f"mkdir -p {d}")
    s.run(f"chown -R {CMS_USER}:{CMS_USER} {DEPLOY_DIR}")
    s.run(
        f"touch {DEPLOY_DIR}/traefik/acme/acme.json && "
        f"chmod 600 {DEPLOY_DIR}/traefik/acme/acme.json"
    )

    # Upload Traefik compose + generated .env
    s.upload_file(TRAEFIK_COMPOSE, f"{DEPLOY_DIR}/traefik/docker-compose.yml")
    traefik_env = (
        f"MANAGEMENT_DOMAIN={DOMAIN}\n"
        f"ACME_EMAIL={ACME_EMAIL}\n"
        # Docker Compose .env files treat values as literal strings — no $ escaping needed
        f"TRAEFIK_ADMIN_AUTH={traefik_auth}\n"
        f"TZ=Africa/Johannesburg\n"
    )
    s.upload_str(traefik_env, f"{DEPLOY_DIR}/traefik/.env")

    # Upload Portainer compose + generated .env
    s.upload_file(PORTAINER_COMPOSE, f"{DEPLOY_DIR}/portainer/docker-compose.yml")
    s.upload_str(f"MANAGEMENT_DOMAIN={DOMAIN}\n", f"{DEPLOY_DIR}/portainer/.env")

    # Step 10: Create Docker network and start stacks
    print("\n[10/10] Starting stacks...")
    s.run("docker network create traefik-public 2>/dev/null || true")

    print("  Starting Traefik...")
    s.run(f"cd {DEPLOY_DIR}/traefik && docker compose up -d")
    print("  Waiting 8s for Traefik to initialise...")
    time.sleep(8)

    print("  Starting Portainer...")
    s.run(f"cd {DEPLOY_DIR}/portainer && docker compose up -d")

    # Verify containers are running
    out, _, _ = s.run("docker ps --format '{{.Names}}\t{{.Status}}'")
    print(f"\n  Running containers:\n{out}")

    s.close()

    # ── Final summary ──────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("BOOTSTRAP COMPLETE")
    print("=" * 60)
    print(f"\n  Traefik    : https://traefik.{SERVER_HOST}")
    print(f"               Login: admin / {traefik_password}")
    print(f"  Portainer  : https://portainer.{SERVER_HOST}")
    print(f"               Set admin password on first login: {portainer_password}")
    print(f"\n  Website (deploy via Portainer stack):")
    print(f"    Public   : https://www.{SERVER_HOST}")
    print(f"    Admin    : https://backend.{SERVER_HOST}")
    print(f"\n  SSH        : ssh -i {SSH_KEY_PATH} {CMS_USER}@{SERVER_IP}")
    print(f"\n  SSH config (already saved as sonic-cloud):")
    print(f"    Host sonic-cloud")
    print(f"        HostName {SERVER_IP}")
    print(f"        User {CMS_USER}")
    print(f"        IdentityFile {SSH_KEY_PATH}")
    print(f"        ServerAliveInterval 60")
    print(f"        ServerAliveCountMax 3")
    print(f"\n  >>> Save credentials to docs/server.md <<<")
    print("=" * 60)


if __name__ == "__main__":
    main()
