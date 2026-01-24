"use client";

import { Divider, Link } from "@heroui/react";
import { Github, Twitter, MessageCircle } from "lucide-react";

const FooterSection = ({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) => (
  <div>
    <h4 className="font-bold mb-4">{title}</h4>
    <ul className="space-y-2 text-sm text-default-500">
      {links.map((link) => (
        <li key={link.label}>
          <Link href={link.href} color="foreground">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const SocialLinks = () => (
  <div className="flex gap-4">
    <Link href="#" color="foreground">
      <Github size={20} />
    </Link>
    <Link href="#" color="foreground">
      <Twitter size={20} />
    </Link>
    <Link href="#" color="foreground">
      <MessageCircle size={20} />
    </Link>
  </div>
);

export const Footer = () => {
  const sections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#" },
        { label: "Pricing", href: "#" },
        { label: "Integrations", href: "#" },
        { label: "Changelog", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "API Reference", href: "#" },
        { label: "Status Page", href: "#" },
        { label: "Community", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Security", href: "#" },
        { label: "GDPR", href: "#" },
      ],
    },
  ];

  return (
    <footer className="py-16 bg-default-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {sections.map((section) => (
            <FooterSection
              key={section.title}
              title={section.title}
              links={section.links}
            />
          ))}
        </div>

        <Divider />

        <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-4">
          <div className="text-sm text-default-400">
            © 2026 Vendin. All rights reserved.
          </div>
          <SocialLinks />
        </div>
      </div>
    </footer>
  );
};
