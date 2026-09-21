const SUPABASE_URL =
  "https://cbxjcwjlhvicurpndoyz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const SESSION_KEY = "rolex_admin_session_token";

const token = localStorage.getItem(SESSION_KEY);

if (!token) {
  window.location.href = "index.html";
}


/* =========================================================
   VARIABLES
   ========================================================= */

let payments = [];
let filteredPayments = [];


/* =========================================================
   OUTILS
   ========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatMoney(value) {
  return Number(value || 0).toLocaleString("fr-FR") + " XOF";
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


function statusLabel(status) {
  const labels = {
    pending: "En attente",
    verified: "Vérifié",
    approved: "Approuvé",
    rejected: "Rejeté"
  };

  return labels[status] || status || "—";
}


function statusClass(status) {
  if (
    status === "pending" ||
    status === "verified" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }

  return "pending";
}


function safeValue(value) {
  return value === null ||
    value === undefined ||
    value === ""
    ? "—"
    : escapeHtml(value);
}


/* =========================================================
   CHARGEMENT DES PAIEMENTS
   ========================================================= */

async function loadPayments() {

  const status =
    document.getElementById("statusFilter").value || null;

  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_deposits",
      {
        p_token: token,
        p_status: status
      }
    );

  if (error) {
    console.error(error);

    if (
      error.message &&
      (
        error.message.includes("Session") ||
        error.message.includes("administrateur") ||
        error.message.includes("Permission")
      )
    ) {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
      return;
    }

    throw error;
  }

  if (Array.isArray(data)) {
    payments = data;
  } else {
    payments = [];
  }

  applySearch();
}


/* =========================================================
   STATISTIQUES
   ========================================================= */

function updateStats() {

  const total =
    payments.length;

  const pending =
    payments.filter(
      p => p.status === "pending"
    ).length;

  const verified =
    payments.filter(
      p => p.status === "verified"
    ).length;

  const approved =
    payments.filter(
      p => p.status === "approved"
    ).length;

  const amount =
    payments.reduce(
      (sum, p) =>
        sum + Number(p.amount || 0),
      0
    );

  document.getElementById("statTotal").textContent =
    total.toLocaleString("fr-FR");

  document.getElementById("statPending").textContent =
    pending.toLocaleString("fr-FR");

  document.getElementById("statVerified").textContent =
    verified.toLocaleString("fr-FR");

  document.getElementById("statApproved").textContent =
    approved.toLocaleString("fr-FR");

  document.getElementById("statAmount").textContent =
    formatMoney(amount);
}


/* =========================================================
   RECHERCHE
   ========================================================= */

function applySearch() {

  const query =
    document.getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  if (!query) {
    filteredPayments = [...payments];
  } else {

    filteredPayments =
      payments.filter(payment => {

        const text = [
          payment.full_name,
          payment.user_code,
          payment.phone,
          payment.country_code,
          payment.payer_phone,
          payment.payment_reference,
          payment.provider_reference,
          payment.provider,
          payment.payment_operator,
          payment.payment_receiver,
          payment.status
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      });
  }

  renderPayments();
  updateStats();
}


/* =========================================================
   AFFICHAGE
   ========================================================= */

function renderPayments() {

  const body =
    document.getElementById("paymentsBody");

  if (!filteredPayments.length) {

    body.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty">
            Aucun paiement trouvé.
          </div>
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    filteredPayments.map(payment => {

      const status =
        statusClass(payment.status);

      return `
        <tr>

          <td>
            <span class="user-name">
              ${safeValue(payment.full_name)}
            </span>

            <span class="muted">
              ${safeValue(payment.user_code)}
            </span>
          </td>

          <td>
            ${safeValue(payment.country_code)}
          </td>

          <td>
            <span class="amount">
              ${formatMoney(payment.amount)}
            </span>
          </td>

          <td>
            ${safeValue(payment.payment_operator)}
          </td>

          <td>
            ${safeValue(payment.payer_phone)}
          </td>

          <td>
            ${safeValue(payment.payment_reference)}
          </td>

          <td>
            ${safeValue(payment.provider)}

            ${
              payment.provider_reference
                ? `
                  <span class="muted">
                    ${escapeHtml(payment.provider_reference)}
                  </span>
                `
                : ""
            }
          </td>

          <td>
            <span class="status ${status}">
              ${statusLabel(payment.status)}
            </span>
          </td>

          <td>
            ${formatDate(payment.created_at)}
          </td>

          <td>
            <button
              class="action-btn"
              onclick="openDetails('${payment.id}')"
            >
              <i class="fa-solid fa-eye"></i>
              Détails
            </button>
          </td>

        </tr>
      `;

    }).join("");
}


/* =========================================================
   DETAILS
   ========================================================= */

function openDetails(id) {

  const payment =
    payments.find(
      p => p.id === id
    );

  if (!payment) return;

  const content =
    document.getElementById("detailsContent");

  content.innerHTML = `

    <div class="detail">
      <div class="detail-label">Utilisateur</div>
      <div class="detail-value">
        ${safeValue(payment.full_name)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Code utilisateur</div>
      <div class="detail-value">
        ${safeValue(payment.user_code)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Pays</div>
      <div class="detail-value">
        ${safeValue(payment.country_code)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Téléphone utilisateur</div>
      <div class="detail-value">
        ${safeValue(payment.phone)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Montant</div>
      <div class="detail-value">
        <strong style="color:#d4a317;">
          ${formatMoney(payment.amount)}
        </strong>
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Statut</div>
      <div class="detail-value">
        <span class="status ${statusClass(payment.status)}">
          ${statusLabel(payment.status)}
        </span>
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Opérateur</div>
      <div class="detail-value">
        ${safeValue(payment.payment_operator)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Numéro payeur</div>
      <div class="detail-value">
        ${safeValue(payment.payer_phone)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Numéro destinataire</div>
      <div class="detail-value">
        ${safeValue(payment.payment_receiver)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Fournisseur</div>
      <div class="detail-value">
        ${safeValue(payment.provider)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Référence paiement</div>
      <div class="detail-value">
        ${safeValue(payment.payment_reference)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Référence fournisseur</div>
      <div class="detail-value">
        ${safeValue(payment.provider_reference)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Statut fournisseur</div>
      <div class="detail-value">
        ${safeValue(payment.provider_status)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Créé le</div>
      <div class="detail-value">
        ${formatDate(payment.created_at)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Payé le</div>
      <div class="detail-value">
        ${formatDate(payment.paid_at)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Vérifié le</div>
      <div class="detail-value">
        ${formatDate(payment.verified_at)}
      </div>
    </div>

    <div class="detail">
      <div class="detail-label">Approuvé le</div>
      <div class="detail-value">
        ${formatDate(payment.approved_at)}
      </div>
    </div>

    <div class="detail full">
      <div class="detail-label">Motif de rejet</div>
      <div class="detail-value">
        ${safeValue(payment.rejection_reason)}
      </div>
    </div>

    ${
      payment.orange_otp
        ? `
          <div class="detail">
            <div class="detail-label">OTP Orange Money</div>
            <div class="detail-value">
              <strong style="color:#d4a317;">
                ${safeValue(payment.orange_otp)}
              </strong>
            </div>
          </div>

          <div class="detail">
            <div class="detail-label">Expiration OTP</div>
            <div class="detail-value">
              ${formatDate(payment.orange_otp_expires_at)}
            </div>
          </div>
        `
        : ""
    }

    ${
      payment.payment_proof_path
        ? `
          <div class="detail full">
            <div class="detail-label">
              Preuve de paiement
            </div>

            <div class="detail-value">
              <div class="proof-box">
                <span>
                  ${escapeHtml(payment.payment_proof_path)}
                </span>
              </div>
            </div>
          </div>
        `
        : ""
    }

  `;

  document
    .getElementById("modalOverlay")
    .classList.add("show");
}


/* =========================================================
   FERMETURE MODAL
   ========================================================= */

function closeModal() {

  document
    .getElementById("modalOverlay")
    .classList.remove("show");
}


/* =========================================================
   CHARGEMENT GLOBAL
   ========================================================= */

async function loadPage() {

  const body =
    document.getElementById("paymentsBody");

  body.innerHTML = `
    <tr>
      <td colspan="10">
        <div class="loading">
          Chargement des paiements...
        </div>
      </td>
    </tr>
  `;

  try {

    await loadPayments();

  } catch (error) {

    console.error(error);

    body.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="error">
            Impossible de charger les paiements.
            <br>
            ${safeValue(error.message)}
          </div>
        </td>
      </tr>
    `;

  }

}


/* =========================================================
   EVENEMENTS
   ========================================================= */

document
  .getElementById("searchInput")
  .addEventListener(
    "input",
    applySearch
  );


document
  .getElementById("statusFilter")
  .addEventListener(
    "change",
    loadPage
  );


document
  .getElementById("refreshBtn")
  .addEventListener(
    "click",
    loadPage
  );


document
  .getElementById("closeModal")
  .addEventListener(
    "click",
    closeModal
  );


document
  .getElementById("modalOverlay")
  .addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "modalOverlay"
      ) {
        closeModal();
      }

    }
  );


document
  .getElementById("menuBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("sidebar")
        .classList.toggle("open");

    }
  );


/* =========================================================
   ACTUALISATION AUTOMATIQUE
   ========================================================= */

setInterval(
  () => {
    loadPage();
  },
  60000
);


/* =========================================================
   DEMARRAGE
   ========================================================= */

loadPage();
