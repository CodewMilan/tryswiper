"use client";

import NavbarSectionTwo from "@/components/ui/navbar-section-2";

const links = [
  { href: "/library", label: "Library" },
  { href: "/new", label: "Create" },
  { href: "/formats", label: "Formats" },
  { href: "/brand", label: "Brand kit" },
  { href: "/connect", label: "Connect" },
];

export function WorkspaceNav() {
  return (
    <NavbarSectionTwo
      mode="member"
      links={links}
      showNew={false}
      accountLinks={[
        { href: "/guide", label: "How to use Swiper" },
        { href: "/pricing", label: "Pricing" },
      ]}
    />
  );
}
