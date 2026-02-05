"use client";

import { Button, Chip } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "../../i18n/routing";
import { useTranslations } from "next-intl";

import { MockDashboard } from "../ui/mock-dashboard";

export const HeroSection = () => {
  const router = useRouter();
  const t = useTranslations("Hero");

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-background">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-[100%] blur-[120px] opacity-50"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
          <Chip
            variant="dot"
            color="primary"
            className="mb-8 border-primary/20 bg-primary/5 px-4 py-1"
            size="md"
          >
            {t("chip")}
          </Chip>

          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            {t("title")} <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>

          <p className="text-xl text-default-500 max-w-2xl mb-12 leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <Button
              size="lg"
              color="primary"
              variant="shadow"
              className="font-bold px-10 h-14 text-lg"
              endContent={<ArrowRight size={20} />}
                onPress={() => { router.push("/signup"); }}
            >
              {t("startTrial")}
            </Button>
            <Button
              size="lg"
              variant="bordered"
              className="font-semibold px-10 h-14 text-lg border-default-200 hover:border-primary transition-colors"
              onPress={() => {
                const element = document.querySelector("#features");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("learnMore")}
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative mx-auto max-w-6xl group p-6 sm:p-12">
          {/* Animated Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-[3rem] blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>

          <div className="relative transition-transform duration-700 group-hover:scale-[1.01]">
            <MockDashboard />
          </div>
        </div>
      </div>
    </section>
  );
};
