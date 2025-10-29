"use client";

import Link from "next/link";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Icon, chakra } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";

import { ADMIN_ROOT_LABEL, ADMIN_ROOT_PATH } from "@/lib/admin/nav";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

type AdminBreadcrumbsProps = {
  items: AdminBreadcrumbItem[];
};

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  const baseCrumb: AdminBreadcrumbItem = { label: ADMIN_ROOT_LABEL, href: ADMIN_ROOT_PATH };

  const trail: AdminBreadcrumbItem[] = (() => {
    if (items.length === 0) {
      return [baseCrumb];
    }

    const [first, ...rest] = items;
    const firstIsAdmin = first.label === baseCrumb.label;

    if (firstIsAdmin) {
      const mergedFirst = { ...baseCrumb, ...first, href: baseCrumb.href };
      return [mergedFirst, ...rest];
    }

    return [baseCrumb, first, ...rest];
  })();

  return (
    <chakra.nav aria-label="Breadcrumb">
      <Breadcrumb spacing="0.5rem" separator={<Icon as={ChevronRight} boxSize={3} color="fg.muted" />}> 
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

          return (
            <BreadcrumbItem key={`${item.label}-${index}`}>
              <BreadcrumbLink
                as={Link}
                href={item.href!}
                color="fg.muted"
                _hover={{ color: "fg.emphasized" }}
                aria-current={undefined}
              >
                {item.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
          );
        })}
      </Breadcrumb>
    </chakra.nav>
  );
}
