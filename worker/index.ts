/**
 * Hosting adapter only.
 *
 * Static assets and SPA navigation are served by Cloudflare before this Worker
 * is invoked. Keeping a tiny Worker entry gives the Sites build pipeline the
 * standard dist/server/index.js artifact it expects without moving any
 * simulation logic out of the browser.
 */
export default {
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  },
};
