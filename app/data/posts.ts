export type PostSection = {
  number: number;
  icon: string;
  category: string;
  title: string;
  paragraphs: string[];
  whyItMatters: string[];
};

export type EditorialPost = {
  slug: string;
  path: string;
  title: string;
  description: string;
  dek: string;
  publishedAt: string;
  updatedAt: string;
  displayDate: string;
  author: string;
  readingMinutes: number;
  imagePath: string;
  imageAlt: string;
  sections: PostSection[];
  developerWatch: string[];
  securityWatch: string[];
  marketSnapshot: string[];
  keyTakeaways: string[];
  editorialNote: string;
};

export const POSTS: EditorialPost[] = [
  {
    slug: "daily-briefing-july-31-2026",
    path: "/posts/daily-briefing-july-31-2026",
    title: "Daily Briefing — July 31, 2026",
    description:
      "A concise briefing on AI infrastructure, software development, enterprise AI, Cambodia's technology ecosystem, security, and financial markets.",
    dek: "A curated update on AI, technology, software development, business, Cambodia, world news, and financial markets.",
    publishedAt: "2026-07-31T08:00:00+07:00",
    updatedAt: "2026-07-31T08:00:00+07:00",
    displayDate: "July 31, 2026",
    author: "Kakada Ngen",
    readingMinutes: 6,
    imagePath: "/images/posts/daily-briefing-2026-07-31.png",
    imageAlt:
      "Editorial collage showing AI data centers, software development, enterprise AI, Cambodia's digital economy, and global markets.",
    sections: [
      {
        number: 1,
        icon: "🤖",
        category: "AI & Tech",
        title: "AI Infrastructure Race Continues to Accelerate",
        paragraphs: [
          "Major technology companies continue investing aggressively in hyperscale data centers, GPUs, networking, storage, cooling, and power capacity to support growing enterprise AI demand.",
          "Compute availability is increasingly becoming one of the industry's most important long-term competitive advantages.",
        ],
        whyItMatters: [
          "More compute can make AI services faster and less expensive.",
          "Cloud providers can offer stronger AI platforms to enterprises and developers.",
          "Infrastructure cost and availability increasingly affect which AI products can scale.",
        ],
      },
      {
        number: 2,
        icon: "💻",
        category: "Software Development",
        title: "AI Is Reshaping the Entire Software Lifecycle",
        paragraphs: [
          "AI tools are being used across planning, architecture, coding, testing, documentation, deployment, debugging, and maintenance.",
          "The strongest results still come from teams that combine AI assistance with sound engineering practices and human review.",
        ],
        whyItMatters: [
          "AI can increase development speed, but it does not replace system design or code ownership.",
          "Automated testing, observability, and security reviews are becoming even more important.",
          "Developers increasingly need to review and validate generated code rather than only write code manually.",
        ],
      },
      {
        number: 3,
        icon: "🚀",
        category: "Startups & Business",
        title: "Investors Continue Backing Enterprise AI",
        paragraphs: [
          "Early-stage investors remain focused on enterprise AI, cybersecurity, developer tools, fintech, infrastructure software, and workflow automation.",
          "Businesses are also using AI for sourcing, due diligence, customer support, and internal operations.",
        ],
        whyItMatters: [
          "Investors continue favoring products that solve measurable business problems.",
          "Developer infrastructure and cybersecurity remain attractive startup categories.",
          "Sustainable revenue and real customer adoption matter more than AI branding alone.",
        ],
      },
      {
        number: 4,
        icon: "🇰🇭",
        category: "Cambodia",
        title: "AI and Startup Ecosystem Continues Building Momentum",
        paragraphs: [
          "Cambodia continues developing its technology ecosystem through AI initiatives, startup programs, digital-skills events, international partnerships, and broader digital-transformation efforts.",
        ],
        whyItMatters: [
          "A growing digital economy creates opportunities in SaaS, fintech, logistics, cloud services, and enterprise software.",
          "Local developers and founders can increasingly build for both Cambodian and regional markets.",
          "Digital-skills programs can help startups, SMEs, and students adopt useful technology more quickly.",
        ],
      },
      {
        number: 5,
        icon: "🌍",
        category: "World News & Finance",
        title: "AI Remains a Dominant Investment Theme",
        paragraphs: [
          "Global investors continue prioritizing AI infrastructure, cloud platforms, semiconductors, cybersecurity, and enterprise software despite market volatility and economic uncertainty.",
        ],
        whyItMatters: [
          "AI spending is influencing technology stocks, cloud growth, and semiconductor demand.",
          "Investors are paying closer attention to capital expenditure, free cash flow, and measurable AI revenue.",
          "Companies with scalable infrastructure and sustainable enterprise demand are likely to attract the strongest confidence.",
        ],
      },
    ],
    developerWatch: [
      "Automated testing",
      "Dependency auditing",
      "Secret scanning",
      "Distributed tracing with OpenTelemetry",
      "Queue-based and event-driven architectures",
      "Human review of AI-generated code",
    ],
    securityWatch: [
      "Protect AI-agent credentials, tokens, and API keys.",
      "Audit third-party AI integrations before production use.",
      "Keep dependencies updated and scan for known vulnerabilities.",
      "Apply least-privilege permissions to AI tools and services.",
      "Maintain logs for actions performed by automated agents.",
    ],
    marketSnapshot: [
      "AI infrastructure remains a major technology investment theme.",
      "Enterprise AI, developer tools, and cybersecurity continue attracting funding.",
      "Cambodia's technology ecosystem continues expanding through skills programs and partnerships.",
      "The AI industry is shifting from standalone models toward complete, secure, production-ready ecosystems.",
    ],
    keyTakeaways: [
      "Infrastructure is becoming a defining AI advantage.",
      "AI-assisted development still requires strong engineering discipline.",
      "Investors continue favoring practical enterprise AI products.",
      "Cambodia is creating more opportunities for digital startups and developers.",
      "Security, governance, and measurable returns are becoming central to AI adoption.",
    ],
    editorialNote:
      "This briefing is a high-level editorial summary supplied by the author. It does not provide investment advice, live market prices, or independently sourced reporting. Readers should verify time-sensitive claims with primary sources before making business or financial decisions.",
  },
];

export const POST_PATHS = POSTS.map((post) => post.path);

export function findPostByPath(path: string) {
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

  return POSTS.find((post) => post.path === normalizedPath) ?? null;
}
