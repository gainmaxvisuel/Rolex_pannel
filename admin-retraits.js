const SUPABASE_URL =
  "https://cbxjcwjlhvicurpndoyz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const SESSION_KEY =
  "rolex_admin_session_token";

let withdrawals = [];

let rejectWithdrawalId = null;

const withdrawalsBox =
  document.getElementById("withdrawals");

const loading =
  document.getElementById("loading");

const empty =
  document.getElementById("empty");

const statusFilter =
  document.getElementById("statusFilter");

const searchInput =
  document.getElementById("searchInput");

const refreshBtn =
  document.getElementById("refreshBtn");

const rejectModal =
  document.getElementById("rejectModal");

const rejectReason =
  document.getElementById("rejectReason");

const toast =
  document.getElementById("toast");


function getToken() {

  return localStorage.getItem(
    SESSION_KEY
  );

}


function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


function formatAmount(value) {

  return Number(value || 0)
    .toLocaleString("fr-FR")
    + " XOF";

}


function formatDate(value) {

  if (!value) {
    return "—";
  }

  const d =
    new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleString(
    "fr-FR",
    {
      day:"2-digit",
      month:"2-digit",
      year:"numeric",
      hour:"2-digit",
      minute:"2-digit"
    }
  );
}


function statusLabel(status) {

  switch (
    String(status || "")
      .toLowerCase()
  ) {

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


function showToast(
  message,
  type = "success"
) {

  toast.textContent =
    message;

  toast.style.display =
    "block";

  toast.style.background =
    type === "error"
      ? "#7f1d1d"
      : "#065f46";

  clearTimeout(
    toast._timer
  );

  toast._timer =
    setTimeout(() => {
      toast.style.display =
        "none";
    },4000);
}


async function loadWithdrawals() {

  const token =
    getToken();

  if (!token) {

    window.location.href =
      "admin-login.html";

    return;
  }

  loading.style.display =
    "block";

  withdrawalsBox.innerHTML =
    "";

  empty.style.display =
    "none";

  try {

    const selectedStatus =
      statusFilter.value || null;

    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "get_admin_withdrawals",
        {
          p_token:token,
          p_status:selectedStatus
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    let result = data;

    if (typeof result === "string") {
      result =
        JSON.parse(result);
    }

    withdrawals =
      Array.isArray(result)
        ? result
        : [];

    renderWithdrawals();

  } catch (error) {

    console.error(
      "Erreur retraits:",
      error
    );

    withdrawals = [];

    empty.style.display =
      "block";

    showToast(
      error.message ||
      "Impossible de charger les retraits.",
      "error"
    );

  } finally {

    loading.style.display =
      "none";

  }
}


function getFilteredWithdrawals() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();

  if (!search) {
    return withdrawals;
  }

  return withdrawals.filter(
    w => {

      const values = [

        w.full_name,
        w.user_code,
        w.phone,
        w.withdrawal_owner_name,
        w.withdrawal_phone,
        w.withdrawal_operator,
        w.country_code,
        w.requested_amount,
        w.net_amount,
        w.status

      ];

      return values.some(
        value =>
          String(value ?? "")
            .toLowerCase()
            .includes(search)
      );

    }
  );
}


function renderWithdrawals() {

  const list =
    getFilteredWithdrawals();

  withdrawalsBox.innerHTML =
    "";

  if (!list.length) {

    empty.style.display =
      "block";

    return;
  }

  empty.style.display =
    "none";

  list.forEach(w => {

    const status =
      String(
        w.status || ""
      ).toLowerCase();

    const card =
      document.createElement("article");

    card.className =
      "withdrawal-card";

    let actions = "";

    if (status === "pending") {

      actions = `
        <button
          class="action-btn verify"
          data-action="verify"
          data-id="${escapeHtml(w.id)}"
        >
          <i class="fa-solid fa-magnifying-glass"></i>
          Vérifier
        </button>
      `;

    } else if (status === "verified") {

      actions = `
        <button
          class="action-btn approve"
          data-action="approve"
          data-id="${escapeHtml(w.id)}"
        >
          <i class="fa-solid fa-check"></i>
          Valider le transfert
        </button>

        <button
          class="action-btn reject"
          data-action="reject"
          data-id="${escapeHtml(w.id)}"
        >
          <i class="fa-solid fa-ban"></i>
          Rejeter
        </button>
      `;

    } else if (status === "approved") {

      actions = `
        <span class="status approved">
          <i class="fa-solid fa-check"></i>
          Approuvé
        </span>
      `;

    } else if (status === "rejected") {

      actions = `
        <span class="status rejected">
          <i class="fa-solid fa-ban"></i>
          Rejeté
        </span>
      `;
    }

    card.innerHTML = `

      <div class="card-top">

        <div>
          <div class="user-name">
            ${escapeHtml(
              w.full_name ||
              "Utilisateur"
            )}
          </div>

          <div class="user-code">
            ${escapeHtml(
              w.user_code || ""
            )}
          </div>
        </div>

        <span class="status ${escapeHtml(status)}">
          ${escapeHtml(
            statusLabel(status)
          )}
        </span>

      </div>


      <div class="account-box">

        <div class="account-title">
          <i class="fa-solid fa-mobile-screen-button"></i>
          Compte de réception
        </div>

        <div class="account-grid">

          <div class="account-item">
            <span>Nom du bénéficiaire</span>
            <strong>
              ${escapeHtml(
                w.withdrawal_owner_name ||
                "—"
              )}
            </strong>
          </div>

          <div class="account-item">
            <span>Numéro à payer</span>
            <strong>
              ${escapeHtml(
                w.withdrawal_phone ||
                "—"
              )}
            </strong>
          </div>

          <div class="account-item">
            <span>Opérateur</span>
            <strong>
              ${escapeHtml(
                w.withdrawal_operator ||
                "—"
              )}
            </strong>
          </div>

        </div>

      </div>


      <div class="amount-grid">

        <div class="amount-box">
          <span>Montant demandé</span>
          <strong class="requested">
            ${formatAmount(
              w.requested_amount
            )}
          </strong>
        </div>

        <div class="amount-box">
          <span>Frais</span>
          <strong class="fee">
            ${formatAmount(
              w.fee_amount
            )}
          </strong>
        </div>

        <div class="amount-box">
          <span>À transférer</span>
          <strong class="net">
            ${formatAmount(
              w.net_amount
            )}
          </strong>
        </div>

      </div>


      <div class="meta">

        <span>
          <i class="fa-solid fa-flag"></i>
          ${escapeHtml(
            w.country_code || "—"
          )}
        </span>

        <span>
          <i class="fa-solid fa-phone"></i>
          ${escapeHtml(
            w.phone || "—"
          )}
        </span>

        <span>
          <i class="fa-regular fa-clock"></i>
          ${formatDate(
            w.created_at
          )}
        </span>

      </div>


      <div class="actions">

        ${actions}

      </div>
    `;

    withdrawalsBox.appendChild(
      card
    );

  });
}


async function verifyWithdrawal(id) {

  const token =
    getToken();

  try {

    const {
      error
    } =
      await supabaseClient.rpc(
        "admin_verify_withdrawal",
        {
          p_token:token,
          p_withdrawal_id:id
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    showToast(
      "Retrait vérifié. Vous pouvez maintenant effectuer le transfert puis valider.",
      "success"
    );

    await loadWithdrawals();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Impossible de vérifier le retrait.",
      "error"
    );
  }
}


async function approveWithdrawal(id) {

  if (!confirm(
    "Confirmer que le transfert vers le compte affiché a été effectué ?"
  )) {
    return;
  }

  const token =
    getToken();

  try {

    const {
      error
    } =
      await supabaseClient.rpc(
        "admin_approve_withdrawal",
        {
          p_token:token,
          p_withdrawal_id:id
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    showToast(
      "Retrait validé avec succès.",
      "success"
    );

    await loadWithdrawals();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Impossible de valider le retrait.",
      "error"
    );
  }
}


function openReject(id) {

  rejectWithdrawalId =
    id;

  rejectReason.value =
    "";

  rejectModal.classList.add(
    "show"
  );

}


function closeReject() {

  rejectWithdrawalId =
    null;

  rejectReason.value =
    "";

  rejectModal.classList.remove(
    "show"
  );
}


async function rejectWithdrawal() {

  if (!rejectWithdrawalId) {
    return;
  }

  const reason =
    rejectReason.value.trim();

  if (!reason) {

    showToast(
      "Veuillez indiquer le motif du rejet.",
      "error"
    );

    return;
  }

  const token =
    getToken();

  try {

    const {
      error
    } =
      await supabaseClient.rpc(
        "admin_reject_withdrawal",
        {
          p_token:token,
          p_withdrawal_id:
            rejectWithdrawalId,
          p_reason:reason
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    closeReject();

    showToast(
      "Retrait rejeté et montant remboursé.",
      "success"
    );

    await loadWithdrawals();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Impossible de rejeter le retrait.",
      "error"
    );
  }
}


withdrawalsBox.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-action]"
      );

    if (!button) {
      return;
    }

    const action =
      button.dataset.action;

    const id =
      button.dataset.id;

    if (action === "verify") {
      verifyWithdrawal(id);
    }

    if (action === "approve") {
      approveWithdrawal(id);
    }

    if (action === "reject") {
      openReject(id);
    }

  }
);


statusFilter.addEventListener(
  "change",
  loadWithdrawals
);


searchInput.addEventListener(
  "input",
  renderWithdrawals
);


refreshBtn.addEventListener(
  "click",
  loadWithdrawals
);


document.getElementById(
  "closeReject"
).addEventListener(
  "click",
  closeReject
);


document.getElementById(
  "cancelReject"
).addEventListener(
  "click",
  closeReject
);


document.getElementById(
  "confirmReject"
).addEventListener(
  "click",
  rejectWithdrawal
);


document.getElementById(
  "backBtn"
).addEventListener(
  "click",
  () => {
    window.location.href =
      "admin-dashboard.html";
  }
);


loadWithdrawals();
