"use client";

import { Accordion, AccordionItem } from "@heroui/react";

const faqs = [
  {
    question: "How is this different from Shopify?",
    answer:
      "Vendin uses a multi-instance model where each store gets physically isolated infrastructure with its own database and compute. Shopify uses shared multi-tenancy. This gives you true data isolation and better security.",
  },
  {
    question: "What is the provisioning time?",
    answer:
      "Less than 2 minutes from signup to live admin dashboard. The entire process is fully automated including database creation, compute deployment, and DNS configuration.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes! Custom domains are fully supported with automatic SSL certificate provisioning via Cloudflare for SaaS. Just add your domain and point your DNS records.",
  },
  {
    question: "How does scale-to-zero work?",
    answer:
      "Your store's compute instances automatically sleep after 15 minutes of inactivity, reducing costs by up to 60%. When traffic arrives, instances wake up in under 2 seconds with no visible delay to customers.",
  },
  {
    question: "What payment gateways are supported?",
    answer:
      "We support Stripe, PayPal, and other major payment processors via MedusaJS plugins. Additional gateways can be added through the plugin ecosystem.",
  },
  {
    question: "Is there a free tier?",
    answer:
      "Yes! The free tier includes up to 100 products and 1,000 orders per month with all core features. Perfect for testing or small stores.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Absolutely. You have full data ownership and can export all your data anytime via API or the admin dashboard. No vendor lock-in.",
  },
];

export const FAQSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-default-500">
            Have questions? We have answers.
          </p>
        </div>

        <Accordion variant="splitted">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              aria-label={faq.question}
              title={faq.question}
            >
              {faq.answer}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
