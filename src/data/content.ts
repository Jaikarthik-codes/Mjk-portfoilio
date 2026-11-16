/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ALL SITE CONTENT LIVES HERE.
 *  Edit this file to change any text, skill, project or link on the site.
 *  You never need to touch the 3D code to update content.
 *
 *  Everything marked TODO is placeholder text — swap in your own.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SkillGroup {
  /** Constellation name, e.g. "Frontend". */
  group: string
  /** One star per item. */
  items: string[]
}

export interface Project {
  /** Short unique id, used for URLs and keys. Lowercase, no spaces. */
  id: string
  title: string
  description: string
  /** Each tech becomes a small planet orbiting the project's star. */
  tech: string[]
  liveUrl?: string
  githubUrl?: string
}

export interface Content {
  /** Spelled out in particles on the intro screen. Short names read best. */
  name: string
  title: string
  bio: string
  skills: SkillGroup[]
  projects: Project[]
  contact: {
    email: string
    github: string
    linkedin: string
  }
  /** Shown on the secret planet's "about me" card in explore mode. */
  hobbies: string[]
  /** Navigation labels and headings for each scroll section. */
  sections: {
    intro: { label: string; scrollHint: string }
    about: { label: string; heading: string }
    skills: { label: string; heading: string }
    projects: { label: string; heading: string }
    contact: { label: string; heading: string }
  }
}

export const content: Content = {
  // TODO: guessed from the GitHub handle — replace with the name you want in lights.
  name: 'Jai Karthik',

  // TODO
  title: 'Software Developer',

  // TODO
  bio: 'I build fast, thoughtful software for the web — from pixel-perfect interfaces to the services behind them. I care about craft, clarity and the small details that make a product feel alive.',

  // TODO: one constellation per group
  skills: [
    {
      group: 'Frontend',
      items: ['React', 'TypeScript', 'Three.js', 'Tailwind CSS', 'GSAP'],
    },
    {
      group: 'Backend',
      items: ['Node.js', 'Python', 'PostgreSQL', 'REST APIs', 'GraphQL'],
    },
    {
      group: 'Tools',
      items: ['Git', 'Docker', 'Vite', 'Figma', 'Vercel'],
    },
  ],

  // TODO: your real projects
  projects: [
    {
      id: 'project-one',
      title: 'Project One',
      description: 'A short description of what this project does and why it matters.',
      tech: ['React', 'TypeScript', 'Node.js'],
      liveUrl: 'https://example.com',
      githubUrl: 'https://github.com/your-handle/project-one',
    },
    {
      id: 'project-two',
      title: 'Project Two',
      description: 'A short description of what this project does and why it matters.',
      tech: ['Python', 'PostgreSQL', 'Docker'],
      githubUrl: 'https://github.com/your-handle/project-two',
    },
    {
      id: 'project-three',
      title: 'Project Three',
      description: 'A short description of what this project does and why it matters.',
      tech: ['Three.js', 'GLSL', 'Vite'],
      liveUrl: 'https://example.com',
    },
  ],

  // TODO
  contact: {
    email: 'you@example.com',
    github: 'https://github.com/your-handle',
    linkedin: 'https://www.linkedin.com/in/your-handle',
  },

  // TODO
  hobbies: ['Stargazing', 'Photography', 'Chess', 'Sci-fi novels'],

  // `label` appears in the navigation, `heading` is the large line in the section.
  sections: {
    intro: { label: 'Origin', scrollHint: 'Scroll to begin' },
    about: { label: 'About', heading: 'Made of stardust and curiosity.' },
    skills: { label: 'Skills', heading: 'Constellations of craft.' },
    projects: { label: 'Projects', heading: 'Worlds I have built.' },
    contact: { label: 'Contact', heading: 'Let’s make something stellar.' },
  },
}
