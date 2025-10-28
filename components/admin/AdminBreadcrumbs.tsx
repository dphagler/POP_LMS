"use client";

import Link from "next/link";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Icon } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

type AdminBreadcrumbsProps = {
  items: AdminBreadcrumbItem[];
};

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  const baseCrumb: AdminBreadcrumbItem = { label: "Admin", href: "/admin" };

  const trail: AdminBreadcrumbItem[] = (() => {
    if (!items.length) {
      return [baseCrumb];
    }

    const [first, ...rest] = items;
    const normalizedFirst = first.label === baseCrumb.label ? { ...baseCrumb, ...first } : first;

    if (normalizedFirst.label !== baseCrumb.label || normalizedFirst.href !== baseCrumb.href) {
      return [baseCrumb, normalizedFirst, ...rest];
    }

    return [normalizedFirst, ...rest];
  })();

  return (
    <Breadcrumb
      spacing="0.5rem"
      separator={<Icon as={ChevronRight} boxSize={3} color="fg.muted" />}
      aria-label="Breadcrumb"
    >
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        if (isLast) {
          return (
            <BreadcrumbItem key={`${item.label}-${index}`} isCurrentPage>
              <BreadcrumbLink as="span" aria-current="page">
                {item.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
          );
        }

        const href = item.href ?? "#";
        return (
          <BreadcrumbItem key={`${item.label}-${index}`}>
            <BreadcrumbLink as={Link} href={href} color="fg.muted" _hover={{ color: "fg.emphasized" }}>
              {item.label}
            </BreadcrumbLink>
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}
