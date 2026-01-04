export const onRequestGet = async () => {
  return new Response("PONG", {
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
};

