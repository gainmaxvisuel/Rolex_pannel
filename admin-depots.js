const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";

let deposits = [];
let rejectDepositId = null;

const message = document.getElementById("message");
const loading = document.getElementById("loading");
const tableContainer = document.getElementById("tableContainer");
const emptyState = document.getElementById("emptyState");
const depositBody = document.getElementById("depositBody");
const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

const rejectModal = document.getElementById("rejectModal");
const rejectReason = document.getElementById("rejectReason");
const cancelReject = document.getElementById("cancelReject");
const confirmReject = document.getElementById("confirmReject");

const backBtn = document.getElementById("backBtn");

const token = localStorage.getItem(SESSION_KEY);

if (!token) {
  window.location.href = "index.html";
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, type = "error") {
  if (!message) return;

  message.textContent = text;
  message.className = `message show ${type}`;

  setTimeout(() => {
    message.className = "message";
  }, 5000);
}


/* =========================================================
   SECURITY
========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   FORMAT
========================================================= */

function formatAmount(value) {
  const number = Number(value || 0);

  return (
    new Intl.NumberFormat("fr-FR").format(number) +
    " XOF"
  );
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}


/* =========================================================
   STATUS
========================================================= */

function statusLabel(status) {
  const labels = {
    pending: "En attente",
    verified: "Vérifié",
    approved: "Validé",
    rejected: "Rejeté"
  };

  return labels[status] || status || "—";
}


function statusClass(status) {
  return [
    "pending",
    "verified",
    "approved",
    "rejected"
  ].includes(status)
    ? status
    : "pending";
}


/* =========================================================
   PREUVE
========================================================= */

async function openPaymentProof(depositId) {

  if (!depositId) {
    return;
  }

  try {

    setBusy(true);

    showMessage(
      "Génération du lien sécurisé...",
      "success"
    );

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/admin-deposit-proof`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY
        },

        body: JSON.stringify({
          p_token: token,
          p_deposit_id: depositId
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error ||
        "Impossible d'ouvrir la preuve de paiement."
      );
    }

    if (!result.url) {
      throw new Error(
        "Lien de preuve introuvable."
      );
    }

    /*
      Ouverture dans un nouvel onglet.
      Le lien expire automatiquement.
    */
    window.open(
      result.url,
      "_blank",
      "noopener,noreferrer"
    );

    showMessage(
      "La preuve de paiement a été ouverte.",
      "success"
    );

  } catch (error) {

    console.error(
      "Erreur ouverture preuve :",
      error
    );

    showMessage(
      error?.message ||
      "Impossible d'ouvrir la preuve.",
      "error"
    );

  } finally {

    setBusy(false);
  }
}


/* =========================================================
   FILTRE
========================================================= */

function filteredDeposits() {

  const filter = statusFilter.value;
  const search = searchInput.value
    .trim()
    .toLowerCase();

  return deposits.filter((deposit) => {

    if (
      filter &&
      deposit.status !== filter
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    const text = [
      deposit.full_name,
      deposit.user_code,
      deposit.phone,
      deposit.payer_phone,
      deposit.country_code,
      deposit.payment_reference,
      deposit.provider_reference,
      deposit.payment_operator,
      deposit.payment_receiver
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });
}


/* =========================================================
   RENDU
========================================================= */

function renderDeposits() {

  const list = filteredDeposits();

  depositBody.innerHTML = "";

  if (!list.length) {

    tableContainer.style.display = "none";
    emptyState.style.display = "block";

    return;
  }

  emptyState.style.display = "none";
  tableContainer.style.display = "block";


  list.forEach((deposit) => {

    const tr = document.createElement("tr");

    const status = deposit.status;

    let actions = "";


    /* =====================================================
       ACTIONS SELON STATUT
    ===================================================== */

    if (status === "pending") {

      actions = `
        <button
          class="action-btn verify"
          data-action="verify"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-check"></i>
          Vérifier
        </button>
      `;
    }


    if (status === "verified") {

      actions = `
        <button
          class="action-btn approve"
          data-action="approve"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-circle-check"></i>
          Valider
        </button>

        <button
          class="action-btn reject"
          data-action="reject"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-xmark"></i>
          Rejeter
        </button>
      `;
    }


    if (status === "approved") {

      actions = `
        <span style="color:#34d399;font-size:12px;">
          <i class="fa-solid fa-circle-check"></i>
          Dépôt validé
        </span>
      `;
    }


    if (status === "rejected") {

      actions = `
        <span style="color:#f87171;font-size:12px;">
          <i class="fa-solid fa-circle-xmark"></i>
          Dépôt rejeté
        </span>
      `;
    }


    /* =====================================================
       PREUVE
    ===================================================== */

    let proofHtml = `
      <span class="proof-none">
        <i class="fa-solid fa-image"></i>
        Aucune preuve
      </span>
    `;

    if (deposit.payment_proof_path) {

      proofHtml = `
        <button
          class="proof-btn"
          data-action="proof"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-image"></i>
          Voir la preuve
        </button>
      `;
    }


    /* =====================================================
       OPERATEUR
    ===================================================== */

    const operatorHtml = deposit.payment_operator
      ? `
        <div class="operator-name">
          ${escapeHtml(deposit.payment_operator)}
        </div>

        <div class="receiver-small">
          ${escapeHtml(
            deposit.payment_receiver || ""
          )}
        </div>
      `
      : "—";


    /* =====================================================
       OTP ORANGE
    ===================================================== */

    let otpHtml = "";

    if (
      deposit.payment_operator === "Orange Money" &&
      deposit.orange_otp &&
      deposit.status === "pending"
    ) {

      otpHtml = `
        <div class="otp-box">
          <span>OTP</span>
          <strong>
            ${escapeHtml(deposit.orange_otp)}
          </strong>
        </div>
      `;
    }


    /* =====================================================
       LIGNE
    ===================================================== */

    tr.innerHTML = `

      <td>
        <div class="user-name">
          ${escapeHtml(
            deposit.full_name || "—"
          )}
        </div>

        <div class="user-code">
          ${escapeHtml(
            deposit.user_code || "—"
          )}
        </div>
      </td>


      <td>
        ${escapeHtml(
          deposit.country_code || "—"
        )}
      </td>


      <td>
        ${operatorHtml}

        <div class="payer-phone">
          ${escapeHtml(
            deposit.payer_phone || "—"
          )}
        </div>

        ${otpHtml}
      </td>


      <td>
        <span class="amount">
          ${formatAmount(deposit.amount)}
        </span>
      </td>


      <td>
        ${proofHtml}
      </td>


      <td>
        ${formatDate(deposit.created_at)}
      </td>


      <td>
        <span class="status ${statusClass(status)}">
          ${escapeHtml(
            statusLabel(status)
          )}
        </span>
      </td>


      <td>
        <div class="actions">
          ${actions}
        </div>
      </td>

    `;

    depositBody.appendChild(tr);
  });
}


/* =========================================================
   CHARGER LES DEPOTS
========================================================= */

async function loadDeposits() {

  if (!token) {

    window.location.href =
      "index.html";

    return;
  }

  loading.style.display = "block";
  tableContainer.style.display = "none";
  emptyState.style.display = "none";

  try {

    const selectedStatus =
      statusFilter.value || null;


    const {
      data,
      error
    } = await supabaseClient.rpc(
      "get_admin_deposits",
      {
        p_token: token,
        p_status: selectedStatus
      }
    );


    if (error) {
      throw error;
    }


    console.log(
      "Dépôts reçus :",
      data
    );


    deposits =
      Array.isArray(data)
        ? data
        : [];


    loading.style.display = "none";

    renderDeposits();


  } catch (error) {

    console.error(
      "Erreur chargement dépôts :",
      error
    );

    loading.style.display = "none";

    tableContainer.style.display =
      "none";

    emptyState.style.display =
      "block";


    showMessage(
      error?.message ||
      "Impossible de charger les dépôts."
    );


    const errorMessage =
      error?.message?.toLowerCase() ||
      "";


    if (
      errorMessage.includes("session") ||
      errorMessage.includes("permission") ||
      errorMessage.includes("administrateur")
    ) {

      setTimeout(() => {

        localStorage.removeItem(
          SESSION_KEY
        );

        window.location.href =
          "index.html";

      }, 1800);
    }
  }
}


/* =========================================================
   VERIFY
========================================================= */

async function verifyDeposit(depositId) {

  if (!depositId) {
    return;
  }

  const confirmed = confirm(
    "Voulez-vous vérifier ce dépôt ?"
  );

  if (!confirmed) {
    return;
  }


  try {

    setBusy(true);


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_verify_deposit",
        {
          p_token: token,
          p_deposit_id: depositId
        }
      );


    if (error) {
      throw error;
    }


    console.log(
      "Dépôt vérifié :",
      data
    );


    showMessage(
      "Le dépôt a été vérifié.",
      "success"
    );


    await loadDeposits();


  } catch (error) {

    console.error(error);

    showMessage(
      error?.message ||
      "Impossible de vérifier le dépôt."
    );


  } finally {

    setBusy(false);
  }
}


/* =========================================================
   APPROUVER
========================================================= */

async function approveDeposit(depositId) {

  if (!depositId) {
    return;
  }


  const confirmed = confirm(
    "Confirmer définitivement la validation de ce dépôt ?"
  );


  if (!confirmed) {
    return;
  }


  try {

    setBusy(true);


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_approve_deposit",
        {
          p_token: token,
          p_deposit_id: depositId
        }
      );


    if (error) {
      throw error;
    }


    console.log(
      "Dépôt validé :",
      data
    );


    showMessage(
      "Dépôt validé avec succès.",
      "success"
    );


    await loadDeposits();


  } catch (error) {

    console.error(error);

    showMessage(
      error?.message ||
      "Impossible de valider le dépôt."
    );


  } finally {

    setBusy(false);
  }
}


/* =========================================================
   MODAL REJET
========================================================= */

function openRejectModal(depositId) {

  rejectDepositId =
    depositId;

  rejectReason.value =
    "";

  rejectModal.classList.add(
    "show"
  );


  setTimeout(() => {

    rejectReason.focus();

  }, 100);
}


function closeRejectModal() {

  rejectDepositId =
    null;

  rejectReason.value =
    "";

  rejectModal.classList.remove(
    "show"
  );
}


/* =========================================================
   REJETER
========================================================= */

async function rejectDeposit() {

  const depositId =
    rejectDepositId;

  const reason =
    rejectReason.value.trim();


  if (!depositId) {

    closeRejectModal();

    return;
  }


  if (!reason) {

    showMessage(
      "Le motif du rejet est obligatoire."
    );

    rejectReason.focus();

    return;
  }


  try {

    setBusy(true);


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_reject_deposit",
        {
          p_token: token,
          p_deposit_id: depositId,
          p_reason: reason
        }
      );


    if (error) {
      throw error;
    }


    console.log(
      "Dépôt rejeté :",
      data
    );


    closeRejectModal();


    showMessage(
      "Le dépôt a été rejeté.",
      "success"
    );


    await loadDeposits();


  } catch (error) {

    console.error(error);

    showMessage(
      error?.message ||
      "Impossible de rejeter le dépôt."
    );


  } finally {

    setBusy(false);
  }
}


/* =========================================================
   BUSY
========================================================= */

function setBusy(state) {

  refreshBtn.disabled =
    state;


  document
    .querySelectorAll(".action-btn, .proof-btn")
    .forEach((button) => {

      button.disabled =
        state;

    });


  confirmReject.disabled =
    state;
}


/* =========================================================
   EVENEMENTS
========================================================= */

depositBody.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "[data-action]"
      );


    if (!button) {
      return;
    }


    const action =
      button.dataset.action;


    const depositId =
      button.dataset.id;


    if (action === "proof") {

      openPaymentProof(
        depositId
      );

      return;
    }


    if (action === "verify") {

      verifyDeposit(
        depositId
      );

      return;
    }


    if (action === "approve") {

      approveDeposit(
        depositId
      );

      return;
    }


    if (action === "reject") {

      openRejectModal(
        depositId
      );

    }
  }
);


statusFilter.addEventListener(
  "change",
  loadDeposits
);


searchInput.addEventListener(
  "input",
  renderDeposits
);


refreshBtn.addEventListener(
  "click",
  loadDeposits
);


cancelReject.addEventListener(
  "click",
  closeRejectModal
);


confirmReject.addEventListener(
  "click",
  rejectDeposit
);


rejectModal.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      rejectModal
    ) {

      closeRejectModal();

    }
  }
);


backBtn.addEventListener(
  "click",
  () => {

    window.location.href =
      "dashboard-admin.html";

  }
);


/* =========================================================
   INITIALISATION
========================================================= */

loadDeposits();


/* =========================================================
   ACTUALISATION AUTOMATIQUE
========================================================= */

setInterval(() => {

  loadDeposits();

}, 60000);
