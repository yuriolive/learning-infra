"use client";

import { Divider, Link } from "@heroui/react";
import { Github, Twitter, MessageCircle } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-16 bg-default-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Integrations
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Status Page
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  Security
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  GDPR
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Divider />

        <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-4">
          <div className="text-sm text-default-400">
            © 2026 Vendin. All rights reserved.
          </div>

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
        </div>
      </div>
    </footer>
  );
};
