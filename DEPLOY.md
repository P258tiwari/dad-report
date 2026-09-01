# Deploying to your VPS (report.doctorsatdoor.com)

Assumes the VPS already runs other sites via nginx, and that `64.227.149.96`
(where `doctorsatdoor.com` currently points) is that same VPS.

## 1. DNS

In your DNS provider, add an A record:
```
report.doctorsatdoor.com  →  64.227.149.96   (or your VPS IP, if different)
```
DNS can take a few minutes to propagate.

## 2. On the VPS: get the code

```bash
sudo mkdir -p /var/www/dad-report
sudo chown $USER:$USER /var/www/dad-report
git clone https://github.com/P258tiwari/dad-report.git /var/www/dad-report
cd /var/www/dad-report
```

## 3. Check Node version (need 20.6+, for `--env-file` and built-in `fetch`)

```bash
node -v
```
If missing or older, install current Node via NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

No `npm install` needed — the server has zero dependencies.

## 4. Add real secrets (never committed to git)

```bash
cp .env.example .env
nano .env
```
Fill in:
```
PORT=8090
NOTION_TOKEN=<your real token>
NOTION_CONTACT_DB_ID=3ce2ec1e-a50e-8073-8349-000b36b08b96
NOTION_SURVEY_DB_ID=3ce2ec1e-a50e-80d0-a8cd-000b7be9bcba
```
`PORT=8090` — since you have other sites on this box, pick a port nothing
else is using. Check what's taken first:
```bash
sudo ss -tlnp
```

## 5. Run it with pm2 (keeps it alive, restarts on crash/reboot)

```bash
sudo npm install -g pm2   # only global tool needed, one-time
pm2 start "node --env-file=.env server.js" --name dad-report
pm2 save
pm2 startup    # run the command it prints, once, to survive reboots
```

## 6. nginx: reverse-proxy the subdomain to that port

Create `/etc/nginx/sites-available/report.doctorsatdoor.com`:
```nginx
server {
    listen 80;
    server_name report.doctorsatdoor.com;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/report.doctorsatdoor.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS (free, via Let's Encrypt)

```bash
sudo certbot --nginx -d report.doctorsatdoor.com
```
Certbot edits the nginx config to add the SSL block and redirect http→https.

## 8. Verify

```bash
curl -I https://report.doctorsatdoor.com
```
Should return `200`. Then load it in a browser and submit each form once to
confirm rows land in Notion.

## Deploying updates later

```bash
cd /var/www/dad-report
git pull
pm2 restart dad-report
```
