export default {
  async fetch(request) {
    const url = new URL(request.url);
    return Response.redirect("https://rmbg-176.pages.dev" + url.pathname + url.search, 301);
  }
};
