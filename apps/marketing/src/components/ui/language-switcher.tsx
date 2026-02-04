"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "../../i18n/routing";
import { Select, SelectItem } from "@heroui/react";

export const LanguageSwitcher = () => {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="w-32">
      <Select
        aria-label={t("label")}
        selectedKeys={[locale]}
        onChange={handleSelectionChange}
        size="sm"
        variant="bordered"
        classNames={{
            trigger: "h-8 min-h-8",
            value: "text-small"
        }}
      >
        <SelectItem key="en">
          {t("en")}
        </SelectItem>
        <SelectItem key="es">
          {t("es")}
        </SelectItem>
        <SelectItem key="pt-br">
          {t("pt-br")}
        </SelectItem>
      </Select>
    </div>
  );
};
