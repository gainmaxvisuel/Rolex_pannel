const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";
const token = localStorage.getItem(SESSION_KEY);

if (!token) location.href = "index.html";

let users = [];
let currentUser = null;


/* =========================
   OUTILS
========================= */

const $ = id => document.getElementById(id);

function money(v) {
  return Number(v || 0).toLocaleString("fr-FR") + " XOF";
}

function date(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-FR");
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusText(s) {
  return {
    active: "Actif",
    blocked: "Bloqué",
    suspended: "Suspendu"
  }[s] || s;
}


/* =========================
   STATISTIQUES
========================= */

async function loadStats() {

  const { data, error } = await supabaseClient.rpc(
    "get_admin_user_stats",
    { p_token: token }
  );

  if (error) throw error;

  $("statTotal").textContent =
    Number(data.total_users || 0).toLocaleString("fr-FR");

  $("statActive").textContent =
    Number(data.active_users || 0).toLocaleString("fr-FR");

  $("statBlocked").textContent =
    Number(data.blocked_users || 0).toLocaleString("fr-FR");

  $("statSuspended").textContent =
    Number(data.suspended_users || 0).toLocaleString("fr-FR");

  $("statBalance").textContent =
    money(data.total_balance);
}


/* =========================
   UTILISATEURS
========================= */

async function loadUsers() {

  const status = $("statusFilter").value || null;
  const country = $("countryFilter").value || null;

  const { data, error } = await supabaseClient.rpc(
    "get_admin_users",
    {
      p_token: token,
      p_status: status,
      p_country: country
    }
  );

  if (error) throw error;

  users = Array.isArray(data) ? data : [];
  renderUsers();
}


/* =========================
   AFFICHAGE
========================= */

function renderUsers() {

  const q = $("searchInput").value.toLowerCase().trim();

  const list = users.filter(u => {

    if (!q) return true;

    return [
      u.full_name,
      u.user_code,
      u.referral_code,
      u.phone,
      u.country_code
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  if (!list.length) {
    $("usersBody").innerHTML = `
      <tr>
        <td colspan="11">
          <div class="empty">Aucun utilisateur trouvé.</div>
        </td>
      </tr>
    `;
    return;
  }

  $("usersBody").innerHTML = list.map(u => `
    <tr>
      <td>
        <b>${esc(u.full_name)}</b>
        <span class="muted">${esc(u.user_code)}</span>
      </td>

      <td>${esc(u.country_code)}</td>

      <td>${esc(u.phone)}</td>

      <td class="amount">${money(u.balance)}</td>

      <td>${money(u.total_deposits)}</td>

      <td>${money(u.total_profit)}</td>

      <td>${money(u.total_withdrawals)}</td>

      <td>${money(u.total_commissions)}</td>

      <td>
        <span class="status ${esc(u.status)}">
          ${statusText(u.status)}
        </span>
      </td>

      <td>${date(u.created_at)}</td>

      <td>
        <button class="action-btn"
          onclick="details('${u.id}')">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join("");
}


/* =========================
   DETAILS
========================= */

async function details(id) {

  $("modalOverlay").classList.add("show");

  $("detailsContent").innerHTML =
    `<div class="loading">Chargement...</div>`;

  const { data, error } = await supabaseClient.rpc(
    "get_admin_user_details",
    {
      p_token: token,
      p_user_id: id
    }
  );

  if (error) {
    $("detailsContent").innerHTML =
      `<div class="error">${esc(error.message)}</div>`;
    return;
  }

  currentUser = data.user;

  $("detailsContent").innerHTML = `
    <div class="detail-grid">

      <div class="detail">
        <div class="detail-label">Nom</div>
        <div class="detail-value">${esc(data.user.full_name)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Code utilisateur</div>
        <div class="detail-value">${esc(data.user.user_code)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Pays</div>
        <div class="detail-value">${esc(data.user.country_code)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Téléphone</div>
        <div class="detail-value">${esc(data.user.phone)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Solde</div>
        <div class="detail-value">${money(data.user.balance)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Statut</div>
        <div class="detail-value">${statusText(data.user.status)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Dépôts</div>
        <div class="detail-value">${money(data.user.total_deposits)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Profits</div>
        <div class="detail-value">${money(data.user.total_profit)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Retraits</div>
        <div class="detail-value">${money(data.user.total_withdrawals)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Commissions</div>
        <div class="detail-value">${money(data.user.total_commissions)}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Sessions actives</div>
        <div class="detail-value">${data.active_sessions || 0}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Inscription</div>
        <div class="detail-value">${date(data.user.created_at)}</div>
      </div>

    </div>

    <div class="modal-actions">

      ${
        data.user.status === "active"
        ? `
          <button class="action-btn"
            onclick="suspendUser()">
            Suspendre
          </button>

          <button class="action-btn danger-btn"
            onclick="blockUser()">
            Bloquer
          </button>
        `
        : ""
      }

      ${
        data.user.status !== "active"
        ? `
          <button class="action-btn"
            onclick="unblockUser()">
            Réactiver
          </button>
        `
        : ""
      }

      <button class="action-btn"
        onclick="revokeSessions()">
        Révoquer les sessions
      </button>

    </div>
  `;
}


/* =========================
   ACTIONS ADMIN
========================= */

async function blockUser() {

  if (!confirm("Bloquer cet utilisateur ?")) return;

  const reason = prompt("Motif du blocage :");

  await action(
    "admin_block_user",
    {
      p_token: token,
      p_user_id: currentUser.id,
      p_reason: reason
    }
  );
}


async function suspendUser() {

  if (!confirm("Suspendre cet utilisateur ?")) return;

  const reason = prompt("Motif de la suspension :");

  await action(
    "admin_suspend_user",
    {
      p_token: token,
      p_user_id: currentUser.id,
      p_reason: reason
    }
  );
}


async function unblockUser() {

  if (!confirm("Réactiver cet utilisateur ?")) return;

  await action(
    "admin_unblock_user",
    {
      p_token: token,
      p_user_id: currentUser.id
    }
  );
}


async function revokeSessions() {

  if (!confirm("Révoquer toutes ses sessions ?")) return;

  await action(
    "admin_revoke_user_sessions",
    {
      p_token: token,
      p_user_id: currentUser.id
    }
  );
}


async function action(fn, params) {

  const { error } = await supabaseClient.rpc(fn, params);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Opération effectuée.");

  await loadStats();
  await loadUsers();

  if (currentUser) {
    await details(currentUser.id);
  }
}


/* =========================
   EVENEMENTS
========================= */

$("searchInput").addEventListener(
  "input",
  renderUsers
);

$("statusFilter").addEventListener(
  "change",
  async () => {
    await loadUsers();
  }
);

$("countryFilter").addEventListener(
  "change",
  async () => {
    await loadUsers();
  }
);

$("refreshBtn").addEventListener(
  "click",
  loadPage
);

$("closeModal").addEventListener(
  "click",
  () => {
    $("modalOverlay").classList.remove("show");
    currentUser = null;
  }
);

$("menuBtn").addEventListener(
  "click",
  () => {
    $("sidebar").classList.toggle("open");
  }
);


/* =========================
   CHARGEMENT
========================= */

async function loadPage() {

  $("usersBody").innerHTML = `
    <tr>
      <td colspan="11">
        <div class="loading">
          Chargement des utilisateurs...
        </div>
      </td>
    </tr>
  `;

  try {

    await Promise.all([
      loadStats(),
      loadUsers()
    ]);

  } catch (error) {

    console.error(error);

    $("usersBody").innerHTML = `
      <tr>
        <td colspan="11">
          <div class="error">
            ${esc(error.message)}
          </div>
        </td>
      </tr>
    `;
  }
}

loadPage();

setInterval(loadPage, 60000);
