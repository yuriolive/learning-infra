export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Rewrite host to the internal Google Cloud Run URL
    url.hostname = 'control-plane-110781160918.southamerica-east1.run.app';
    
    // Create new request with rewritten URL and Host header
    const newRequest = new Request(url.toString(), request);
    newRequest.headers.set('Host', url.hostname);
    
    // Log for debugging (optional)
    console.log(`Proxying ${request.url} -> ${url.toString()}`);
    
    return fetch(newRequest, {
      cf: {
        // Ensure SSL is handled correctly between Cloudflare and Google
        tlsVerify: true
      }
    });
  },
};
