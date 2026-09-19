const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";

const message = document.getElementById("message");
const loading = document.getElementById("loading");
const tableContainer = document.getElementById("tableContainer");
const emptyState = document.getElementById("emptyState");
const depositBody = document.getElementById("depositBody");

const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const backBtn = document.getElementById("backBtn");

const rejectModal = document.getElementById("rejectModal");
const rejectReason = document.getElementById("rejectReason");
const cancelReject = document.getElementById("cancelReject");
const cancelRejectBottom = document.getElementById("cancelRejectBottom");
const confirmReject = document.getElementById("confirmReject");

let deposits = [];
let currentRejectDepositId = null;


/* =========================================================
   SESSION
========================================================= */

function getSessionToken() {
  return localStorage.getItem(SESSION_KEY);
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message show ${type}`;

  setTimeout(() => {
    message.className = "message";
    message.textContent = "";
  }, 5000);
}


/* =========================================================
   FORMATAGE
========================================================= */

function formatAmount(amount) {
  const value = Number(amount || 0);

  return value.toLocaleString("fr-FR") + " XOF";
}


function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   STATUT
========================================================= */

function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "En attente";

    case "verified":
      return "Vérifié";

    case "approved":
      return "Approuvé";

    case "rejected":
      return "Rejeté";

    default:
      return status || "Inconnu";
  }
}


function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "pending";

    case "verified":
      return "verified";

    case "approved":
      return "approved";

    case "rejected":
      return "rejected";

    default:
      return "pending";
  }
}


/* =========================================================
   CHARGEMENT DES DÉPÔTS
========================================================= */

async function loadDeposits() {

  const token = getSessionToken();

  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  loading.style.display = "block";
  tableContainer.style.display = "none";
  emptyState.classList.remove("show");

  refreshBtn.classList.add("loading");
  refreshBtn.disabled = true;

  try {

    const selectedStatus = statusFilter.value || null;

    const { data, error } = await supabaseClient.rpc(
      "get_admin_deposits",
      {
        p_token: token,
        p_status: selectedStatus
      }
    );

    if (error) {
      console.error("Erreur get_admin_deposits:", error);
      throw new Error(error.message);
    }

    /*
      Selon la fonction SQL, Supabase peut retourner directement
      un tableau ou un objet JSON contenant les dépôts.
    */

    if (Array.isArray(data)) {
      deposits = data;
    } else if (data && Array.isArray(data.deposits)) {
      deposits = data.deposits;
    } else if (data && Array.isArray(data.data)) {
      deposits = data.data;
    } else {
      deposits = [];
    }

    renderDeposits();

  } catch (error) {

    console.error(error);

    loading.style.display = "none";
    tableContainer.style.display = "none";

    showMessage(
      error.message || "Impossible de charger les dépôts.",
      "error"
    );

  } finally {

    loading.style.display = "none";

    refreshBtn.classList.remove("loading");
    refreshBtn.disabled = false;
  }
}


/* =========================================================
   RECHERCHE
========================================================= */

function getFilteredDeposits() {

  const search = searchInput.value
    .trim()
    .toLowerCase();

  if (!search) {
    return deposits;
  }

  return deposits.filter(deposit => {

    const fullName = String(
      deposit.full_name ||
      deposit.user_name ||
      ""
    ).toLowerCase();

    const userCode = String(
      deposit.user_code ||
      ""
    ).toLowerCase();

    const phone = String(
      deposit.payer_phone ||
      ""
    ).toLowerCase();

    const country = String(
      deposit.country_code ||
      ""
    ).toLowerCase();

    const operator = String(
      deposit.payment_operator ||
      ""
    ).toLowerCase();

    const receiver = String(
      deposit.payment_receiver ||
      ""
    ).toLowerCase();

    return (
      fullName.includes(search) ||
      userCode.includes(search) ||
      phone.includes(search) ||
      country.includes(search) ||
      operator.includes(search) ||
      receiver.includes(search)
    );
  });
}


/* =========================================================
   AFFICHAGE
========================================================= */

function renderDeposits() {

  const filteredDeposits = getFilteredDeposits();

  depositBody.innerHTML = "";

  if (!filteredDeposits.length) {

    tableContainer.style.display = "none";
    emptyState.classList.add("show");

    return;
  }

  emptyState.classList.remove("show");
  tableContainer.style.display = "block";

  filteredDeposits.forEach(deposit => {

    const tr = document.createElement("tr");

    const fullName =
      deposit.full_name ||
      deposit.user_name ||
      "Utilisateur";

    const userCode =
      deposit.user_code ||
      "";

    const country =
      deposit.country_code ||
      "—";

    const payerPhone =
      deposit.payer_phone ||
      "—";

    const amount =
      deposit.amount ||
      0;

    const status =
      deposit.status ||
      "pending";

    const operator =
      deposit.payment_operator ||
      "";

    const receiver =
      deposit.payment_receiver ||
      "";

    const createdAt =
      deposit.created_at;

    const hasProof =
      Boolean(
        deposit.payment_proof_path &&
        String(deposit.payment_proof_path).trim()
      );


    /* -----------------------------------------------------
       PREUVE
    ----------------------------------------------------- */

    let proofHtml = "";

    if (hasProof) {

      proofHtml = `
        <button
          type="button"
          class="action-btn proof"
          data-action="proof"
          data-id="${escapeHtml(deposit.id)}"
          title="Afficher la preuve de paiement"
        >
          <i class="fa-regular fa-image"></i>
          Voir la preuve
        </button>
      `;

    } else {

      /*
        Orange Money BF peut ne pas avoir de capture.
      */

      if (
        String(operator).toLowerCase().includes("orange") &&
        country === "BF"
      ) {

        proofHtml = `
          <span class="no-proof">
            Pas de capture
          </span>
        `;

      } else {

        proofHtml = `
          <span class="no-proof">
            Aucune preuve
          </span>
        `;
      }
    }


    /* -----------------------------------------------------
       ACTIONS
    ----------------------------------------------------- */

    let actionsHtml = "";

    if (status === "pending") {

      actionsHtml = `
        <button
          type="button"
          class="action-btn verify"
          data-action="verify"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-magnifying-glass"></i>
          Vérifier
        </button>
      `;

    } else if (status === "verified") {

      actionsHtml = `
        <button
          type="button"
          class="action-btn approve"
          data-action="approve"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-check"></i>
          Valider
        </button>

        <button
          type="button"
          class="action-btn reject"
          data-action="reject"
          data-id="${escapeHtml(deposit.id)}"
        >
          <i class="fa-solid fa-xmark"></i>
          Rejeter
        </button>
      `;

    } else if (status === "approved") {

      actionsHtml = `
        <span class="status approved">
          <i class="fa-solid fa-check"></i>
          Terminé
        </span>
      `;

    } else if (status === "rejected") {

      actionsHtml = `
        <span class="status rejected">
          <i class="fa-solid fa-ban"></i>
          Rejeté
        </span>
      `;
    }


    /* -----------------------------------------------------
       LIGNE
    ----------------------------------------------------- */

    tr.innerHTML = `
      <td>
        <div class="user-name">
          ${escapeHtml(fullName)}
        </div>

        ${
          userCode
            ? `
              <div class="user-code">
                ${escapeHtml(userCode)}
              </div>
            `
            : ""
        }
      </td>

      <td>
        <span class="country">
          ${escapeHtml(country)}
        </span>
      </td>

      <td>
        ${escapeHtml(payerPhone)}
      </td>

      <td>
        <span class="amount">
          ${formatAmount(amount)}
        </span>
      </td>

      <td>
        <span class="date">
          ${formatDate(createdAt)}
        </span>
      </td>

      <td>
        <span class="status ${getStatusClass(status)}">
          <i class="fa-solid fa-circle"></i>
          ${escapeHtml(getStatusLabel(status))}
        </span>
      </td>

      <td>
        ${proofHtml}
      </td>

      <td>
        <div class="actions">
          ${actionsHtml}
        </div>
      </td>
    `;

    depositBody.appendChild(tr);
  });
}


/* =========================================================
   VOIR LA PREUVE DE PAIEMENT
========================================================= */

async function viewProof(depositId) {

  const token = getSessionToken();

  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  if (!depositId) {
    showMessage(
      "Identifiant du dépôt manquant.",
      "error"
    );

    return;
  }

  const button = document.querySelector(
    `[data-action="proof"][data-id="${CSS.escape(depositId)}"]`
  );

  const originalHtml = button
    ? button.innerHTML
    : "";

  try {

    if (button) {
      button.disabled = true;

      button.innerHTML = `
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        Ouverture...
      `;
    }

    /*
      La fonction Edge doit vérifier le token admin
      puis générer une URL signée temporaire.
    */

    const { data, error } =
      await supabaseClient.functions.invoke(
        "admin-deposit-proof",
        {
          body: {
            p_token: token,
            p_deposit_id: depositId
          }
        }
      );

    if (error) {
      console.error(
        "Erreur Edge Function:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible d'obtenir la preuve."
      );
    }

    if (!data || !data.ok || !data.url) {

      throw new Error(
        data?.error ||
        "Aucune URL de preuve disponible."
      );
    }

    /*
      Ouverture de la preuve dans un nouvel onglet.

      Pour une image : affichage direct.
      Pour un PDF : le navigateur ouvrira le PDF.
    */

    const proofWindow = window.open(
      data.url,
      "_blank",
      "noopener,noreferrer"
    );

    if (!proofWindow) {

      showMessage(
        "Le navigateur a bloqué l'ouverture. Autorisez les fenêtres pop-up.",
        "error"
      );
    }

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Impossible d'afficher la preuve de paiement.",
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}


/* =========================================================
   VÉRIFIER
========================================================= */

async function verifyDeposit(depositId) {

  const token = getSessionToken();

  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  if (!depositId) return;

  try {

    const { data, error } =
      await supabaseClient.rpc(
        "admin_verify_deposit",
        {
          p_token: token,
          p_deposit_id: depositId
        }
      );

    if (error) {
      throw new Error(error.message);
    }

    if (
      data &&
      typeof data === "object" &&
      data.success === false
    ) {
      throw new Error(
        data.message ||
        data.error ||
        "La vérification a échoué."
      );
    }

    showMessage(
      "Le dépôt a été marqué comme vérifié.",
      "success"
    );

    await loadDeposits();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Impossible de vérifier le dépôt.",
      "error"
    );
  }
}


/* =========================================================
   APPROUVER
========================================================= */

async function approveDeposit(depositId) {

  const token = getSessionToken();

  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  if (!depositId) return;

  const confirmed = window.confirm(
    "Confirmer la validation de ce dépôt ?"
  );

  if (!confirmed) {
    return;
  }

  try {

    const { data, error } =
      await supabaseClient.rpc(
        "admin_approve_deposit",
        {
          p_token: token,
          p_deposit_id: depositId
        }
      );

    if (error) {
      throw new Error(error.message);
    }

    if (
      data &&
      typeof data === "object" &&
      data.success === false
    ) {
      throw new Error(
        data.message ||
        data.error ||
        "La validation a échoué."
      );
    }

    showMessage(
      "Dépôt validé avec succès.",
      "success"
    );

    await loadDeposits();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Impossible de valider le dépôt.",
      "error"
    );
  }
}


/* =========================================================
   OUVRIR MODAL REJET
========================================================= */

function openRejectModal(depositId) {

  currentRejectDepositId = depositId;

  rejectReason.value = "";

  rejectModal.classList.add("show");

  setTimeout(() => {
    rejectReason.focus();
  }, 100);
}


/* =========================================================
   FERMER MODAL REJET
========================================================= */

function closeRejectModal() {

  currentRejectDepositId = null;

  rejectReason.value = "";

  rejectModal.classList.remove("show");
}


/* =========================================================
   REJETER
========================================================= */

async function rejectDeposit() {

  const token = getSessionToken();

  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  if (!currentRejectDepositId) {
    return;
  }

  const reason = rejectReason.value.trim();

  if (!reason) {

    showMessage(
      "Veuillez indiquer le motif du rejet.",
      "error"
    );

    rejectReason.focus();

    return;
  }

  confirmReject.disabled = true;

  const originalHtml = confirmReject.innerHTML;

  confirmReject.innerHTML = `
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    Rejet...
  `;

  try {

    const { data, error } =
      await supabaseClient.rpc(
        "admin_reject_deposit",
        {
          p_token: token,
          p_deposit_id: currentRejectDepositId,
          p_reason: reason
        }
      );

    if (error) {
      throw new Error(error.message);
    }

    if (
      data &&
      typeof data === "object" &&
      data.success === false
    ) {
      throw new Error(
        data.message ||
        data.error ||
        "Le rejet a échoué."
      );
    }

    closeRejectModal();

    showMessage(
      "Dépôt rejeté.",
      "success"
    );

    await loadDeposits();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Impossible de rejeter le dépôt.",
      "error"
    );

  } finally {

    confirmReject.disabled = false;
    confirmReject.innerHTML = originalHtml;
  }
}


/* =========================================================
   ACTIONS DU TABLEAU
========================================================= */

depositBody.addEventListener("click", event => {

  const button =
    event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const action =
    button.dataset.action;

  const depositId =
    button.dataset.id;

  if (!depositId) {
    return;
  }

  if (action === "proof") {
    viewProof(depositId);
    return;
  }

  if (action === "verify") {
    verifyDeposit(depositId);
    return;
  }

  if (action === "approve") {
    approveDeposit(depositId);
    return;
  }

  if (action === "reject") {
    openRejectModal(depositId);
    return;
  }
});


/* =========================================================
   RECHERCHE
========================================================= */

searchInput.addEventListener(
  "input",
  () => {
    renderDeposits();
  }
);


/* =========================================================
   FILTRE
========================================================= */

statusFilter.addEventListener(
  "change",
  () => {
    loadDeposits();
  }
);


/* =========================================================
   ACTUALISER
========================================================= */

refreshBtn.addEventListener(
  "click",
  () => {
    loadDeposits();
  }
);


/* =========================================================
   MODAL
========================================================= */

cancelReject.addEventListener(
  "click",
  closeRejectModal
);

cancelRejectBottom.addEventListener(
  "click",
  closeRejectModal
);

confirmReject.addEventListener(
  "click",
  rejectDeposit
);


/*
  Fermer en cliquant à l'extérieur
*/
rejectModal.addEventListener(
  "click",
  event => {

    if (event.target === rejectModal) {
      closeRejectModal();
    }

  }
);


/*
  Fermer avec Échap
*/
document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      rejectModal.classList.contains("show")
    ) {
      closeRejectModal();
    }

  }
);


/* =========================================================
   RETOUR DASHBOARD
========================================================= */

backBtn.addEventListener(
  "click",
  () => {

    window.location.href =
      "admin-dashboard.html";

  }
);


/* =========================================================
   AUTO-REFRESH
========================================================= */

let autoRefreshTimer =
  setInterval(() => {

    /*
      On évite de recharger pendant que
      le modal de rejet est ouvert.
    */

    if (
      !rejectModal.classList.contains("show")
    ) {
      loadDeposits();
    }

  }, 60000);


/* =========================================================
   INITIALISATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadDeposits();
  }
);
