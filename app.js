/* VoteÉcole — interface de vote scolaire */
const SUPABASE_URL = "https://aucqzgjwbfkryppamfvv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-DlisDSBqJVscOacaxd2DA_prQCOD30";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let currentUser = null;

function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(error));
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function setSignedIn(user) {
  currentUser = user || null;
  $("auth-panel").classList.toggle("hidden", Boolean(user));
  $("account-panel").classList.toggle("hidden", !user);
  $("signed-in-email").textContent = user ? user.email : "";
  if (user) loadElections();
  else $("elections-list").innerHTML = '<div class="empty-state">Connecte-toi pour consulter les élections.</div>';
}

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  $("login-btn").disabled = true;
  message("auth-message", "Connexion en cours…");
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  $("login-btn").disabled = false;
  if (error) return message("auth-message", error.message, true);
  message("auth-message", "");
  setSignedIn(data.user);
});

$("signup-btn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 6) {
    return message("auth-message", "Saisis un e-mail et un mot de passe d’au moins 6 caractères.", true);
  }
  $("signup-btn").disabled = true;
  message("auth-message", "Création du compte…");
  const { data, error } = await db.auth.signUp({ email, password });
  $("signup-btn").disabled = false;
  if (error) return message("auth-message", error.message, true);
  if (data.session) {
    message("auth-message", "Compte créé. Tu es connecté.");
    setSignedIn(data.user);
  } else {
    message("auth-message", "Compte créé. Vérifie ta boîte e-mail si une confirmation est demandée.");
  }
});

$("logout-btn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) return message("app-message", error.message, true);
  setSignedIn(null);
  message("app-message", "Tu es déconnecté.");
});
$("refresh-btn").addEventListener("click", () => loadElections());

async function loadElections() {
  if (!currentUser) return;
  const list = $("elections-list");
  list.innerHTML = '<div class="empty-state">Chargement des élections…</div>';
  const { data: elections, error } = await db
    .from("elections")
    .select("id,title,description,status,created_at")
    .in("status", ["open", "closed"])
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = "";
    return message("app-message", "Impossible de charger les élections : " + error.message, true);
  }
  message("app-message", "");
  if (!elections?.length) {
    list.innerHTML = '<div class="empty-state"><strong>Aucune élection ouverte pour le moment.</strong><p>Quand le responsable de classe publiera une élection et ses candidats, elle apparaîtra ici.</p></div>';
    return;
  }

  const candidateResults = await Promise.all(elections.map(async (election) => {
    const { data: candidates, error: candidateError } = await db
      .from("candidates").select("id,name,description").eq("election_id", election.id).order("name");
    return { election, candidates: candidates || [], candidateError };
  }));

  const { data: myVotes, error: votesError } = await db
    .from("votes").select("election_id").eq("user_id", currentUser.id);
  const votedIds = new Set((myVotes || []).map((v) => v.election_id));

  list.innerHTML = candidateResults.map(({ election, candidates, candidateError }) => {
    const closed = election.status === "closed";
    const alreadyVoted = votedIds.has(election.id);
    const status = closed ? "Terminée" : alreadyVoted ? "Vote enregistré" : "Vote ouvert";
    let choices = "";
    if (candidateError) {
      choices = '<p class="message error">Impossible de charger les candidats.</p>';
    } else if (!candidates.length) {
      choices = '<p class="muted">Les candidats n’ont pas encore été ajoutés.</p>';
    } else if (closed || alreadyVoted) {
      choices = '<div class="candidate-list">' + candidates.map((c) =>
        '<div class="candidate"><div><strong>' + escapeHtml(c.name) + '</strong>' +
        (c.description ? '<p>' + escapeHtml(c.description) + '</p>' : '') +
        '</div></div>').join("") + '</div>';
    } else {
      choices = '<div class="candidate-list">' + candidates.map((c) =>
        '<div class="candidate"><div><strong>' + escapeHtml(c.name) + '</strong>' +
        (c.description ? '<p>' + escapeHtml(c.description) + '</p>' : '') +
        '</div><button class="vote-btn" data-election="' + election.id + '" data-candidate="' + c.id + '">Voter</button></div>').join("") + '</div>';
    }
    return '<article class="election-card"><div class="election-head"><span class="status ' +
      (closed ? 'closed' : alreadyVoted ? 'done' : 'open') + '">' + status +
      '</span><h3>' + escapeHtml(election.title) + '</h3><p>' +
      escapeHtml(election.description || "") + '</p></div>' + choices + '</article>';
  }).join("");

  list.querySelectorAll(".vote-btn").forEach((button) => {
    button.addEventListener("click", () => castVote(button.dataset.election, button.dataset.candidate, button));
  });

  if (votesError) message("app-message", "Attention : vérification de ton vote impossible. Réessaie.", true);
}

async function castVote(electionId, candidateId, button) {
  if (!currentUser) return message("app-message", "Connecte-toi avant de voter.", true);
  const confirmed = window.confirm("Confirmer ton choix ? Tu ne pourras voter qu’une seule fois pour cette élection.");
  if (!confirmed) return;
  button.disabled = true;
  button.textContent = "Enregistrement…";
  const { error } = await db.from("votes").insert({
    election_id: electionId,
    candidate_id: candidateId,
    user_id: currentUser.id
  });
  if (error) {
    button.disabled = false;
    button.textContent = "Voter";
    if (error.code === "23505") {
      message("app-message", "Un vote a déjà été enregistré pour cette élection.", true);
    } else {
      message("app-message", "Le vote n’a pas été enregistré : " + error.message, true);
    }
    return;
  }
  message("app-message", "Ton vote a été enregistré. Merci de participer !");
  await loadElections();
}

db.auth.getSession().then(({ data, error }) => {
  if (error) message("app-message", error.message, true);
  setSignedIn(data?.session?.user || null);
});
db.auth.onAuthStateChange((_event, session) => {
  setSignedIn(session?.user || null);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
