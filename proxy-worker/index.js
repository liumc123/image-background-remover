/**
 * Cloudflare Worker - Reverse Proxy for rmbg-176.pages.dev
 * Routes rmbg.skyqing.online to the frontend deployment
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Forward to the Pages deployment
    const proxyUrl = `https://rmbg-176.pages.dev${url.pathname}${url.search}`;
    
    // Clone the request but change the URL
    const headers = new Headers(request.headers);
    headers.set('Host', 'rmbg-176.pages.dev');
    
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow',
    });
    
    const response = await fetch(proxyRequest);
    
    // Return the response with proper headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
