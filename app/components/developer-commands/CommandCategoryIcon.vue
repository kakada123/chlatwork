<script setup lang="ts">
import {
  Boxes,
  Cloud,
  Coffee,
  Database,
  Flame,
  LockKeyhole,
  Network,
  Package,
  Server,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-vue-next";
import {
  siDocker,
  siDotnet,
  siElectron,
  siGit,
  siGithub,
  siGo,
  siGooglecloud,
  siHelm,
  siKubernetes,
  siLaravel,
  siMongodb,
  siMysql,
  siNestjs,
  siNginx,
  siNodedotjs,
  siNpm,
  siPhp,
  siPm2,
  siPostgresql,
  siPython,
  siRedis,
  siRust,
  siSqlite,
  siTerraform,
  siTypeorm,
  siVuedotjs,
  siVercel,
  type SimpleIcon,
} from "simple-icons";
import type { Component } from "vue";

const props = defineProps<{ category: string }>();

const brandIcons: Record<string, SimpleIcon> = {
  Docker: siDocker,
  Git: siGit,
  NestJS: siNestjs,
  "Package Managers": siNpm,
  PostgreSQL: siPostgresql,
  Redis: siRedis,
  Nginx: siNginx,
  Laravel: siLaravel,
  "Vue / Vite": siVuedotjs,
  TypeORM: siTypeorm,
  PM2: siPm2,
  "GitHub CLI": siGithub,
  Kubernetes: siKubernetes,
  Helm: siHelm,
  Terraform: siTerraform,
  "Google Cloud CLI": siGooglecloud,
  MongoDB: siMongodb,
  MySQL: siMysql,
  SQLite: siSqlite,
  "Python / pip": siPython,
  Go: siGo,
  "Rust / Cargo": siRust,
  ".NET CLI": siDotnet,
  "PHP / Composer": siPhp,
  "Node.js": siNodedotjs,
  Vercel: siVercel,
  Electron: siElectron,
};

const utilityIcons: Record<string, Component> = {
  "Linux / Server": Server,
  SSH: Terminal,
  Network,
  "AWS CLI": Cloud,
  "Azure CLI": Cloud,
  "Java / Build Tools": Coffee,
  Systemd: Boxes,
  Firewall: ShieldCheck,
  "OpenSSL / TLS": LockKeyhole,
  "CI / CD": Workflow,
};

const brandIcon = computed(() => brandIcons[props.category]);
const utilityIcon = computed(() => utilityIcons[props.category] ?? Package);
</script>

<template>
  <svg
    v-if="brandIcon"
    viewBox="0 0 24 24"
    class="h-5 w-5 fill-current text-[var(--brand-color)]"
    :style="{ '--brand-color': `#${brandIcon.hex}` }"
    role="img"
    :aria-label="`${brandIcon.title} icon`"
  >
    <path :d="brandIcon.path" />
  </svg>
  <component
    :is="utilityIcon"
    v-else
    class="h-5 w-5"
    :stroke-width="2"
    aria-hidden="true"
  />
</template>
