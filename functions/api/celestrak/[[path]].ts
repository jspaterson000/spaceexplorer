// Cloudflare Pages Function to proxy CelesTrak API requests
// This avoids CORS issues by making server-side requests

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // Build the CelesTrak URL from the path
  const celestrakPath = url.pathname.replace('/api/celestrak', '');
  const celestrakUrl = `https://celestrak.org${celestrakPath}${url.search}`;

  try {
    const response = await fetch(celestrakUrl, {
      headers: {
        'User-Agent': 'CosmicExplorer/1.0',
      },
    });

    if (!response.ok) {
      return new Response(`CelesTrak error: ${response.status}`, {
        status: response.status,
      });
    }

    const data = await response.text();

    return new Response(data, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(`Proxy error: ${error}`, { status: 500 });
  }
};
