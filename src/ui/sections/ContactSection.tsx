import { content } from '../../data/content'
import { SectionHeading, SectionShell } from './SectionShell'

/** Strips "https://" and "www." so a link reads as "github.com/you". */
function pretty(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

/** Section 5 — the supernova. The links sit in the dark centre of the ring. */
export function ContactSection() {
  const { email, github, linkedin } = content.contact
  const links = [
    { label: 'Email', text: email, href: `mailto:${email}`, external: false },
    { label: 'GitHub', text: pretty(github), href: github, external: true },
    { label: 'LinkedIn', text: pretty(linkedin), href: linkedin, external: true },
  ]

  return (
    <SectionShell id="contact" className="flex items-center justify-center px-6">
      {/* Sized to fit inside the ring: a share of the screen's height on wide
          screens (where the ring fills the height), of its width on tall ones. */}
      <div className="scrim text-center portrait:w-[min(64vw,22rem)] landscape:w-[min(46vh,28rem)]">
        <SectionHeading id="contact" label={content.sections.contact.label}>
          {content.sections.contact.heading}
        </SectionHeading>

        <ul className="mt-7 space-y-4">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="interactive glow-link group block"
              >
                <span className="block font-mono text-[10px] uppercase tracking-[0.32em] text-star-gold/80">
                  {link.label}
                </span>
                <span className="mt-1 block break-words text-[clamp(0.95rem,1.1vw+0.7rem,1.3rem)] font-light text-white transition-colors group-hover:text-star-gold">
                  {link.text}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
