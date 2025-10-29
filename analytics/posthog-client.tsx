"use client";

import Script from "next/script";

export function PostHogClient() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  return (
    <>
      <Script
        id="posthog-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!(function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script"),p.type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js"),(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"};var c="capture identify alias people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_group people.group people.set_group".split(" ");for(var l=0;l<c.length;l++)g(u,c[l]);e._i.push([i,s,a])},e.__SV=1.2)})(document,window.posthog||[]);posthog.init('${key}',{api_host:'${host}',capture_pageview:false});`
        }}
      />
    </>
  );
}
