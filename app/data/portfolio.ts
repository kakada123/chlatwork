export type PortfolioIcon = {
  paths: string[];
  viewBox?: string;
};

export type PortfolioSkillGroup = {
  title: string;
  description: string;
  skills: string[];
  icon: PortfolioIcon;
  accent: string;
};

export type PortfolioProject = {
  title: string;
  description: string;
  tags: string[];
  icon: PortfolioIcon;
  accent: string;
};

export type PortfolioWorkingStyle = {
  title: string;
  description: string;
  icon: PortfolioIcon;
};

export type PortfolioContactLink = {
  label: string;
  value: string;
  href: string;
  icon: PortfolioIcon;
};

export const portfolioProfile = {
  name: "Kakada Ngen",
  title: "Backend & Full-Stack Developer",
  tagline:
    "I build real-world business systems, POS applications, APIs, dashboards, and automation tools.",
  cvPath: "/kakada-ngen-cv.txt",
};

export const portfolioMetrics = [
  { value: "Backend", label: "API architecture, validation, guards" },
  { value: "POS", label: "Electron, printing, payment sockets" },
  { value: "Full-stack", label: "Vue, Nuxt, Laravel, NestJS" },
];

export const portfolioAbout = [
  "Kakada is a backend-focused full-stack developer who builds practical software for business operations. His work connects APIs, dashboards, POS devices, desktop apps, and automation into systems people can use every day.",
  "He focuses on backend architecture, Laravel and NestJS APIs, Electron desktop applications, Vue and Nuxt interfaces, Socket.IO workflows, receipt printing, and business automation that keeps operational teams moving.",
];

export const portfolioHighlights = [
  "Backend architecture for business workflows",
  "POS systems with hardware and payment integration",
  "Secure APIs, dashboards, and automation tools",
];

export const portfolioSkills: PortfolioSkillGroup[] = [
  {
    title: "Backend",
    description:
      "Service logic, API boundaries, validation, guards, and clean modules.",
    skills: [
      "NestJS",
      "Laravel",
      "REST APIs",
      "Microservices",
      "Queues",
      "Socket.IO",
    ],
    accent: "from-cyan-300 to-blue-500",
    icon: {
      paths: [
        "M5 6.5h14",
        "M5 12h14",
        "M5 17.5h14",
        "M7.5 4v5",
        "M16.5 9v6",
        "M7.5 15v5",
      ],
    },
  },
  {
    title: "Frontend",
    description:
      "Focused interfaces for dashboards, forms, reports, and tool surfaces.",
    skills: [
      "Vue.js",
      "Nuxt",
      "TailwindCSS",
      "PrimeVue",
      "Dashboards",
      "SPA UX",
    ],
    accent: "from-emerald-300 to-teal-500",
    icon: {
      paths: ["M4 5h16v12H4V5Z", "M8 21h8", "M12 17v4", "M8 9h8", "M8 13h5"],
    },
  },
  {
    title: "Desktop/POS",
    description:
      "Production desktop flows for checkout counters and real hardware.",
    skills: [
      "Electron",
      "POS flows",
      "Receipt printing",
      "Customer display",
      "Payment sockets",
      "Hardware integration",
    ],
    accent: "from-orange-300 to-rose-500",
    icon: {
      paths: [
        "M6 4h12v10H6V4Z",
        "M8 18h8",
        "M9 14v4",
        "M15 14v4",
        "M7 8h10",
        "M9 11h6",
      ],
    },
  },
  {
    title: "Database",
    description:
      "Data structures and queries that support reporting and operational rules.",
    skills: [
      "MySQL",
      "PostgreSQL",
      "Redis",
      "Migrations",
      "Query design",
      "Reporting data",
    ],
    accent: "from-violet-300 to-fuchsia-500",
    icon: {
      paths: [
        "M5 7c0-2 3.1-3.5 7-3.5S19 5 19 7s-3.1 3.5-7 3.5S5 9 5 7Z",
        "M5 7v5c0 2 3.1 3.5 7 3.5s7-1.5 7-3.5V7",
        "M5 12v5c0 2 3.1 3.5 7 3.5s7-1.5 7-3.5v-5",
      ],
    },
  },
  {
    title: "DevOps/Tools",
    description:
      "Practical delivery support for local development, logs, builds, and deploys.",
    skills: ["Docker", "GitHub", "Vercel", "Logging", "Automation", "API docs"],
    accent: "from-slate-300 to-zinc-500",
    icon: {
      paths: [
        "M12 3v4",
        "M12 17v4",
        "M4.8 7.2l2.8 2.8",
        "M16.4 14l2.8 2.8",
        "M3 12h4",
        "M17 12h4",
        "M4.8 16.8l2.8-2.8",
        "M16.4 10l2.8-2.8",
        "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
      ],
    },
  },
];

export const portfolioProjects: PortfolioProject[] = [
  {
    title: "POS Desktop System",
    description:
      "Electron + Vue POS application with receipt printing, payment socket integration, customer display, reports, and hardware integration.",
    tags: ["Electron", "Vue", "Receipt printing", "Socket integration"],
    accent: "from-orange-300 to-rose-500",
    icon: {
      paths: [
        "M5 4h14v11H5V4Z",
        "M8 19h8",
        "M9 15v4",
        "M15 15v4",
        "M8 8h8",
        "M8 11h4",
      ],
    },
  },
  {
    title: "ChlatWork",
    description:
      "Web utilities platform for everyday tools like QR generator, barcode generator, image tools, and productivity utilities.",
    tags: ["Nuxt", "Tools", "Image utilities", "Productivity"],
    accent: "from-cyan-300 to-blue-500",
    icon: {
      paths: [
        "M4 5h7v7H4V5Z",
        "M13 5h7v7h-7V5Z",
        "M4 14h7v5H4v-5Z",
        "M13 14h7v5h-7v-5Z",
      ],
    },
  },
  {
    title: "SMS Gateway API",
    description:
      "NestJS API with API key guard, validation, rate limit, and external SMS gateway integration.",
    tags: ["NestJS", "API key guard", "Rate limit", "Validation"],
    accent: "from-emerald-300 to-teal-500",
    icon: {
      paths: [
        "M5 6h14v10H8l-3 3V6Z",
        "M8 9h8",
        "M8 12h5",
        "M17 18l2 2",
        "M19 18l-2 2",
      ],
    },
  },
  {
    title: "B2B Credit Management",
    description:
      "Laravel system for B2B credit limit checking, agreement expiry notification, and customer management.",
    tags: ["Laravel", "Credit limits", "Notifications", "Customer management"],
    accent: "from-violet-300 to-fuchsia-500",
    icon: {
      paths: ["M6 4h12v16H6V4Z", "M9 8h6", "M9 12h6", "M9 16h3", "M16 16h.01"],
    },
  },
];

export const portfolioWorkingStyle: PortfolioWorkingStyle[] = [
  {
    title: "Clean Architecture",
    description:
      "Separate business rules from transport details so APIs, jobs, and UI flows stay easier to change.",
    icon: {
      paths: ["M12 3 4 7v10l8 4 8-4V7l-8-4Z", "M4 7l8 4 8-4", "M12 11v10"],
    },
  },
  {
    title: "Security First",
    description:
      "Use validation, guards, rate limits, privacy-aware logging, and narrow permissions for business systems.",
    icon: {
      paths: [
        "M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z",
        "M9 12l2 2 4-4",
      ],
    },
  },
  {
    title: "Performance Mindset",
    description:
      "Keep heavy workflows observable, reduce unnecessary round trips, and design data access around real screens.",
    icon: {
      paths: ["M13 2 4 14h7l-1 8 9-12h-7l1-8Z"],
    },
  },
  {
    title: "Maintainable Delivery",
    description:
      "Prefer small reviewable changes, clear module boundaries, and code comments where business intent is hidden.",
    icon: {
      paths: ["M6 4h12v16H6V4Z", "M9 8h6", "M9 12h6", "M9 16h4"],
    },
  },
];

export const portfolioContacts: PortfolioContactLink[] = [
  {
    label: "Email",
    value: "kakada127@gmail.com",
    href: "mailto:kakada127@gmail.com",
    icon: {
      paths: ["M4 6h16v12H4V6Z", "M4 7l8 6 8-6"],
    },
  },
  {
    label: "GitHub",
    value: "github.com/kakada123",
    href: "https://github.com/kakada123",
    icon: {
      paths: [
        "M9 19c-4 1.2-4-2-5-2.5",
        "M15 21v-3.5c0-1 .3-1.7.8-2.2 2.6-.3 5.2-1.3 5.2-5.8a4.5 4.5 0 0 0-1.2-3.1c.1-.3.5-1.6-.1-3.1 0 0-1-.3-3.3 1.2a11.5 11.5 0 0 0-6 0C8.1 3 7.1 3.3 7.1 3.3c-.6 1.5-.2 2.8-.1 3.1A4.5 4.5 0 0 0 5.8 9.5c0 4.5 2.6 5.5 5.2 5.8.4.4.7 1 .8 1.8V21",
      ],
    },
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/kakada-ngen-963028159",
    href: "https://www.linkedin.com/in/kakada-ngen-963028159/",
    icon: {
      paths: [
        "M6.5 9.5V19",
        "M6.5 6.5h.01",
        "M11 19v-5.3c0-2.5 1.4-4 3.6-4 2.1 0 3.4 1.5 3.4 4V19",
        "M11 10v9",
      ],
    },
  },
  {
    label: "Telegram",
    value: "t.me/kakadangen",
    href: "https://t.me/kakadangen",
    icon: {
      paths: ["M21 4 3 11.5l6.5 2.3L12 20l3.4-5.1L21 4Z", "M9.5 13.8 21 4"],
    },
  },
];
