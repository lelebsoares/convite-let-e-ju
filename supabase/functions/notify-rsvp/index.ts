// Configure os secrets RESEND_API_KEY e NOTIFY_EMAIL no Supabase.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const { name, phone, attending, attendees } = await req.json();
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const notifyEmail = Deno.env.get("NOTIFY_EMAIL");
  if (!apiKey || !notifyEmail) {
    return new Response(JSON.stringify({ error: "E-mail ainda não configurado." }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const people = Array.isArray(attendees) ? attendees : [];
  const list = people.map((p: {name:string}) => `<li>${escapeHtml(p.name)}</li>`).join("");
  const html = `
    <h2>Nova resposta — Aniversário Let e Ju</h2>
    <p><b>Convidado:</b> ${escapeHtml(name)}</p>
    <p><b>WhatsApp:</b> ${escapeHtml(phone || "Não informado")}</p>
    <p><b>Presença:</b> ${attending ? "Confirmada" : "Não poderá comparecer"}</p>
    ${attending ? `<p><b>Pessoas na confirmação:</b></p><ul>${list}</ul><p><b>Total de lugares:</b> ${people.length}</p>` : ""}
  `;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Confirmação Let e Ju <onboarding@resend.dev>",
      to: [notifyEmail],
      subject: `RSVP: ${name} — ${attending ? "vai à festa" : "não poderá ir"}`,
      html
    })
  });
  const result = await response.text();
  return new Response(result, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c] ?? c));
}