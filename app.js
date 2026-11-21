const cfg = window.APP_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("SUA_") &&
                   cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith("SUA_");
const supabaseClient = configured && window.supabase
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

const form = document.querySelector("#rsvp-form");
const companions = document.querySelector("#companions");
const countButtons = [...document.querySelectorAll(".count-btn")];
const attendeeFields = document.querySelector("#attendee-fields");
let companionCount = 0;

function personCard(index) {
  return `<div class="companion-card">
    <h3>${index === 0 ? "Sua foto" : `Acompanhante ${index}`}</h3>
    <label for="person-photo-${index}">Foto (JPG ou PNG, até 3 MB)</label>
    <input id="person-photo-${index}" type="file" accept="image/png,image/jpeg,image/webp" ${index === 0 ? "required" : "required"}>
    ${index > 0 ? `<label for="person-name-${index}">Nome do acompanhante</label><input id="person-name-${index}" maxlength="70" placeholder="Nome completo" required>` : ""}
  </div>`;
}
function renderPeople() {
  companions.innerHTML = personCard(0) + Array.from({length: companionCount}, (_, i) => personCard(i + 1)).join("");
}
function setCompanionCount(n) {
  companionCount = n;
  countButtons.forEach(b => b.classList.toggle("active", Number(b.dataset.count) === n));
  renderPeople();
}
countButtons.forEach(b => b.addEventListener("click", () => setCompanionCount(Number(b.dataset.count))));
document.querySelectorAll('input[name="attending"]').forEach(r => r.addEventListener("change", () => {
  const yes = document.querySelector('input[name="attending"]:checked').value === "yes";
  attendeeFields.hidden = !yes;
  if (yes) renderPeople();
}));
setCompanionCount(0);

function showMessage(text, error=false) {
  const el = document.querySelector("#form-message");
  el.textContent = text;
  el.style.color = error ? "#a13d58" : "#477a5c";
}
function safeName(name) { return name.trim().replace(/\s+/g, " "); }

async function uploadPhoto(file, id) {
  if (!file || !["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Envie uma foto JPG, PNG ou WebP para cada pessoa.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Cada foto precisa ter no máximo 3 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseClient.storage.from(cfg.STORAGE_BUCKET || "guest-photos").upload(path, file, {contentType:file.type, upsert:false});
  if (error) throw error;
  const { data } = supabaseClient.storage.from(cfg.STORAGE_BUCKET || "guest-photos").getPublicUrl(path);
  return data.publicUrl;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!supabaseClient) {
    showMessage("O site ainda precisa ser conectado ao Supabase. Veja o arquivo LEIA-ME dentro do projeto.", true);
    return;
  }
  const btn = document.querySelector("#submit-btn");
  btn.disabled = true; btn.textContent = "ENVIANDO...";
  showMessage("");
  try {
    const name = safeName(document.querySelector("#guest-name").value);
    const phone = document.querySelector("#guest-phone").value.trim();
    const attending = document.querySelector('input[name="attending"]:checked').value === "yes";
    let people = [];
    if (attending) {
      const total = companionCount + 1;
      for (let i=0; i<total; i++) {
        const file = document.querySelector(`#person-photo-${i}`).files[0];
        const personName = i === 0 ? name : safeName(document.querySelector(`#person-name-${i}`).value);
        if (!file) throw new Error(`Adicione a foto de ${i === 0 ? "sua pessoa" : personName}.`);
        people.push({name:personName, file});
      }
      const groupId = crypto.randomUUID();
      people = await Promise.all(people.map(async p => ({name:p.name, photo_url:await uploadPhoto(p.file, groupId)})));
    }
    const { data, error } = await supabaseClient.rpc("submit_rsvp", {
      p_name:name, p_phone:phone || null, p_attending:attending, p_attendees:people
    });
    if (error) throw error;
    // A falha no e-mail não desfaz a confirmação já salva.
    try {
      await supabaseClient.functions.invoke("notify-rsvp", {
        body:{name, phone, attending, attendees:people.map(p=>({name:p.name})), submitted_at:new Date().toISOString()}
      });
    } catch (mailError) { console.warn("Notificação por e-mail não enviada:", mailError); }
    document.querySelector("#success-text").textContent = attending
      ? `Presença confirmada! ${people.length === 1 ? "Seu lugar" : "Os lugares de vocês"} já entrou na nossa mesa. Até lá!`
      : "Sua resposta foi registrada. Sentiremos sua falta, mas agradecemos por avisar! 💗";
    document.querySelector("#success-dialog").showModal();
    form.reset(); setCompanionCount(0);
    await loadSeats();
  } catch (err) {
    showMessage(err.message || "Não foi possível enviar. Tente novamente.", true);
  } finally {
    btn.disabled = false; btn.textContent = "ENVIAR CONFIRMAÇÃO ✨";
  }
});

async function loadSeats() {
  const seats = document.querySelector("#seats");
  if (!supabaseClient) {
    seats.innerHTML = `<div class="seat empty" style="left:50%;top:50%"><div class="seat-photo"></div><div class="seat-name">Conecte o site</div></div>`;
    document.querySelector("#seat-count").textContent = "Aguardando conexão do mural";
    return;
  }
  const {data, error} = await supabaseClient.from("attendees").select("name,photo_url,created_at").order("created_at",{ascending:true}).limit(30);
  if (error) { console.error(error); return; }
  seats.innerHTML = "";
  const total = Math.min(data.length,30);
  for (let i=0;i<30;i++) {
    const angle = (Math.PI*2*i/30) - Math.PI/2;
    const x = 50 + 43*Math.cos(angle);
    const y = 50 + 43*Math.sin(angle);
    const person = data[i];
    const node = document.createElement("div");
    node.className = `seat ${person ? "" : "empty"}`;
    node.style.left = `${x}%`; node.style.top = `${y}%`;
    if (person) {
      const img = document.createElement("img"); img.className="seat-photo"; img.src=person.photo_url; img.alt=`Foto de ${person.name}`;
      const label = document.createElement("div"); label.className="seat-name"; label.textContent=person.name;
      node.append(img,label);
    } else {
      const circle=document.createElement("div"); circle.className="seat-photo";
      const label=document.createElement("div"); label.className="seat-name"; label.textContent="Lugar livre";
      node.append(circle,label);
    }
    seats.append(node);
  }
  document.querySelector("#seat-count").textContent = `${total} de 30 lugares preenchidos`;
}
document.querySelector(".dialog-close").addEventListener("click",()=>document.querySelector("#success-dialog").close());
document.querySelector("#dialog-ok").addEventListener("click",()=>document.querySelector("#success-dialog").close());
loadSeats();