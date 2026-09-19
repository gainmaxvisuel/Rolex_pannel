const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";

const WESTPAY_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/westpay-transactions`;

let deposits = [];
let westpayTransactions = [];
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

const token = localStorage.getItem(SESSION_KEY);

if (!token) {
  window.location.href = "index.html";
}

/* =========================================================
   UTILITAIRES
========================================================= */

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message show ${type}`;

  setTimeout(() => {
    message.className = "message";
  }, 5000);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAmount(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("fr-FR").format(number) + " XOF";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

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
   NORMALISATION WESTPAY
========================================================= */

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCountry(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getWestPayTxId(tx) {
  return String(
    tx?.txId ??
    tx?.txID ??
    tx?.transactionId ??
    tx?.transaction_id ??
    tx?.id ??
    tx?.reference ??
    ""
  );
}

function getWestPayAmount(tx) {
  return Number(
    tx?.amount ??
    tx?.value ??
    tx?.requestedAmount ??
    0
  );
}

function getWestPayPhone(tx) {
  return normalizePhone(
    tx?.payer?.msisdn ??
    tx?.payer?.phone ??
    tx?.payer?.phoneNumber ??
    tx?.msisdn ??
    tx?.phone ??
    tx?.payer ??
    ""
  );
}

function getWestPayCountry(tx) {
  return normalizeCountry(
    tx?.country ??
    tx?.country_code ??
    tx?.countryCode ??
    tx?.payer?.country ??
    ""
  );
}

function getWestPayStatus(tx) {
  return String(
    tx?.status ??
    tx?.state ??
    tx?.paymentStatus ??
    ""
  ).toLowerCase();
}

function isWestPaySuccessful(tx) {
  const status = getWestPayStatus(tx);

  return [
    "success",
    "successful",
    "confirmed",
    "completed",
    "paid",
    "approved"
  ].includes(status);
}

/* =========================================================
   CORRESPONDANCE WESTPAY
========================================================= */

function findWestPayMatch(deposit) {
  if (!deposit) return null;

  const depositPhone = normalizePhone(
    deposit.payer_phone || deposit.phone
  );

  const depositCountry = normalizeCountry(
    deposit.country_code
  );

  const depositAmount = Number(deposit.amount || 0);

  if (!depositPhone || !depositAmount) {
    return null;
  }

  const candidates = westpayTransactions.filter(tx => {

    if (!isWestPaySuccessful(tx)) {
      return false;
    }

    const txAmount = getWestPayAmount(tx);
    const txPhone = getWestPayPhone(tx);
    const txCountry = getWestPayCountry(tx);

    if (txAmount !== depositAmount) {
      return false;
    }

    if (txPhone !== depositPhone) {
      return false;
    }

    /*
      Si WestPay fournit le pays,
      on le compare.
      S'il ne le fournit pas, on ne bloque pas
      la correspondance.
    */
    if (
      txCountry &&
      depositCountry &&
      txCountry !== depositCountry
    ) {
      return false;
    }

    return true;
  });

  if (!candidates.length) {
    return null;
  }

  /*
    Si plusieurs transactions correspondent,
    on ne choisit pas arbitrairement.
    On signale plusieurs correspondances.
  */
  if (candidates.length > 1) {
    return {
      ambiguous: true,
      candidates
    };
  }

  return {
    ambiguous: false,
    transaction: candidates[0]
  };
}

/* =========================================================
   CHARGEMENT WESTPAY
========================================================= */

async function loadWestPayTransactions() {

  try {

    const response = await fetch(
      WESTPAY_FUNCTION_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.error ||
        "Impossible de récupérer les transactions WestPay."
      );
    }

    westpayTransactions =
      Array.isArray(data.transactions)
        ? data.transactions
        : [];

    console.log(
      "Transactions WestPay récupérées :",
      westpayTransactions.length
    );

  } catch (error) {

    console.error(
      "Erreur WestPay :",
      error
    );

    westpayTransactions = [];

    /*
      On ne bloque pas le chargement des dépôts Kong
      si WestPay est momentanément indisponible.
    */
    showMessage(
      "Les dépôts Kong sont chargés, mais les transactions WestPay sont momentanément indisponibles."
    );
  }
}

/* =========================================================
   FILTRAGE KONG
========================================================= */

function filteredDeposits() {

  const filter = statusFilter.value;
  const search = searchInput.value.trim().toLowerCase();

  return deposits.filter(deposit => {

    if (filter && deposit.status !== filter) {
      return false;
    }

    if (!search) {
      return true;
    }

    const text = [
      deposit.full_name,
      deposit.user_code,
      deposit.phone,
      deposit.payer_phone
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });
}

/* =========================================================
   AFFICHAGE WESTPAY
========================================================= */

function renderWestPay(deposit) {

  /*
    Pour les dépôts déjà validés/rejetés,
    on affiche seulement l'information fournisseur
    si disponible.
  */

  const match = findWestPayMatch(deposit);

  if (!match) {

    return `
      <div style="
        padding:10px;
        border-radius:8px;
        background:rgba(255,255,255,.035);
        border:1px solid rgba(255,255,255,.06);
        color:#7f8d85;
        font-size:12px;
      ">
        <div style="font-weight:700;color:#9daaa2;">
          <i class="fa-solid fa-circle-question"></i>
          Aucun paiement correspondant
        </div>

        <div style="margin-top:4px;">
          ${escapeHtml(formatAmount(deposit.amount))}
          · ${escapeHtml(deposit.payer_phone || "Téléphone —")}
        </div>
      </div>
    `;
  }

  if (match.ambiguous) {

    return `
      <div style="
        padding:10px;
        border-radius:8px;
        background:rgba(234,179,8,.08);
        border:1px solid rgba(234,179,8,.25);
        color:#facc15;
        font-size:12px;
      ">
        <div style="font-weight:700;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Plusieurs paiements correspondent
        </div>

        <div style="margin-top:4px;color:#c9b86a;">
          ${match.candidates.length} transactions trouvées.
          Vérification manuelle nécessaire.
        </div>
      </div>
    `;
  }

  const tx = match.transaction;

  const txId = getWestPayTxId(tx);
  const operator =
    tx?.provider ??
    tx?.operator ??
    tx?.network ??
    tx?.service ??
    "—";

  return `
    <div style="
      padding:11px;
      border-radius:9px;
      background:rgba(16,185,129,.07);
      border:1px solid rgba(16,185,129,.25);
      font-size:12px;
      min-width:230px;
    ">

      <div style="
        display:flex;
        align-items:center;
        gap:7px;
        color:#34d399;
        font-weight:800;
        margin-bottom:8px;
      ">
        <i class="fa-solid fa-circle-check"></i>
        Paiement WestPay trouvé
      </div>

      <div style="color:#d9e2dc;">
        <strong>${escapeHtml(formatAmount(getWestPayAmount(tx)))}</strong>
      </div>

      <div style="color:#9daaa2;margin-top:4px;">
        Téléphone :
        <strong style="color:#fff;">
          ${escapeHtml(
            tx?.payer?.phone ??
            tx?.payer?.msisdn ??
            tx?.phone ??
            tx?.msisdn ??
            "—"
          )}
        </strong>
      </div>

      <div style="color:#9daaa2;margin-top:3px;">
        Opérateur :
        <strong style="color:#fff;">
          ${escapeHtml(operator)}
        </strong>
      </div>

      <div style="color:#9daaa2;margin-top:3px;">
        Statut :
        <strong style="color:#34d399;">
          Réussi
        </strong>
      </div>

      <div style="
        margin-top:7px;
        padding-top:7px;
        border-top:1px solid rgba(255,255,255,.07);
        color:#7f8d85;
        word-break:break-all;
      ">
        Tx ID :
        <span style="color:#d4a317;">
          ${escapeHtml(txId || "—")}
        </span>
      </div>

    </div>
  `;
}

/* =========================================================
   AFFICHAGE DES DÉPÔTS
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

  list.forEach(deposit => {

    const tr = document.createElement("tr");

    const status = deposit.status;

    let actions = "";

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

    /*
      On affiche WestPay principalement pour les dépôts
      en attente ou vérifiés.
    */
    const westpayHtml =
      status === "pending" || status === "verified"
        ? renderWestPay(deposit)
        : `
          <span style="
            color:#65736b;
            font-size:12px;
          ">
            —
          </span>
        `;

    tr.innerHTML = `

      <td>
        <div class="user-name">
          ${escapeHtml(deposit.full_name || "—")}
        </div>

        <div class="user-code">
          ${escapeHtml(deposit.user_code || "—")}
        </div>
      </td>

      <td>
        ${escapeHtml(deposit.country_code || "—")}
      </td>

      <td>
        ${escapeHtml(deposit.payer_phone || "—")}
      </td>

      <td>
        <span class="amount">
          ${formatAmount(deposit.amount)}
        </span>
      </td>

      <td>
        ${formatDate(deposit.created_at)}
      </td>

      <td>
        <span class="status ${statusClass(status)}">
          ${escapeHtml(statusLabel(status))}
        </span>
      </td>

      <td>
        <div class="actions">
          ${actions}
        </div>
      </td>

      <td>
        ${westpayHtml}
      </td>
    `;

    depositBody.appendChild(tr);
  });
}

/* =========================================================
   CHARGEMENT DES DÉPÔTS KONG + WESTPAY
========================================================= */

async function loadDeposits() {

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  loading.style.display = "block";
  tableContainer.style.display = "none";
  emptyState.style.display = "none";

  try {

    const selectedStatus =
      statusFilter.value || null;

    /*
      Les deux sources sont récupérées avant l'affichage.
    */

    const [kongResult] = await Promise.all([

      supabaseClient.rpc(
        "get_admin_deposits",
        {
          p_token: token,
          p_status: selectedStatus
        }
      ),

      loadWestPayTransactions()
    ]);

    const {
      data,
      error
    } = kongResult;

    if (error) {
      throw error;
    }

    deposits =
      Array.isArray(data)
        ? data
        : [];

    loading.style.display = "none";

    renderDeposits();

  } catch (error) {

    console.error(error);

    loading.style.display = "none";
    tableContainer.style.display = "none";
    emptyState.style.display = "block";

    showMessage(
      error?.message ||
      "Impossible de charger les dépôts."
    );

    if (
      error?.message?.toLowerCase().includes("session") ||
      error?.message?.toLowerCase().includes("permission")
    ) {

      setTimeout(() => {

        localStorage.removeItem(SESSION_KEY);
        window.location.href = "index.html";

      }, 1800);
    }
  }
}

/* =========================================================
   VÉRIFICATION
========================================================= */

async function verifyDeposit(depositId) {

  if (!depositId) return;

  if (!confirm(
    "Voulez-vous vérifier ce dépôt ?"
  )) {
    return;
  }

  try {

    setBusy(true);

    const {
      data,
      error
    } = await supabaseClient.rpc(
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
   VALIDATION
========================================================= */

async function approveDeposit(depositId) {

  if (!depositId) return;

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
    } = await supabaseClient.rpc(
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
   REJET
========================================================= */

function openRejectModal(depositId) {

  rejectDepositId = depositId;
  rejectReason.value = "";

  rejectModal.classList.add("show");

  setTimeout(() => {
    rejectReason.focus();
  }, 100);
}

function closeRejectModal() {

  rejectDepositId = null;
  rejectReason.value = "";

  rejectModal.classList.remove("show");
}

async function rejectDeposit() {

  const depositId = rejectDepositId;
  const reason = rejectReason.value.trim();

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
    } = await supabaseClient.rpc(
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

  refreshBtn.disabled = state;

  document
    .querySelectorAll(".action-btn")
    .forEach(button => {
      button.disabled = state;
    });

  confirmReject.disabled = state;
}

/* =========================================================
   EVENTS
========================================================= */

depositBody.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest("[data-action]");

    if (!button) return;

    const action =
      button.dataset.action;

    const depositId =
      button.dataset.id;

    if (action === "verify") {
      verifyDeposit(depositId);
    }

    if (action === "approve") {
      approveDeposit(depositId);
    }

    if (action === "reject") {
      openRejectModal(depositId);
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
  event => {

    if (event.target === rejectModal) {
      closeRejectModal();
    }
  }
);

document
  .getElementById("backBtn")
  .addEventListener(
    "click",
    () => {
      window.location.href =
        "dashboard-admin.html";
    }
  );

/* ========================
