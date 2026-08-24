export type GuideRisk = "safe" | "warning" | "danger";

export interface DeveloperGuideCommand {
  command: string;
  label?: string;
  language?: "bash" | "nginx" | "yaml" | "sql" | "text";
  risk?: GuideRisk;
}

export interface DeveloperGuideStep {
  title: string;
  description: string;
  commands?: DeveloperGuideCommand[];
  note?: string;
  warning?: string;
}

export interface DeveloperGuide {
  slug: string;
  path: string;
  title: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  difficulty: "Intermediate" | "Advanced";
  duration: string;
  topics: string[];
  prerequisites: string[];
  steps: DeveloperGuideStep[];
  verification: string[];
}

export const DEVELOPER_GUIDES: DeveloperGuide[] = [
  {
    slug: "production-ubuntu-server",
    path: "/developer-guides/production-ubuntu-server",
    title: "Set up a production Ubuntu server",
    summary: "Harden a fresh Ubuntu host with updates, a non-root operator, SSH keys, a firewall, automatic security updates, and basic intrusion protection.",
    metaTitle: "Production Ubuntu Server Setup Guide | ChlatWork",
    metaDescription: "A practical checklist for securely preparing an Ubuntu production server with SSH, UFW, Fail2ban, and automatic security updates.",
    difficulty: "Intermediate",
    duration: "30–45 min",
    topics: ["Ubuntu", "SSH", "UFW", "Fail2ban"],
    prerequisites: ["A fresh supported Ubuntu LTS server", "Root or sudo console access", "Your public SSH key and a second terminal for testing"],
    steps: [
      { title: "Patch the server", description: "Install available security and package updates before adding application software.", commands: [{ command: "sudo apt update && sudo apt upgrade -y" }] },
      { title: "Create an operator account", description: "Use a named sudo account instead of operating as root.", commands: [{ command: "sudo adduser <operator>\nsudo usermod -aG sudo <operator>" }] },
      { title: "Install the SSH public key", description: "Copy only your public key to the new account, then confirm login from a second terminal.", commands: [{ command: "ssh-copy-id <operator>@<server-ip>" }, { command: "ssh <operator>@<server-ip>" }], warning: "Keep the current root session open until the new SSH login works." },
      { title: "Configure the firewall", description: "Allow SSH before enabling UFW. Add HTTP and HTTPS when this host will serve web traffic.", commands: [{ command: "sudo ufw allow OpenSSH\nsudo ufw allow 'Nginx Full'\nsudo ufw enable\nsudo ufw status verbose", risk: "warning" }] },
      { title: "Harden SSH", description: "After key login is verified, disable direct root login and password authentication in an SSH config drop-in.", commands: [{ command: "sudoedit /etc/ssh/sshd_config.d/99-hardening.conf" }, { command: "sudo sshd -t && sudo systemctl reload ssh" }], note: "Set PermitRootLogin no and PasswordAuthentication no. Validate with sshd -t before reload." },
      { title: "Enable automated protection", description: "Install unattended security updates and Fail2ban, then confirm both services.", commands: [{ command: "sudo apt install -y unattended-upgrades fail2ban\nsudo dpkg-reconfigure -plow unattended-upgrades\nsudo systemctl enable --now fail2ban" }] },
    ],
    verification: ["A second terminal can sign in with the operator SSH key", "sudo ufw status shows only required inbound ports", "sudo sshd -t exits successfully", "systemctl is-active fail2ban returns active"],
  },
  {
    slug: "deploy-nestjs-pm2-nginx-ssl",
    path: "/developer-guides/deploy-nestjs-pm2-nginx-ssl",
    title: "Deploy NestJS with PM2, Nginx, and SSL",
    summary: "Build a NestJS API, keep it alive with PM2, reverse proxy it through Nginx, and issue an HTTPS certificate.",
    metaTitle: "Deploy NestJS with PM2, Nginx and SSL | ChlatWork",
    metaDescription: "Deploy a NestJS application behind Nginx with PM2 process management and a Let's Encrypt TLS certificate.",
    difficulty: "Intermediate", duration: "35–50 min", topics: ["NestJS", "PM2", "Nginx", "SSL"],
    prerequisites: ["A hardened Ubuntu server", "A supported Node.js LTS release installed", "A domain A/AAAA record pointing to the server", "Application configuration supplied outside Git"],
    steps: [
      { title: "Install and build", description: "Install exactly the locked dependencies, run project checks, and create the production build.", commands: [{ command: "cd /var/www/<app-name>\nnpm ci\nnpm run build" }] },
      { title: "Start with PM2", description: "Run the compiled NestJS entry point under a stable process name.", commands: [{ command: "pm2 start dist/main.js --name <app-name>\npm2 save\npm2 startup" }], note: "Run the additional sudo command printed by pm2 startup; it is specific to your user and host." },
      { title: "Add the Nginx reverse proxy", description: "Proxy the public domain to the local NestJS port and preserve request metadata.", commands: [{ language: "nginx", command: "server {\n  listen 80;\n  server_name <domain>;\n\n  location / {\n    proxy_pass http://127.0.0.1:<port>;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n  }\n}" }] },
      { title: "Enable and validate Nginx", description: "Link the site only after reviewing it, then test syntax before reload.", commands: [{ command: "sudo ln -s /etc/nginx/sites-available/<app-name> /etc/nginx/sites-enabled/<app-name>\nsudo nginx -t && sudo systemctl reload nginx" }] },
      { title: "Issue the TLS certificate", description: "Use Certbot's Nginx integration after DNS and HTTP are working.", commands: [{ command: "sudo apt install -y certbot python3-certbot-nginx\nsudo certbot --nginx -d <domain>" }] },
      { title: "Check runtime health", description: "Verify HTTPS, the process, proxy logs, and certificate renewal.", commands: [{ command: "curl -I https://<domain>\npm2 status\nsudo certbot renew --dry-run" }] },
    ], verification: ["HTTPS returns the expected status without a certificate warning", "PM2 shows the application online", "sudo nginx -t succeeds", "The NestJS port is not publicly exposed"],
  },
  {
    slug: "deploy-nestjs-docker-compose",
    path: "/developer-guides/deploy-nestjs-docker-compose",
    title: "Deploy NestJS with Docker Compose",
    summary: "Package a NestJS service as a small production image and operate it with Docker Compose, health checks, logs, and controlled updates.",
    metaTitle: "Deploy NestJS with Docker Compose | ChlatWork",
    metaDescription: "Build and deploy a production NestJS container with Docker Compose, health checks, logs, and safe update steps.",
    difficulty: "Intermediate", duration: "30–45 min", topics: ["NestJS", "Docker", "Compose"],
    prerequisites: ["Docker Engine with the Compose plugin", "A NestJS application with a lockfile", "Runtime settings stored outside the image"],
    steps: [
      { title: "Create a multi-stage image", description: "Build dependencies separately and run the compiled application as a non-root user.", commands: [{ language: "text", command: "FROM node:22-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build && npm prune --omit=dev\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=build --chown=node:node /app/node_modules ./node_modules\nCOPY --from=build --chown=node:node /app/dist ./dist\nUSER node\nCMD [\"node\", \"dist/main.js\"]" }] },
      { title: "Define the service", description: "Bind the API to loopback when a reverse proxy is on the same host and include a health check.", commands: [{ language: "yaml", command: "services:\n  api:\n    build: .\n    restart: unless-stopped\n    env_file: .env.production\n    ports:\n      - \"127.0.0.1:<port>:<port>\"\n    healthcheck:\n      test: [\"CMD\", \"wget\", \"-qO-\", \"http://localhost:<port>/health\"]\n      interval: 30s\n      timeout: 5s\n      retries: 3" }], warning: "Never commit .env.production or bake secrets into the image." },
      { title: "Build and start", description: "Validate the resolved Compose model, then build and launch in the background.", commands: [{ command: "docker compose config\ndocker compose up -d --build" }] },
      { title: "Inspect health and logs", description: "Confirm the container is healthy and watch startup output for configuration errors.", commands: [{ command: "docker compose ps\ndocker compose logs --tail=100 -f api" }] },
      { title: "Deploy an update", description: "Pull code or the pinned image, rebuild only what changed, and remove obsolete containers.", commands: [{ command: "docker compose pull\ndocker compose up -d --build --remove-orphans", risk: "warning" }] },
    ], verification: ["docker compose config reports no errors", "docker compose ps reports a healthy API", "The health endpoint responds through the reverse proxy", "No secret file is tracked by Git"],
  },
  {
    slug: "deploy-nestjs-aws-ec2",
    path: "/developer-guides/deploy-nestjs-aws-ec2",
    title: "Deploy NestJS on AWS EC2",
    summary: "Prepare an EC2 host, restrict its security group, deploy NestJS, attach stable DNS, and verify the production boundary.",
    metaTitle: "Deploy NestJS on AWS EC2 Guide | ChlatWork",
    metaDescription: "A security-conscious path for deploying NestJS on an AWS EC2 Ubuntu instance with restricted access, DNS, and HTTPS.",
    difficulty: "Advanced", duration: "45–70 min", topics: ["NestJS", "AWS", "EC2", "Security Groups"],
    prerequisites: ["An AWS account with least-privilege access", "An Ubuntu LTS EC2 instance", "An Elastic IP or stable load balancer address", "A domain you control"],
    steps: [
      { title: "Restrict the security group", description: "Allow SSH only from your trusted administration IP. Allow 80/443 publicly; do not expose the NestJS, PostgreSQL, or Redis ports.", warning: "Never use 0.0.0.0/0 for SSH, PostgreSQL, or Redis." },
      { title: "Connect with your key", description: "Use the downloaded key file by path. Never paste private-key contents into a form or repository.", commands: [{ command: "chmod 600 <identity-file>\nssh -i <identity-file> ubuntu@<elastic-ip>" }] },
      { title: "Patch and harden Ubuntu", description: "Apply the production Ubuntu guide before installing the application runtime.", commands: [{ command: "sudo apt update && sudo apt upgrade -y" }], note: "Complete the SSH, UFW, and automatic-update steps in the linked Ubuntu guide." },
      { title: "Deploy the application", description: "Choose the PM2 or Docker Compose guide and keep the application port bound to loopback behind Nginx.", commands: [{ command: "curl -I http://127.0.0.1:<port>/health" }] },
      { title: "Attach DNS and HTTPS", description: "Point the domain at the Elastic IP, wait for DNS resolution, then provision TLS through Nginx.", commands: [{ command: "dig +short <domain>\ncurl -I https://<domain>" }] },
      { title: "Add AWS operational safeguards", description: "Use an IAM role instead of static AWS keys, enable detailed monitoring as needed, and configure EBS snapshots and billing alarms.", note: "Backups and monitoring are separate controls; neither replaces application health checks." },
    ], verification: ["SSH is limited to approved source IPs", "Only ports 80 and 443 are publicly reachable for the app", "The domain resolves to the intended AWS address", "HTTPS and the application health endpoint succeed", "The instance uses an IAM role rather than stored AWS access keys"],
  },
  {
    slug: "secure-postgresql-redis",
    path: "/developer-guides/secure-postgresql-redis",
    title: "Set up PostgreSQL and Redis securely",
    summary: "Keep both data services private, create least-privilege access, enable modern authentication, and verify backups and network exposure.",
    metaTitle: "Secure PostgreSQL and Redis Setup Guide | ChlatWork",
    metaDescription: "Secure PostgreSQL and Redis with private networking, least-privilege users, SCRAM or ACL authentication, firewalls, and backups.",
    difficulty: "Advanced", duration: "40–60 min", topics: ["PostgreSQL", "Redis", "Security", "Backups"],
    prerequisites: ["A private network or single application host", "sudo access", "A password manager for generated credentials", "A tested backup destination"],
    steps: [
      { title: "Keep database ports private", description: "Bind to loopback for same-host applications or a specific private interface. Never expose 5432 or 6379 to the public internet.", commands: [{ command: "sudo ss -lntp | grep -E ':(5432|6379)'" }], warning: "Firewall rules are defense in depth; also restrict each service's listen address." },
      { title: "Use PostgreSQL SCRAM", description: "Set password_encryption to scram-sha-256 and restrict pg_hba.conf to the exact application network and database.", commands: [{ language: "text", command: "password_encryption = 'scram-sha-256'\nlisten_addresses = '127.0.0.1,<private-ip>'" }, { language: "text", command: "hostssl <database> <app-user> <private-cidr> scram-sha-256" }] },
      { title: "Create a least-privilege PostgreSQL role", description: "Create a login role and assign only the database and schema rights the application needs. Set its password interactively so it does not enter shell history.", commands: [{ language: "sql", command: "CREATE ROLE <app-user> LOGIN;\nCREATE DATABASE <database> OWNER <app-user>;\n\\password <app-user>" }] },
      { title: "Configure Redis access", description: "Enable protected mode, bind to loopback or a private interface, and use Redis 6+ ACL users with only required command categories and key patterns.", commands: [{ language: "text", command: "bind 127.0.0.1 <private-ip>\nprotected-mode yes\nport 6379\nuser default off\nuser <app-user> on >REPLACE_IN_CONFIG ~<app-prefix>:* +@read +@write" }], warning: "Replace the placeholder directly in a protected Redis configuration or secret-managed ACL file—not in shell history or Git." },
      { title: "Reload and verify", description: "Validate configuration, restart during an approved window, and test from allowed and denied network locations.", commands: [{ command: "sudo systemctl restart postgresql redis-server\nsudo systemctl --no-pager status postgresql redis-server", risk: "warning" }] },
      { title: "Back up and test restore", description: "Create encrypted, access-controlled PostgreSQL backups and Redis snapshots, copy them off-host, and regularly prove restoration works.", commands: [{ command: "pg_dump --format=custom --file=<backup-file> <database>" }], note: "Do not place database passwords in commands. Use a protected password file or interactive prompt." },
    ], verification: ["Public scans cannot reach ports 5432 or 6379", "PostgreSQL rejects unauthorized roles and networks", "Redis default user is disabled and the app ACL is restricted", "Service credentials are absent from Git and shell history", "A restore test succeeds from the latest backup"],
  },
];

export const DEVELOPER_GUIDE_PATHS = DEVELOPER_GUIDES.map((guide) => guide.path);

export function findDeveloperGuideByPath(path: string) {
  const normalizedPath = path.replace(/\/+$/, "");
  return DEVELOPER_GUIDES.find((guide) => guide.path === normalizedPath);
}
