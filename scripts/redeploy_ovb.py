import subprocess
bt = chr(96)
app = "ovb-cms"
domain = "ovbreadymix.co.za"
img = "ghcr.io/gavinholder/white-label-cms:latest"

with open("/tmp/ovb_app.env", "w") as f:
    f.write("DATABASE_URL=postgresql://cms:Zxo%21ULShkVfl%23VnqS0%21%23GY5Q0n%21d@ovb-cms-db:5432/cms_db\n")
    f.write("JWT_SECRET=i+4YCU/MS4BfF6xnjMMJ5VRhds8yHPHsH4Oy3LjSHTrQh6GFa10/eteB2RvscIFRNJI4QsRrcekrBjqSK5JW0w==\n")
    f.write("JWT_REFRESH_SECRET=tffWrR5nnXkU8a0m8RG3uxVxQbyTGSY4L/AlJs+BF7pGRGnwfQ3qi1l99WDrJ/l1qN210fNf8PlLR9Qpd9S1RA==\n")
    f.write("SESSION_TIMEOUT=14400000\n")
    f.write("NODE_ENV=production\n")
    f.write("NEXT_PUBLIC_API_URL=https://www.ovbreadymix.co.za\n")
    f.write("SKIP_MIGRATIONS=false\n")
    f.write("UPLOAD_DIR=./public/uploads\n")
    f.write("MAX_FILE_SIZE=10485760\n")
    f.write("MEDIA_URL=https://www.ovbreadymix.co.za/uploads\n")

cmd = [
    "docker", "run", "-d",
    "--name", app + "-app",
    "--restart", "unless-stopped",
    "--env-file", "/tmp/ovb_app.env",
    "--network", "traefik-public",
    "--network", app + "_internal",
    "-v", app + "_uploads:/app/public/uploads",
    "-v", app + "_images_uploads:/app/public/images/uploads",
    "-v", app + "_data:/app/data",
    "--label", "traefik.enable=true",
    "--label", "traefik.http.routers." + app + "-www.rule=Host(" + bt + "www." + domain + bt + ")",
    "--label", "traefik.http.routers." + app + "-www.entrypoints=websecure",
    "--label", "traefik.http.routers." + app + "-www.tls=true",
    "--label", "traefik.http.routers." + app + "-www.tls.certresolver=letsencrypt",
    "--label", "traefik.http.routers." + app + "-www.service=" + app + "-svc",
    "--label", "traefik.http.routers." + app + "-apex.rule=Host(" + bt + domain + bt + ")",
    "--label", "traefik.http.routers." + app + "-apex.entrypoints=websecure",
    "--label", "traefik.http.routers." + app + "-apex.tls=true",
    "--label", "traefik.http.routers." + app + "-apex.tls.certresolver=letsencrypt",
    "--label", "traefik.http.routers." + app + "-apex.middlewares=" + app + "-apex-redirect",
    "--label", "traefik.http.routers." + app + "-apex.service=" + app + "-svc",
    "--label", "traefik.http.middlewares." + app + "-apex-redirect.redirectregex.regex=^https://" + domain + "/(.*)",
    "--label", "traefik.http.middlewares." + app + "-apex-redirect.redirectregex.replacement=https://www." + domain + "/" + chr(36) + "{1}",
    "--label", "traefik.http.middlewares." + app + "-apex-redirect.redirectregex.permanent=true",
    "--label", "traefik.http.routers." + app + "-backend.rule=Host(" + bt + "backend." + domain + bt + ")",
    "--label", "traefik.http.routers." + app + "-backend.entrypoints=websecure",
    "--label", "traefik.http.routers." + app + "-backend.tls=true",
    "--label", "traefik.http.routers." + app + "-backend.tls.certresolver=letsencrypt",
    "--label", "traefik.http.routers." + app + "-backend.service=" + app + "-svc",
    "--label", "traefik.http.routers." + app + "-backend.middlewares=" + app + "-admin-redirect",
    "--label", "traefik.http.middlewares." + app + "-admin-redirect.redirectregex.regex=^https://backend\\." + domain + "/?$",
    "--label", "traefik.http.middlewares." + app + "-admin-redirect.redirectregex.replacement=https://backend." + domain + "/admin/login",
    "--label", "traefik.http.middlewares." + app + "-admin-redirect.redirectregex.permanent=false",
    "--label", "traefik.http.services." + app + "-svc.loadbalancer.server.port=3000",
    img
]

r = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:", r.stdout.strip())
print("STDERR:", r.stderr.strip())
print("RC:", r.returncode)

# Fix permissions on volumes (new volumes may mount as root:root)
import time
time.sleep(3)
fix = subprocess.run(
    ["docker", "exec", "--user", "root", app + "-app",
     "chown", "-R", "nextjs:nodejs",
     "/app/public/uploads", "/app/public/images/uploads", "/app/data"],
    capture_output=True, text=True
)
print("Permissions fixed, RC:", fix.returncode)
