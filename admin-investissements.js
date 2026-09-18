const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";

let investments = [];

const $ = (id) => document.getElementById(id);

function getToken() {
  return localStorage.getItem(SESSION_KEY);
}

function formatXOF(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("fr-FR").format(number) + " XOF";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "Actif";
  if (value === "completed") return "Terminé";

  return status || "—";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "active";
  if (value === "completed") return "completed";

  return "other";
}

function showError(message) {
  const box = $("errorBox");

  box.textContent = message;
  box.style.display = "block";
}

function hideError() {
  $("errorBox").style.display = "none";
}

function redirectLogin() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

async function loadStats(token) {
  const { data, error } = await supabaseClient.rpc(
    "get_admin_investment_stats",
    {
      p_token: token
    }
  );

  if (error) {
    throw error;
  }

  const stats = data || {};

  $("totalInvestments").textContent =
    Number(stats.total_investments || 0).toLocaleString("fr-FR");

  $("activeInvestments").textContent =
    Number(stats.active_investments || 0).toLocaleString("fr-FR");

  $("completedInvestments").textContent =
    Number(stats.completed_investments || 0).toLocaleString("fr-FR");

  $("totalInvested").textContent =
    formatXOF(stats.total_invested);

  $("totalGenerated").textContent =
    formatXOF(stats.total_generated);
}

async function loadInvestments(token) {
  const status = $("statusFilter").value || null;

  const { data, error } = await supabaseClient.rpc(
    "get_admin_investments",
    {
      p_token: token,
      p_status: status
    }
  );

  if (error) {
    throw error;
  }

  investments = Array.isArray(data) ? data : [];

  renderInvestments();
}

function renderInvestments() {
  const search = $("searchInput").value.trim().toLowerCase();

  const filtered = investments.filter((item) => {
    if (!search) return true;

    const content = [
      item.full_name,
      item.user_code,
      item.phone,
      item.product_name,
      item.country_code
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return content.includes(search);
  });

  const body = $("investmentsBody");

  body.innerHTML = "";

  $("loading").style.display = "none";

  if (!filtered.length) {
    $("investmentsTable").style.display = "none";
    $("empty").style.display = "block";
    return;
  }

  $("empty").style.display = "none";
  $("investmentsTable").style.display = "table";

  for (const item of filtered) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="user-name">
          ${escapeHtml(item.full_name || "—")}
        </div>

        <div class="user-code">
          ${escapeHtml(item.user_code || "—")}
        </div>
      </td>

      <td>
        ${escapeHtml(item.country_code || "—")}
      </td>

      <td>
        <strong>${escapeHtml(item.product_name || "—")}</strong>
      </td>

      <td class="money">
        ${formatXOF(item.price_paid)}
      </td>

      <td class="money">
        ${formatXOF(item.daily_return)}
      </td>

      <td class="money">
        ${formatXOF(item.generated_total)}
      </td>

      <td>
        ${Number(item.income_count || 0).toLocaleString("fr-FR")}
      </td>

      <td>
        ${formatDate(item.start_at)}
      </td>

      <td>
        ${formatDate(item.next_income_at)}
      </td>

      <td>
        ${formatDate(item.end_at)}
      </td>

      <td>
        <span class="status ${statusClass(item.status)}">
          ${escapeHtml(statusLabel(item.status))}
        </span>
      </td>
    `;

    body.appendChild(row);
  }
}

async function loadPage() {
  const token = getToken();

  if (!token) {
    redirectLogin();
    return;
  }

  hideError();

  $("loading").style.display = "block";
  $("investmentsTable").style.display = "none";
  $("empty").style.display = "none";

  try {
    await Promise.all([
      loadStats(token),
      loadInvestments(token)
    ]);
  } catch (error) {
    console.error("Erreur admin investissements:", error);

    const message = String(error?.message || error || "");

    if (
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("administrateur non autorisé")
    ) {
      redirectLogin();
      return;
    }

    showError(message || "Impossible de charger les investissements.");
    $("loading").style.display = "none";
  }
}

$("searchInput").addEventListener("input", renderInvestments);

$("statusFilter").addEventListener("change", loadPage);

$("refreshBtn").addEventListener("click", loadPage);

loadPage();

setInterval(() => {
  loadPage();
}, 60000);
