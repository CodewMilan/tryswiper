/** Only operator-approved, public HTTPS destinations belong in these settings. */
export function legalLinks(env: NodeJS.ProcessEnv = process.env) {
  return [
    { label: "Privacy", value: env.SWIPER_PRIVACY_POLICY_URL },
    { label: "Terms", value: env.SWIPER_TERMS_URL },
  ].flatMap(({ label, value }) => {
    if (!value?.trim()) return [];
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      return [{ label, href: url.href }];
    } catch { return []; }
  });
}
