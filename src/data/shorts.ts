// src/data/shorts.ts
export type Short = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  video_url: string;
  light?: boolean | string; // thumbnail or true
  duration_min: number;
  tags: string[];
  quiz: {
    questions: Array<{
      q: string;
      options: string[];
      correctIndex: number;
      explain?: string;
      points?: number;
    }>;
  };
  preview?: boolean; // show to non-signed-in users
};

/** 2 example shorts + 1 small module topic */
export const SHORTS: Short[] = [
  {
    id: "short-001",
    slug: "ruby-in-red-wines",
    title: "‘Ruby’ in Red Wines: What It Really Signals",
    summary:
      "How ‘ruby’ differs from garnet or purple, what it hints about grape, age and extraction—plus a quick look at rim vs core.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    light: true,
    duration_min: 9,
    tags: ["colour", "sight", "sensory"],
    preview: true,
    quiz: {
      questions: [
        {
          q: "A classic ‘ruby’ hue most often suggests…",
          options: [
            "Very old Nebbiolo",
            "Youthful, mid-weight reds (e.g., Pinot, Sangiovese)",
            "Heavily extracted young Shiraz",
            "Oxidised red wine"
          ],
          correctIndex: 1,
          explain:
            "Ruby sits between purple and garnet—commonly seen in youthful, mid-weight reds where extraction and age are moderate.",
          points: 2
        },
        {
          q: "A ruby core with a slightly paler rim most likely indicates:",
          options: [
            "Extreme age (30+ years)",
            "Slight development and/or moderate extraction",
            "Heavy new oak influence",
            "Fortified style"
          ],
          correctIndex: 1,
          explain:
            "A mild fade to the rim can indicate some bottle age or simply a lighter extraction style.",
          points: 2
        }
      ]
    }
  },
  {
    id: "short-002",
    slug: "primary-aromas-fruit-first",
    title: "Primary Aromas: Fruit First",
    summary:
      "Quick framework for separating primary fruit from secondary (winemaking) and tertiary (age) notes—so your notes sound confident.",
    video_url: "https://player.vimeo.com/video/76979871",
    light: true,
    duration_min: 8,
    tags: ["aroma", "smell", "sensory"],
    preview: true,
    quiz: {
      questions: [
        {
          q: "Which is MOST likely a primary aroma?",
          options: ["Vanilla", "Leather", "Blackcurrant", "Hazelnut"],
          correctIndex: 2,
          explain:
            "Blackcurrant is a grape-derived fruit note. Vanilla = oak (secondary); leather/hazelnut often tertiary/age or oak-related.",
          points: 2
        },
        {
          q: "Separating primary from secondary helps because…",
          options: [
            "It’s required by law",
            "It makes your descriptors sound precise and consistent",
            "It changes the alcohol content",
            "It only applies to white wines"
          ],
          correctIndex: 1,
          explain: "Clarity = confidence. You’ll be faster and more consistent describing wines.",
          points: 2
        }
      ]
    }
  }
];
