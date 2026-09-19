/* =========================================================
   ROLEX — ADMIN DÉPÔTS
   Version complète corrigée
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const SUPABASE_URL =
  "https://cbxjcwjlhvicurpndoyz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";


/* =========================================================
   SUPABASE
========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   VARIABLES
========================================================= */

let deposits = [];

let currentRejectDepositId = null;

let autoRefreshTimer = null;


/* =========================================================
   ÉLÉMENTS HTML
========================================================= */

const depositBody =
  document.getElementById("depositBody");

const tableContainer =
  document.getElementById("tableContainer");

const emptyState =
  document.getElementById("emptyState");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");

const refreshBtn =
  document.getElementById("refreshBtn");

const backBtn =
  document.getElementById("backBtn");

const rejectModal =
  document.getElementById("rejectModal");

const rejectReason =
  document.getElementById("rejectReason");

const cancelReject =
  document.getElementById("cancelReject");

const cancelRejectBottom =
  document.getElementById(
    "cancelRejectBottom"
  );

const confirmReject =
  document.getElementById(
    "confirmReject"
  );


/* =========================================================
   SESSION
========================================================= */

function getSessionToken() {

  return localStorage.getItem(
    "rolex_admin_session_token"
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
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
   FORMAT MONTANT
========================================================= */

function formatAmount(amount) {

  return (
    Number(amount || 0)
      .toLocaleString("fr-FR")
    + " XOF"
  );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   STATUT — LABEL
========================================================= */

function getStatusLabel(status) {

  switch (
    String(status || "")
      .trim()
      .toLowerCase()
  ) {

    case "pending":
      return "En attente";

    case "verified":
      return "Vérifié";

    case "approved":
      return "Validé";

    case "rejected":
      return "Rejeté";

    case "failed":
      return "Échec";

    case "cancelled":
      return "Annulé";

    default:
      return status || "Inconnu";
  }

}


/* =========================================================
   STATUT — CLASSE
========================================================= */

function getStatusClass(status) {

  switch (
    String(status || "")
      .trim()
      .toLowerCase()
  ) {

    case "pending":
      return "pending";

    case "verified":
      return "verified";

    case "approved":
      return "approved";

    case "rejected":
      return "rejected";

    default:
      return "";
  }

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  message,
  type = "success"
) {

  let box =
    document.getElementById(
      "messageBox"
    );

  if (!box) {

    box =
      document.createElement(
        "div"
      );

    box.id =
      "messageBox";

    Object.assign(
      box.style,
      {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "99999",
        maxWidth: "420px",
        padding: "14px 18px",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow:
          "0 10px 30px rgba(0,0,0,.35)"
      }
    );

    document.body.appendChild(
      box
    );
  }

  box.textContent =
    message || "";

  box.style.background =
    type === "error"
      ? "#7f1d1d"
      : "#065f46";

  box.style.color =
    "#ffffff";

  box.style.display =
    "block";

  clearTimeout(
    box._timer
  );

  box._timer =
    setTimeout(
      () => {
        box.style.display =
          "none";
      },
      4000
    );

}


/* =========================================================
   OBTENIR LE FILTRE STATUT
========================================================= */

function getSelectedStatus() {

  if (!statusFilter) {
    return null;
  }

  const value =
    String(
      statusFilter.value || ""
    )
      .trim()
      .toLowerCase();

  /*
   * Très important :
   * "", "all", "tous" = aucun filtre.
   */

  if (
    value === "" ||
    value === "all" ||
    value === "tous"
  ) {

    return null;
  }

  return value;

}


/* =========================================================
   CHARGER LES DÉPÔTS
========================================================= */

async function loadDeposits() {

  const token =
    getSessionToken();

  if (!token) {

    window.location.href =
      "admin-login.html";

    return;
  }


  try {

    if (refreshBtn) {

      refreshBtn.disabled =
        true;
    }


    const selectedStatus =
      getSelectedStatus();


    console.log(
      "Chargement dépôts. Filtre:",
      selectedStatus
    );


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "get_admin_deposits",
        {
          p_token:
            token,

          /*
           * null = TOUS les dépôts
           */
          p_status:
            selectedStatus
        }
      );


    if (error) {

      console.error(
        "Erreur Supabase get_admin_deposits:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de charger les dépôts."
      );
    }


    console.log(
      "Réponse get_admin_deposits:",
      data
    );


    let result =
      data;


    /*
     * JSONB peut arriver comme objet
     * ou chaîne selon le contexte.
     */

    if (
      typeof result ===
      "string"
    ) {

      try {

        result =
          JSON.parse(result);

      } catch (e) {

        console.error(
          "Erreur JSON:",
          e
        );

        result = [];
      }
    }


    if (
      result === null ||
      result === undefined
    ) {

      result = [];
    }


    /*
     * Si le résultat est directement
     * un tableau.
     */

    if (
      Array.isArray(result)
    ) {

      deposits =
        result;

    }

    /*
     * Sécurité si la réponse contient
     * une propriété data.
     */

    else if (
      result &&
      Array.isArray(
        result.data
      )
    ) {

      deposits =
        result.data;

    }

    else {

      deposits = [];
    }


    console.log(
      "Nombre de dépôts chargés:",
      deposits.length
    );


    renderDeposits();


  } catch (error) {

    console.error(
      "Erreur loadDeposits:",
      error
    );

    deposits = [];

    renderDeposits();

    showMessage(
      error.message ||
      "Impossible de charger les dépôts.",
      "error"
    );


  } finally {

    if (refreshBtn) {

      refreshBtn.disabled =
        false;
    }

  }

}


/* =========================================================
   RECHERCHE
========================================================= */

function getFilteredDeposits() {

  if (!searchInput) {

    return deposits;
  }


  const search =
    searchInput.value
      .trim()
      .toLowerCase();


  if (!search) {

    return deposits;
  }


  return deposits.filter(
    deposit => {

      const values = [

        deposit.full_name,

        deposit.user_code,

        deposit.country_code,

        deposit.phone,

        deposit.payer_phone,

        deposit.payment_operator,

        deposit.payment_receiver,

        deposit.amount,

        deposit.status,

        deposit.id

      ];


      return values.some(
        value =>
          String(
            value ?? ""
          )
          .toLowerCase()
          .includes(search)
      );

    }
  );

}


/* =========================================================
   AFFICHER LES DÉPÔTS
========================================================= */

function renderDeposits() {

  if (!depositBody) {

    console.error(
      "Élément #depositBody introuvable."
    );

    return;
  }


  const filteredDeposits =
    getFilteredDeposits();


  depositBody.innerHTML =
    "";


  if (
    filteredDeposits.length ===
    0
  ) {

    if (tableContainer) {

      tableContainer.style.display =
        "none";
    }

    if (emptyState) {

      emptyState.classList.add(
        "show"
      );
    }

    return;
  }


  if (emptyState) {

    emptyState.classList.remove(
      "show"
    );
  }


  if (tableContainer) {

    tableContainer.style.display =
      "block";
  }


  filteredDeposits.forEach(
    deposit => {

      const tr =
        document.createElement(
          "tr"
        );


      const fullName =
        deposit.full_name ||
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
        Number(
          deposit.amount || 0
        );


      const status =
        String(
          deposit.status ||
          "pending"
        )
        .trim()
        .toLowerCase();


      const createdAt =
        deposit.created_at;


      /*
       * La preuve est indépendante
       * du statut.
       */

      const proofPath =
        String(
          deposit.payment_proof_path ||
          ""
        ).trim();


      const hasProof =
        proofPath.length > 0;


      let proofHtml =
        "";


      if (hasProof) {

        proofHtml = `
          <button
            type="button"
            class="action-btn proof"
            data-action="proof"
            data-id="${escapeHtml(
              deposit.id
            )}"
          >
            <i class="fa-regular fa-image"></i>
            Voir la preuve
          </button>
        `;

      } else {

        proofHtml = `
          <span class="no-proof">
            Aucune preuve
          </span>
        `;
      }


      /*
       * ACTIONS SELON LE STATUT
       */

      let actionsHtml =
        "";


      if (
        status === "pending"
      ) {

        actionsHtml = `
          <button
            type="button"
            class="action-btn verify"
            data-action="verify"
            data-id="${escapeHtml(
              deposit.id
            )}"
          >
            <i class="fa-solid fa-magnifying-glass"></i>
            Vérifier
          </button>
        `;

      }

      else if (
        status === "verified"
      ) {

        actionsHtml = `
          <button
            type="button"
            class="action-btn approve"
            data-action="approve"
            data-id="${escapeHtml(
              deposit.id
            )}"
          >
            <i class="fa-solid fa-check"></i>
            Valider
          </button>

          <button
            type="button"
            class="action-btn reject"
            data-action="reject"
            data-id="${escapeHtml(
              deposit.id
            )}"
          >
            <i class="fa-solid fa-xmark"></i>
            Rejeter
          </button>
        `;

      }

      else if (
        status === "approved"
      ) {

        actionsHtml = `
          <span class="status approved">
            <i class="fa-solid fa-check"></i>
            Validé
          </span>
        `;

      }

      else if (
        status === "rejected"
      ) {

        actionsHtml = `
          <span class="status rejected">
            <i class="fa-solid fa-ban"></i>
            Rejeté
          </span>
        `;

      }

      else {

        actionsHtml = `
          <span class="status">
            ${escapeHtml(
              getStatusLabel(
                status
              )
            )}
          </span>
        `;
      }


      tr.innerHTML = `

        <td>

          <div class="user-name">
            ${escapeHtml(
              fullName
            )}
          </div>

          ${
            userCode
              ? `
                <div class="user-code">
                  ${escapeHtml(
                    userCode
                  )}
                </div>
              `
              : ""
          }

        </td>


        <td>

          <span class="country">
            ${escapeHtml(
              country
            )}
          </span>

        </td>


        <td>
          ${escapeHtml(
            payerPhone
          )}
        </td>


        <td>

          <span class="amount">
            ${formatAmount(
              amount
            )}
          </span>

        </td>


        <td>

          <span class="date">
            ${formatDate(
              createdAt
            )}
          </span>

        </td>


        <td>

          <span
            class="status ${getStatusClass(
              status
            )}"
          >

            <i
              class="fa-solid fa-circle"
            ></i>

            ${escapeHtml(
              getStatusLabel(
                status
              )
            )}

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


      depositBody.appendChild(
        tr
      );

    }
  );

}


/* =========================================================
   VÉRIFIER
========================================================= */

async function verifyDeposit(
  depositId
) {

  const token =
    getSessionToken();


  if (!token) {

    window.location.href =
      "admin-login.html";

    return;
  }


  if (!depositId) {

    showMessage(
      "Identifiant du dépôt manquant.",
      "error"
    );

    return;
  }


  const button =
    document.querySelector(
      `[data-action="verify"][data-id="${CSS.escape(
        depositId
      )}"]`
    );


  const originalHtml =
    button
      ? button.innerHTML
      : "";


  try {

    if (button) {

      button.disabled =
        true;

      button.innerHTML = `
        <i
          class="fa-solid fa-circle-notch fa-spin"
        ></i>
        Vérification...
      `;
    }


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_verify_deposit",
        {
          p_token:
            token,

          p_deposit_id:
            depositId
        }
      );


    if (error) {

      console.error(
        "Erreur admin_verify_deposit:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de vérifier le dépôt."
      );
    }


    if (
      data &&
      typeof data ===
        "object" &&
      data.success ===
        false
    ) {

      throw new Error(
        data.message ||
        data.error ||
        "La vérification a échoué."
      );
    }


    const index =
      deposits.findIndex(
        deposit =>
          String(
            deposit.id
          ) ===
          String(
            depositId
          )
      );


    if (
      index !== -1
    ) {

      /*
       * On conserve absolument
       * toutes les autres données.
       */

      deposits[index] = {

        ...deposits[index],

        status:
          "verified"

      };


      renderDeposits();


      showMessage(
        "Dépôt vérifié. Vous pouvez maintenant le valider ou le rejeter.",
        "success"
      );


    } else {

      /*
       * Sécurité :
       * si le dépôt n'est plus dans
       * le tableau local, on recharge.
       */

      await loadDeposits();

      showMessage(
        "Dépôt vérifié.",
        "success"
      );
    }


  } catch (error) {

    console.error(
      "Erreur vérification:",
      error
    );

    showMessage(
      error.message ||
      "Impossible de vérifier le dépôt.",
      "error"
    );


    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        originalHtml;
    }

  }

}


/* =========================================================
   VALIDER
========================================================= */

async function approveDeposit(
  depositId
) {

  const token =
    getSessionToken();


  if (!token) {

    window.location.href =
      "admin-login.html";

    return;
  }


  if (!depositId) {

    showMessage(
      "Identifiant du dépôt manquant.",
      "error"
    );

    return;
  }


  if (
    !window.confirm(
      "Confirmer la validation de ce dépôt ?"
    )
  ) {

    return;
  }


  const button =
    document.querySelector(
      `[data-action="approve"][data-id="${CSS.escape(
        depositId
      )}"]`
    );


  const originalHtml =
    button
      ? button.innerHTML
      : "";


  try {

    if (button) {

      button.disabled =
        true;

      button.innerHTML = `
        <i
          class="fa-solid fa-circle-notch fa-spin"
        ></i>
        Validation...
      `;
    }


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_approve_deposit",
        {
          p_token:
            token,

          p_deposit_id:
            depositId
        }
      );


    if (error) {

      console.error(
        "Erreur admin_approve_deposit:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de valider le dépôt."
      );
    }


    if (
      data &&
      typeof data ===
        "object" &&
      data.success ===
        false
    ) {

      throw new Error(
        data.message ||
        data.error ||
        "La validation a échoué."
      );
    }


    const index =
      deposits.findIndex(
        deposit =>
          String(
            deposit.id
          ) ===
          String(
            depositId
          )
      );


    if (
      index !== -1
    ) {

      deposits[index] = {

        ...deposits[index],

        status:
          "approved"

      };

    }


    renderDeposits();


    showMessage(
      "Dépôt validé avec succès.",
      "success"
    );


  } catch (error) {

    console.error(
      "Erreur validation:",
      error
    );

    showMessage(
      error.message ||
      "Impossible de valider le dépôt.",
      "error"
    );


    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        originalHtml;
    }

  }

}


/* =========================================================
   OUVRIR MODAL REJET
========================
======= */

function openRejectModal(
  depositId
) {

  currentRejectDepositId =
    depositId;


  if (rejectReason) {

    rejectReason.value =
      "";
  }


  if (rejectModal) {

    rejectModal.classList.add(
      "show"
    );
  }


  setTimeout(
    () => {

      if (rejectReason) {

        rejectReason.focus();
      }

    },
    100
  );

}


/* =========================================================
   FERMER MODAL REJET
========================================================= */

function closeRejectModal() {

  currentRejectDepositId =
    null;


  if (rejectReason) {

    rejectReason.value =
      "";
  }


  if (rejectModal) {

    rejectModal.classList.remove(
      "show"
    );
  }

}


/* =========================================================
   REJETER
========================================================= */

async function rejectDeposit() {

  const token =
    getSessionToken();


  if (!token) {

    window.location.href =
      "admin-login.html";

    return;
  }


  if (
    !currentRejectDepositId
  ) {

    showMessage(
      "Identifiant du dépôt manquant.",
      "error"
    );

    return;
  }


  const reason =
    rejectReason
      ? rejectReason.value.trim()
      : "";


  if (!reason) {

    showMessage(
      "Veuillez indiquer le motif du rejet.",
      "error"
    );

    if (rejectReason) {

      rejectReason.focus();
    }

    return;
  }


  const depositId =
    currentRejectDepositId;


  const originalHtml =
    confirmReject
      ? confirmReject.innerHTML
      : "";


  try {

    if (confirmReject) {

      confirmReject.disabled =
        true;

      confirmReject.innerHTML = `
        <i
          class="fa-solid fa-circle-notch fa-spin"
        ></i>
        Rejet...
      `;
    }


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_reject_deposit",
        {
          p_token:
            token,

          p_deposit_id:
            depositId,

          p_reason:
            reason
        }
      );


    if (error) {

      console.error(
        "Erreur admin_reject_deposit:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de rejeter le dépôt."
      );
    }


    if (
      data &&
      typeof data ===
        "object" &&
      data.success ===
        false
    ) {

      throw new Error(
        data.message ||
        data.error ||
        "Le rejet a échoué."
      );
    }


    const index =
      deposits.findIndex(
        deposit =>
          String(
            deposit.id
          ) ===
          String(
            depositId
          )
      );


    if (
      index !== -1
    ) {

      deposits[index] = {

        ...deposits[index],

        status:
          "rejected"

      };

    }


    closeRejectModal();

    renderDeposits();


    showMessage(
      "Dépôt rejeté avec succès.",
      "success"
    );


  } catch (error) {

    console.error(
      "Erreur rejet:",
      error
    );

    showMessage(
      error.message ||
      "Impossible de rejeter le dépôt.",
      "error"
    );


  } finally {

    if (confirmReject) {

      confirmReject.disabled =
        false;

      confirmReject.innerHTML =
        originalHtml;
    }

  }

}


/* =========================================================
   VOIR LA PREUVE
========================================================= */

async function viewProof(
  depositId
) {

  const token =
    getSessionToken();


  if (!token) {

    window.location.href =
      "admin-login.html";

    return;
  }


  if (!depositId) {

    showMessage(
      "Identifiant du dépôt manquant.",
      "error"
    );

    return;
  }


  const button =
    document.querySelector(
      `[data-action="proof"][data-id="${CSS.escape(
        depositId
      )}"]`
    );


  const originalHtml =
    button
      ? button.innerHTML
      : "";


  try {

    if (button) {

      button.disabled =
        true;

      button.innerHTML = `
        <i
          class="fa-solid fa-circle-notch fa-spin"
        ></i>
        Ouverture...
      `;
    }


    const response =
      await fetch(
        `${SUPABASE_URL}/functions/v1/admin-deposit-proof`,
        {
          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "apikey":
              SUPABASE_KEY,

            "Authorization":
              `Bearer ${SUPABASE_KEY}`

          },

          body:
            JSON.stringify(
              {
                p_token:
                  token,

                p_deposit_id:
                  depositId
              }
            )
        }
      );


    const responseText =
      await response.text();


    console.log(
      "admin-deposit-proof:",
      response.status,
      responseText
    );


    let data;


    try {

      data =
        JSON.parse(
          responseText
        );

    } catch {

      throw new Error(
        `Réponse invalide du serveur (${response.status}).`
      );
    }


    if (
      !response.ok
    ) {

      throw new Error(
        data?.error ||
        data?.detail ||
        `Erreur serveur (${response.status}).`
      );
    }


    if (
      !data ||
      data.ok !== true ||
      !data.url
    ) {

      throw new Error(
        data?.error ||
        "Le lien sécurisé de la preuve est introuvable."
      );
    }


    const proofWindow =
      window.open(
        data.url,
        "_blank"
      );


    if (!proofWindow) {

      showMessage(
        "Le navigateur bloque l'ouverture. Autorisez les fenêtres pop-up.",
        "error"
      );

      return;
    }


  } catch (error) {

    console.error(
      "Erreur ouverture preuve:",
      error
    );

    showMessage(
      error.message ||
      "Impossible d'afficher la preuve.",
      "error"
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        originalHtml;
    }

  }

}


/* =========================================================
   ACTIONS DU TABLEAU
========================================================= */

if (depositBody) {

  depositBody.addEventListener(
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


      const depositId =
        button.dataset.id;


      if (!depositId) {

        showMessage(
          "Identifiant du dépôt manquant.",
          "error"
        );

        return;
      }


      if (
        action ===
        "proof"
      ) {

        viewProof(
          depositId
        );

        return;
      }


      if (
        action ===
        "verify"
      ) {

        verifyDeposit(
          depositId
        );

        return;
      }


      if (
        action ===
        "approve"
      ) {

        approveDeposit(
          depositId
        );

        return;
      }


      if (
        action ===
        "reject"
      ) {

        openRejectModal(
          depositId
        );

        return;
      }

    }
  );

}


/* =========================================================
   RECHERCHE
========================================================= */

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      renderDeposits();

    }
  );

}


/* =========================================================
   FILTRE
========================================================= */

if (statusFilter) {

  statusFilter.addEventListener(
    "change",
    () => {

      loadDeposits();

    }
  );

}


/* =========================================================
   ACTUALISER
========================================================= */

if (refreshBtn) {

  refreshBtn.addEventListener(
    "click",
    () => {

      loadDeposits();

    }
  );

}


/* =========================================================
   MODAL — ANNULER
========================================================= */

if (cancelReject) {

  cancelReject.addEventListener(
    "click",
    () => {

      closeRejectModal();

    }
  );

}


if (cancelRejectBottom) {

  cancelRejectBottom.addEventListener(
    "click",
    () => {

      closeRejectModal();

    }
  );

}


/* =========================================================
   MODAL — CONFIRMER
========================================================= */

if (confirmReject) {

  confirmReject.addEventListener(
    "click",
    () => {

      rejectDeposit();

    }
  );

}


/* =========================================================
   CLIQUER À L'EXTÉRIEUR
========================================================= */

if (rejectModal) {

  rejectModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        rejectModal
      ) {

        closeRejectModal();

      }

    }
  );

}


/* =========================================================
   ESC
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape" &&
      rejectModal &&
      rejectModal.classList.contains(
        "show"
      )
    ) {

      closeRejectModal();

    }

  }
);


/* =========================================================
   RETOUR
========================================================= */

if (backBtn) {

  backBtn.addEventListener(
    "click",
    () => {

      window.location.href =
        "admin-dashboard.html";

    }
  );

}


/* =========================================================
   AUTO REFRESH
========================================================= */

if (autoRefreshTimer) {

  clearInterval(
    autoRefreshTimer
  );

}


autoRefreshTimer =
  setInterval(
    () => {

      if (
        !rejectModal ||
        !rejectModal.classList.contains(
          "show"
        )
      ) {

        loadDeposits();

      }

    },
    60000
  );


/* =========================================================
   DÉMARRAGE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadDeposits();

  }
);
