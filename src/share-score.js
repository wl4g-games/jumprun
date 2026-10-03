export function scoreShare(best, translate, href) {
  const score = Math.max(0, Math.floor(Number(best) || 0));
  const payload = { title: translate("动物跳跳跑"), text: translate("我在动物跳跳跑拿到了 {score} 颗星！来挑战我的最好成绩吧！").replace("{score}", String(score)) };
  const url = new URL(href);
  if (url.protocol === "https:" && !/^(localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)) {
    payload.url = url.origin + url.pathname;
  }
  return payload;
}
export async function shareScore(payload, platform) {
  if (platform.share) {
    try {
      await platform.share(payload);
      return { kind: "shared" };
    } catch (error) {
      if (error.name === "AbortError") return { kind: "cancelled" };
    }
  }
  const text = [payload.text, payload.url].filter(Boolean).join("\n");
  try {
    await platform.clipboard.writeText(text);
    return { kind: "copied" };
  } catch {
    return { kind: "manual", text };
  }
}
