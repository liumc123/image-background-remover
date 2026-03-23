/**
 * Cloudflare Worker - Image Background Remover
 * Uses Remove.bg API to remove image backgrounds
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const formData = await request.formData();
      const imageFile = formData.get('image');

      if (!imageFile) {
        return new Response('No image provided', { status: 400 });
      }

      // Validate file size (10MB max)
      if (imageFile.size > 10 * 1024 * 1024) {
        return new Response('File too large. Max 10MB allowed.', { status: 400 });
      }

      // Convert to base64
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64Image = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Call Remove.bg API
      const apiKey = env.REMOVE_BG_API_KEY;
      if (!apiKey) {
        return new Response('API key not configured', { status: 500 });
      }

      const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          image_file_b64: base64Image,
          size: 'auto',
          format: 'png',
        }),
      });

      if (!removeBgResponse.ok) {
        const error = await removeBgResponse.text();
        console.error('Remove.bg API error:', error);
        return new Response('Background removal failed', { status: 500 });
      }

      // Return the result image
      const resultBuffer = await removeBgResponse.arrayBuffer();

      return new Response(resultBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};