import { localizeMessageTree, translateMessage } from "../lib/i18n";
import type { DeveloperGuide, DeveloperGuideStep } from "./developer-guides";

type GuideCopy = Pick<DeveloperGuide, "title" | "summary" | "prerequisites" | "verification"> & {
  steps: Array<Omit<DeveloperGuideStep, "commands">>;
};

export const DEVELOPER_GUIDES_KM: Record<string, GuideCopy> = localizeMessageTree({
  "production-ubuntu-server": {
    "title": "catalog.developer_guides.production_ubuntu_server.title",
    "summary": "catalog.developer_guides.production_ubuntu_server.summary",
    "prerequisites": [
      "catalog.developer_guides.production_ubuntu_server.prerequisites.0",
      "catalog.developer_guides.production_ubuntu_server.prerequisites.1",
      "catalog.developer_guides.production_ubuntu_server.prerequisites.2"
    ],
    "steps": [
      {
        "title": "catalog.developer_guides.production_ubuntu_server.steps.0.title",
        "description": "catalog.developer_guides.production_ubuntu_server.steps.0.description"
      },
      {
        "title": "catalog.developer_guides.production_ubuntu_server.steps.1.title",
        "description": "catalog.developer_guides.production_ubuntu_server.steps.1.description"
      },
      {
        "title": "catalog.developer_guides.production_ubuntu_server.steps.2.title",
        "description": "catalog.developer_guides.production_ubuntu_server.steps.2.description",
        "warning": "catalog.developer_guides.production_ubuntu_server.steps.2.warning"
      },
      {
        "title": "catalog.developer_guides.production_ubuntu_server.steps.3.title",
        "description": "catalog.developer_guides.production_ubuntu_server.steps.3.description"
      },
      {
        "title": "catalog.developer_guides.production_ubuntu_server.steps.4.title",
        "description": "catalog.developer_guides.production_ubuntu_server.steps.4.description",
        "note": "catalog.developer_guides.production_ubuntu_server.steps.4.note"
      },
      {
        "title": "catalog.developer_guides.production_ubuntu_server.steps.5.title",
        "description": "catalog.developer_guides.production_ubuntu_server.steps.5.description"
      }
    ],
    "verification": [
      "catalog.developer_guides.production_ubuntu_server.verification.0",
      "catalog.developer_guides.production_ubuntu_server.verification.1",
      "catalog.developer_guides.production_ubuntu_server.verification.2",
      "catalog.developer_guides.production_ubuntu_server.verification.3"
    ]
  },
  "deploy-nestjs-pm2-nginx-ssl": {
    "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.title",
    "summary": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.summary",
    "prerequisites": [
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.prerequisites.0",
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.prerequisites.1",
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.prerequisites.2",
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.prerequisites.3"
    ],
    "steps": [
      {
        "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.0.title",
        "description": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.0.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.1.title",
        "description": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.1.description",
        "note": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.1.note"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.2.title",
        "description": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.2.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.3.title",
        "description": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.3.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.4.title",
        "description": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.4.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.5.title",
        "description": "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.steps.5.description"
      }
    ],
    "verification": [
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.verification.0",
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.verification.1",
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.verification.2",
      "catalog.developer_guides.deploy_nestjs_pm2_nginx_ssl.verification.3"
    ]
  },
  "deploy-nestjs-docker-compose": {
    "title": "catalog.developer_guides.deploy_nestjs_docker_compose.title",
    "summary": "catalog.developer_guides.deploy_nestjs_docker_compose.summary",
    "prerequisites": [
      "catalog.developer_guides.deploy_nestjs_docker_compose.prerequisites.0",
      "catalog.developer_guides.deploy_nestjs_docker_compose.prerequisites.1",
      "catalog.developer_guides.deploy_nestjs_docker_compose.prerequisites.2"
    ],
    "steps": [
      {
        "title": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.0.title",
        "description": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.0.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.1.title",
        "description": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.1.description",
        "warning": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.1.warning"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.2.title",
        "description": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.2.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.3.title",
        "description": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.3.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.4.title",
        "description": "catalog.developer_guides.deploy_nestjs_docker_compose.steps.4.description"
      }
    ],
    "verification": [
      "catalog.developer_guides.deploy_nestjs_docker_compose.verification.0",
      "catalog.developer_guides.deploy_nestjs_docker_compose.verification.1",
      "catalog.developer_guides.deploy_nestjs_docker_compose.verification.2",
      "catalog.developer_guides.deploy_nestjs_docker_compose.verification.3"
    ]
  },
  "deploy-nestjs-aws-ec2": {
    "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.title",
    "summary": "catalog.developer_guides.deploy_nestjs_aws_ec2.summary",
    "prerequisites": [
      "catalog.developer_guides.deploy_nestjs_aws_ec2.prerequisites.0",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.prerequisites.1",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.prerequisites.2",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.prerequisites.3"
    ],
    "steps": [
      {
        "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.0.title",
        "description": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.0.description",
        "warning": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.0.warning"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.1.title",
        "description": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.1.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.2.title",
        "description": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.2.description",
        "note": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.2.note"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.3.title",
        "description": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.3.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.4.title",
        "description": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.4.description"
      },
      {
        "title": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.5.title",
        "description": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.5.description",
        "note": "catalog.developer_guides.deploy_nestjs_aws_ec2.steps.5.note"
      }
    ],
    "verification": [
      "catalog.developer_guides.deploy_nestjs_aws_ec2.verification.0",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.verification.1",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.verification.2",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.verification.3",
      "catalog.developer_guides.deploy_nestjs_aws_ec2.verification.4"
    ]
  },
  "secure-postgresql-redis": {
    "title": "catalog.developer_guides.secure_postgresql_redis.title",
    "summary": "catalog.developer_guides.secure_postgresql_redis.summary",
    "prerequisites": [
      "catalog.developer_guides.secure_postgresql_redis.prerequisites.0",
      "catalog.developer_guides.secure_postgresql_redis.prerequisites.1",
      "catalog.developer_guides.secure_postgresql_redis.prerequisites.2",
      "catalog.developer_guides.secure_postgresql_redis.prerequisites.3"
    ],
    "steps": [
      {
        "title": "catalog.developer_guides.secure_postgresql_redis.steps.0.title",
        "description": "catalog.developer_guides.secure_postgresql_redis.steps.0.description",
        "warning": "catalog.developer_guides.secure_postgresql_redis.steps.0.warning"
      },
      {
        "title": "catalog.developer_guides.secure_postgresql_redis.steps.1.title",
        "description": "catalog.developer_guides.secure_postgresql_redis.steps.1.description"
      },
      {
        "title": "catalog.developer_guides.secure_postgresql_redis.steps.2.title",
        "description": "catalog.developer_guides.secure_postgresql_redis.steps.2.description"
      },
      {
        "title": "catalog.developer_guides.secure_postgresql_redis.steps.3.title",
        "description": "catalog.developer_guides.secure_postgresql_redis.steps.3.description",
        "warning": "catalog.developer_guides.secure_postgresql_redis.steps.3.warning"
      },
      {
        "title": "catalog.developer_guides.secure_postgresql_redis.steps.4.title",
        "description": "catalog.developer_guides.secure_postgresql_redis.steps.4.description"
      },
      {
        "title": "catalog.developer_guides.secure_postgresql_redis.steps.5.title",
        "description": "catalog.developer_guides.secure_postgresql_redis.steps.5.description",
        "note": "catalog.developer_guides.secure_postgresql_redis.steps.5.note"
      }
    ],
    "verification": [
      "catalog.developer_guides.secure_postgresql_redis.verification.0",
      "catalog.developer_guides.secure_postgresql_redis.verification.1",
      "catalog.developer_guides.secure_postgresql_redis.verification.2",
      "catalog.developer_guides.secure_postgresql_redis.verification.3",
      "catalog.developer_guides.secure_postgresql_redis.verification.4"
    ]
  }
}, "km");

export function localizeDeveloperGuide(guide: DeveloperGuide, locale: "en" | "km"): DeveloperGuide {
  const copy = DEVELOPER_GUIDES_KM[guide.slug];
  if (locale === "en" || !copy) return guide;
  return {
    ...guide, ...copy,
    metaTitle: `${copy.title} | ChlatWork`, metaDescription: copy.summary,
    duration: guide.duration.replace(/\bmin\b/g, translateMessage("km", "catalog.common.minutes")),
    topics: guide.topics.map(topic => ({ "Security Groups": translateMessage("km", "catalog.common.security_groups"), Security: translateMessage("km", "catalog.common.security"), Backups: translateMessage("km", "catalog.common.backups") })[topic] ?? topic),
    // Executable examples and their risk levels are language-independent.
    steps: guide.steps.map((step, index) => ({ ...step, ...copy.steps[index] })),
  };
}
