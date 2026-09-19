/* =========================================================
   AFFICHAGE DES DÉPÔTS
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
      deposit.user_code || "";

    const country =
      deposit.country_code || "—";

    const payerPhone =
      deposit.payer_phone || "—";

    const amount =
      deposit.amount || 0;

    const status =
      deposit.status || "pending";

    const operator =
      deposit.payment_operator || "";

    const createdAt =
      deposit.created_at;

    /*
     * IMPORTANT
     * La preuve dépend UNIQUEMENT de
     * payment_proof_path.
     *
     * Elle ne dépend JAMAIS du statut.
     */

    const hasProof =
      Boolean(
        deposit.payment_proof_path &&
        String(
          deposit.payment_proof_path
        ).trim()
      );


    /* =====================================================
       PREUVE
    ===================================================== */

    let proofHtml = "";

    if (hasProof) {

      proofHtml = `
        <button
          type="button"
          class="action-btn proof"
          data-action="proof"
          data-id="${escapeHtml(deposit.id)}"
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


    /* =====================================================
       ACTIONS
    ===================================================== */

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

    }

    else if (status === "verified") {

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

    }

    else if (status === "approved") {

      actionsHtml = `
        <span class="status approved">
          <i class="fa-solid fa-check"></i>
          Validé
        </span>
      `;

    }

    else if (status === "rejected") {

      actionsHtml = `
        <span class="status rejected">
          <i class="fa-solid fa-ban"></i>
          Rejeté
        </span>
      `;
    }


    /* =====================================================
       LIGNE
    ===================================================== */

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

          ${escapeHtml(
            getStatusLabel(status)
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

    depositBody.appendChild(tr);
  });
}


/* =========================================================
   VÉRIFIER
========================================================= */

async function verifyDeposit(depositId) {

  const token = getSessionToken();

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


  const button = document.querySelector(
    `[data-action="verify"][data-id="${CSS.escape(depositId)}"]`
  );


  const originalHtml =
    button
      ? button.innerHTML
      : "";


  try {

    if (button) {

      button.disabled = true;

      button.innerHTML = `
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        Vérification...
      `;
    }


    /* =====================================================
       APPEL SQL
    ===================================================== */

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

      console.error(
        "Erreur vérification:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de vérifier le dépôt."
      );
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


    /* =====================================================
       RÉCUPÉRER LE DÉPÔT EN MÉMOIRE
    ===================================================== */

    const index =
      deposits.findIndex(
        deposit =>
          String(deposit.id) ===
          String(depositId)
      );


    if (index !== -1) {

      /*
       * On modifie UNIQUEMENT le statut.
       *
       * payment_proof_path reste exactement
       * comme avant.
       */

      deposits[index].status =
        "verified";
    }


    /* =====================================================
       RAFRAÎCHIR L'AFFICHAGE
    ===================================================== */

    renderDeposits();


    showMessage(
      "Dépôt vérifié. Vous pouvez maintenant le valider ou le rejeter.",
      "success"
    );


  } catch (error) {

    console.error(
      "Erreur vérification dépôt:",
      error
    );


    showMessage(
      error.message ||
      "Impossible de vérifier le dépôt.",
      "error"
    );


    if (button) {

      button.disabled = false;

      button.innerHTML =
        originalHtml;
    }
  }
}


/* =========================================================
   VALIDER
========================================================= */

async function approveDeposit(depositId) {

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


  const confirmed =
    window.confirm(
      "Confirmer la validation de ce dépôt ?"
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.querySelector(
      `[data-action="approve"][data-id="${CSS.escape(depositId)}"]`
    );


  const originalHtml =
    button
      ? button.innerHTML
      : "";


  try {

    if (button) {

      button.disabled = true;

      button.innerHTML = `
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        Validation...
      `;
    }


    /* =====================================================
       APPEL SQL RÉEL
    ===================================================== */

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

      console.error(
        "Erreur validation:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de valider le dépôt."
      );
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


    /* =====================================================
       METTRE À JOUR LOCALEMENT
    ===================================================== */

    const index =
      deposits.findIndex(
        deposit =>
          String(deposit.id) ===
          String(depositId)
      );


    if (index !== -1) {

      deposits[index].status =
        "approved";
    }


    /*
     * IMPORTANT :
     *
     * On ne supprime PAS :
     *
     * deposits[index].payment_proof_path
     *
     * La preuve reste donc disponible.
     */


    renderDeposits();


    showMessage(
      "Dépôt validé avec succès.",
      "success"
    );


  } catch (error) {

    console.error(
      "Erreur validation dépôt:",
      error
    );


    showMessage(
      error.message ||
      "Impossible de valider le dépôt.",
      "error"
    );


    if (button) {

      button.disabled = false;

      button.innerHTML =
        originalHtml;
    }
  }
}


/* =========================================================
   OUVRIR MODAL REJET
========================================================= */

function openRejectModal(depositId) {

  currentRejectDepositId =
    depositId;

  rejectReason.value = "";

  rejectModal.classList.add(
    "show"
  );


  setTimeout(() => {

    rejectReason.focus();

  }, 100);
}


/* =========================================================
   FERMER MODAL REJET
========================================================= */

function closeRejectModal() {

  currentRejectDepositId =
    null;

  rejectReason.value = "";

  rejectModal.classList.remove(
    "show"
  );
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


  if (!currentRejectDepositId) {

    showMessage(
      "Identifiant du dépôt manquant.",
      "error"
    );

    return;
  }


  const reason =
    rejectReason.value.trim();


  if (!reason) {

    showMessage(
      "Veuillez indiquer le motif du rejet.",
      "error"
    );

    rejectReason.focus();

    return;
  }


  const depositId =
    currentRejectDepositId;


  const originalHtml =
    confirmReject.innerHTML;


  try {

    confirmReject.disabled =
      true;


    confirmReject.innerHTML = `
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      Rejet...
    `;


    /* =====================================================
       APPEL SQL RÉEL
    ===================================================== */

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

      console.error(
        "Erreur rejet:",
        error
      );

      throw new Error(
        error.message ||
        "Impossible de rejeter le dépôt."
      );
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


    /* =====================================================
       METTRE À JOUR LOCALEMENT
    ===================================================== */

    const index =
      deposits.findIndex(
        deposit =>
          String(deposit.id) ===
          String(depositId)
      );


    if (index !== -1) {

      deposits[index].status =
        "rejected";

      /*
       * IMPORTANT :
       * payment_proof_path n'est PAS supprimé.
       */
    }


    closeRejectModal();


    renderDeposits();


    showMessage(
      "Dépôt rejeté avec succès.",
      "success"
    );


  } catch (error) {

    console.error(
      "Erreur rejet dépôt:",
      error
    );


    showMessage(
      error.message ||
      "Impossible de rejeter le dépôt.",
      "error"
    );


  } finally {

    confirmReject.disabled =
      false;

    confirmReject.innerHTML =
      originalHtml;
  }
}


/* =========================================================
   ACTIONS DU TABLEAU
========================================================= */

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


    /* -----------------------------------------------------
       PREUVE
    ----------------------------------------------------- */

    if (action === "proof") {

      viewProof(
        depositId
      );

      return;
    }


    /* -----------------------------------------------------
       VÉRIFIER
    ----------------------------------------------------- */

    if (action === "verify") {

      verifyDeposit(
        depositId
      );

      return;
    }


    /* -----------------------------------------------------
       VALIDER
    ----------------------------------------------------- */

    if (action === "approve") {

      approveDeposit(
        depositId
      );

      return;
    }


    /* -----------------------------------------------------
       REJETER
    ----------------------------------------------------- */

    if (action === "reject") {

      openRejectModal(
        depositId
      );

      return;
    }

  }
);


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
   FILTRE STATUT
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
  () => {

    closeRejectModal();

  }
);


cancelRejectBottom.addEventListener(
  "click",
  () => {

    closeRejectModal();

  }
);


confirmReject.addEventListener(
  "click",
  () => {

    rejectDeposit();

  }
);


/* =========================================================
   CLIQUER EN DEHORS DU MODAL
========================================================= */

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


/* =========================================================
   TOUCHE ESC
========================================================= */

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

      /*
       * On n'écrase pas l'écran pendant
       * qu'un rejet est en cours.
       */

      if (
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
   CHARGEMENT INITIAL
========================================================= */

loadDeposits();
