export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // URL do Túnel Cloudflare do WMPLAY
    const BACKEND_HOST = env.BACKEND_HOST || "remaining-postal-delete-pupils.trycloudflare.com";
    const targetUrl = new URL(url.pathname + url.search, `https://${BACKEND_HOST}`);

    const newHeaders = new Headers(request.headers);
    newHeaders.set("host", BACKEND_HOST);
    newHeaders.set("x-forwarded-host", url.host);
    newHeaders.set("x-forwarded-proto", "https");

    try {
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "follow",
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(`WMPLAY está inicializando ou conectando ao túnel. Recarregue em instantes... (${err.message})`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};
