// ============================================================
// ROLEX ADMIN — GESTION DES DÉPÔTS
// Kong
// ============================================================

const SUPABASE_URL =
  'https://cbxjcwjlhvicurpndoyz.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o';

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

// ============================================================
// SESSION ADMIN
// ============================================================

const ADMIN_SESSION_KEY =
  'rolex_admin_session_token';

function getAdminToken() {
  return localStorage.getItem(
    ADMIN_SESSION_KEY
  );
}

function requireAdminToken() {
  const token = getAdminToken();

  if (!token) {
    window.location.href =
      'login-admin.html';

    return null;
  }

  return token;
}

// ============================================================
// VARIABLES
// ============================================================

let deposits = [];

let currentStatus = 'all';
let currentSearch = '';

let isLoading = false;

let rejectDepositId = null;

// ============================================================
// ÉLÉMENTS HTML
// ============================================================

const statusFilter =
  document.getElementById(
    'statusFilter'
  );

const searchInput =
  document.getElementById(
    'searchInput'
  );

const refreshBtn =
  document.getElementById(
    'refreshBtn'
  );

const depositsBody =
  document.getElementById(
    'depositsBody'
  );

const loadingState =
  document.getElementById(
    'loadingState'
  );

const emptyState =
  document.getElementById(
    'emptyState'
  );

const rejectModal =
  document.getElementById(
    'rejectModal'
  );

const rejectReason =
  document.getElementById(
    'rejectReason'
  );

const cancelRejectBtn =
  document.getElementById(
    'cancelRejectBtn'
  );

const confirmRejectBtn =
  document.getElementById(
    'confirmRejectBtn'
  );

// ============================================================
// UTILITAIRES
// ============================================================

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAmount(amount) {
  const number =
    Number(amount || 0);

  return (
    new Intl.NumberFormat(
      'fr-FR'
    ).format(number) +
    ' XOF'
  );
}

function formatDate(date) {
  if (!date) {
    return '-';
  }

  const d = new Date(date);

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return '-';
  }

  return d.toLocaleString(
    'fr-FR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  );
}

// ============================================================
// STATUT
// ============================================================

function getStatusLabel(status) {
  const value =
    String(status || '')
      .toLowerCase();

  switch (value) {

    case 'pending':
      return 'En attente';

    case 'verified':
      return 'Vérifié';

    case 'approved':
      return 'Approuvé';

    case 'rejected':
      return 'Rejeté';

    default:
      return status || '-';
  }
}

function getStatusClass(status) {
  const value =
    String(status || '')
      .toLowerCase();

  switch (value) {

    case 'pending':
      return 'pending';

    case 'verified':
      return 'verified';

    case 'approved':
      return 'approved';

    case 'rejected':
      return 'rejected';

    default:
      return '';
  }
}

// ============================================================
// CHARGEMENT DES DÉPÔTS
// ============================================================

async function loadDeposits() {

  const token =
    requireAdminToken();

  if (!token) {
    return;
  }

  if (isLoading) {
    return;
  }

  isLoading = true;

  setLoading(true);

  try {

    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        'get_admin_deposits',
        {
          p_token: token,

          p_status:
            currentStatus === 'all'
              ? null
              : currentStatus
        }
      );

    if (error) {
      console.error(
        'Erreur get_admin_deposits:',
        error
      );

      throw error;
    }

    deposits =
      Array.isArray(data)
        ? data
        : [];

    renderDeposits();

  } catch (error) {

    console.error(
      'Erreur chargement dépôts:',
      error
    );

    showError(
      'Impossible de charger les dépôts. Veuillez réessayer.'
    );

  } finally {

    setLoading(false);

    isLoading = false;
  }
}

// ============================================================
// AFFICHAGE
// ============================================================

function renderDeposits() {

  if (!depositsBody) {
    return;
  }

  let filtered =
    [...deposits];

  // ----------------------------------------------------------
  // RECHERCHE
  // ----------------------------------------------------------

  if (currentSearch) {

    const search =
      currentSearch.toLowerCase();

    filtered =
      filtered.filter(
        deposit => {

          const values = [
            deposit.user_code,
            deposit.full_name,
            deposit.phone,
            deposit.payer_phone,
            deposit.country_code,
            deposit.amount,
            deposit.status,
            deposit.provider,
            deposit.provider_reference
          ];

          return values.some(
            value =>
              String(value || '')
                .toLowerCase()
                .includes(search)
          );
        }
      );
  }

  // ----------------------------------------------------------
  // AUCUN RÉSULTAT
  // ----------------------------------------------------------

  if (
    filtered.length === 0
  ) {

    depositsBody.innerHTML =
      '';

    if (loadingState) {
      loadingState.style.display =
        'none';
    }

    if (emptyState) {
      emptyState.style.display =
        'block';
    }

    return;
  }

  if (loadingState) {
    loadingState.style.display =
      'none';
  }

  if (emptyState) {
    emptyState.style.display =
      'none';
  }

  // ----------------------------------------------------------
  // TABLEAU
  // ----------------------------------------------------------

  depositsBody.innerHTML =
    filtered.map(
      deposit => {

        const status =
          String(
            deposit.status || ''
          ).toLowerCase();

        const statusClass =
          getStatusClass(
            status
          );

        const statusLabel =
          getStatusLabel(
            status
          );

        const userName =
          deposit.full_name ||
          deposit.user_code ||
          '-';

        const country =
          deposit.country_code ||
          '-';

        const payerPhone =
          deposit.payer_phone ||
          deposit.phone ||
          '-';

        const amount =
          formatAmount(
            deposit.amount
          );

        const date =
          formatDate(
            deposit.created_at
          );

        return `
          <tr>

            <td>
              <div class="user-cell">

                <strong>
                  ${escapeHtml(
                    userName
                  )}
                </strong>

                ${
                  deposit.user_code
                    ? `
                      <small>
                        ${escapeHtml(
                          deposit.user_code
                        )}
                      </small>
                    `
                    : ''
                }

              </div>
            </td>

            <td>
              ${escapeHtml(
                country
              )}
            </td>

            <td>
              ${escapeHtml(
                payerPhone
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  amount
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                date
              )}
            </td>

            <td>
              <span
                class="status ${escapeHtml(
                  statusClass
                )}"
              >
                ${escapeHtml(
                  statusLabel
                )}
              </span>
            </td>

            <td>
              ${renderActions(
                deposit
              )}
            </td>

          </tr>
        `;
      }
    ).join('');
}

// ============================================================
// ACTIONS
// ============================================================

function renderActions(deposit) {

  const status =
    String(
      deposit.status || ''
    ).toLowerCase();

  const depositId =
    deposit.id;

  if (!depositId) {
    return '-';
  }

  // ----------------------------------------------------------
  // REJETÉ
  // ----------------------------------------------------------

  if (
    status === 'rejected'
  ) {

    return `
      <span class="action-disabled">
        Aucun action
      </span>
    `;
  }

  // ----------------------------------------------------------
  // APPROUVÉ
  // ----------------------------------------------------------

  if (
    status === 'approved'
  ) {

    return `
      <span class="action-success">
        Approuvé
      </span>
    `;
  }

  // ----------------------------------------------------------
  // EN ATTENTE / VÉRIFIÉ
  // ----------------------------------------------------------

  return `
    <div class="actions">

      ${
        status === 'pending'
          ? `
            <button
              class="btn btn-verify"
              onclick="verifyDeposit(
                '${escapeHtml(
                  depositId
                )}'
              )"
            >
              Vérifier
            </button>
          `
          : ''
      }

      <button
        class="btn btn-approve"
        onclick="approveDeposit(
          '${escapeHtml(
            depositId
          )}'
        )"
      >
        Approuver
      </button>

      <button
        class="btn btn-reject"
        onclick="openRejectModal(
          '${escapeHtml(
            depositId
          )}'
        )"
      >
        Rejeter
      </button>

    </div>
  `;
}

// ============================================================
// VÉRIFIER
// ============================================================

async function verifyDeposit(
  depositId
) {

  const token =
    requireAdminToken();

  if (!token) {
    return;
  }

  if (
    !confirm(
      'Voulez-vous vérifier ce dépôt ?'
    )
  ) {
    return;
  }

  try {

    setBusy(true);

    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        'admin_verify_deposit',
        {
          p_token: token,
          p_deposit_id: depositId
        }
      );

    if (error) {
      throw error;
    }

    if (
      data &&
      data.ok === false
    ) {

      throw new Error(
        data.message ||
        'Impossible de vérifier le dépôt.'
      );
    }

    alert(
      'Dépôt vérifié avec succès.'
    );

    await loadDeposits();

  } catch (error) {

    console.error(
      'Erreur vérification dépôt:',
      error
    );

    alert(
      error.message ||
      'Impossible de vérifier le dépôt.'
    );

  } finally {

    setBusy(false);
  }
}

// ============================================================
// APPROUVER
// ============================================================

async function approveDeposit(
  depositId
) {

  const token =
    requireAdminToken();

  if (!token) {
    return;
  }

  if (
    !confirm(
      'Voulez-vous approuver ce dépôt et créditer le compte utilisateur ?'
    )
  ) {
    return;
  }

  try {

    setBusy(true);

    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        'admin_approve_deposit',
        {
          p_token: token,
          p_deposit_id: depositId
        }
      );

    if (error) {
      throw error;
    }

    if (
      data &&
      data.ok === false
    ) {

      throw new Error(
        data.message ||
        'Impossible d’approuver le dépôt.'
      );
    }

    alert(
      'Dépôt approuvé et compte crédité.'
    );

    await loadDeposits();

  } catch (error) {

    console.error(
      'Erreur approbation dépôt:',
      error
    );

    alert(
      error.message ||
      'Impossible d’approuver le dépôt.'
    );

  } finally {

    setBusy(false);
  }
}

// ============================================================
// MODAL REJET
// ============================================================

function openRejectModal(
  depositId
) {

  rejectDepositId =
    depositId;

  if (rejectReason) {
    rejectReason.value =
      '';
  }

  if (rejectModal) {
    rejectModal.style.display =
      'flex';
  }
}

function closeRejectModal() {

  rejectDepositId =
    null;

  if (rejectModal) {
    rejectModal.style.display =
      'none';
  }

  if (rejectReason) {
    rejectReason.value =
      '';
  }
}

// ============================================================
// CONFIRMER REJET
// ============================================================

async function confirmRejectDeposit() {

  const token =
    requireAdminToken();

  if (!token) {
    return;
  }

  if (!rejectDepositId) {
    return;
  }

  const reason =
    rejectReason?.value?.trim() ||
    'Dépôt rejeté par l’administrateur';

  try {

    setBusy(true);

    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        'admin_reject_deposit',
        {
          p_token: token,

          p_deposit_id:
            rejectDepositId,

          p_reason:
            reason
        }
      );

    if (error) {
      throw error;
    }

    if (
      data &&
      data.ok === false
    ) {

      throw new Error(
        data.message ||
        'Impossible de rejeter le dépôt.'
      );
    }

    closeRejectModal();

    alert(
      'Dépôt rejeté avec succès.'
    );

    await loadDeposits();

  } catch (error) {

    console.error(
      'Erreur rejet dépôt:',
      error
    );

    alert(
      error.message ||
      'Impossible de rejeter le dépôt.'
    );

  } finally {

    setBusy(false);
  }
}

// ============================================================
// RECHERCHE
// ============================================================

if (searchInput) {

  searchInput.addEventListener(
    'input',
    event => {

      currentSearch =
        event.target.value.trim();

      renderDeposits();
    }
  );
}

// ============================================================
// FILTRE STATUT
// ============================================================

if (statusFilter) {

  statusFilter.addEventListener(
    'change',
    event => {

      currentStatus =
        event.target.value ||
        'all';

      loadDeposits();
    }
  );
}

// ============================================================
// ACTUALISER
// ============================================================

if (refreshBtn) {

  refreshBtn.addEventListener(
    'click',
    () => {
      loadDeposits();
    }
  );
}

// ============================================================
// MODAL
// ============================================================

if (cancelRejectBtn) {

  cancelRejectBtn.addEventListener(
    'click',
    closeRejectModal
  );
}

if (confirmRejectBtn) {

  confirmRejectBtn.addEventListener(
    'click',
    confirmRejectDeposit
  );
}

if (rejectModal) {

  rejectModal.addEventListener(
    'click',
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

// ============================================================
// CHARGEMENT
// ============================================================

function setLoading(
  loading
) {

  if (loadingState) {

    loadingState.style.display =
      loading
        ? 'block'
        : 'none';
  }

  if (
    loading &&
    emptyState
  ) {

    emptyState.style.display =
      'none';
  }
}

// ============================================================
// BOUTONS
// ============================================================

function setBusy(
  busy
) {

  document
    .querySelectorAll(
      'button'
    )
    .forEach(button => {

      button.disabled =
        busy;
    });
}

// ============================================================
// ERREUR
// ============================================================

function showError(
  message
) {

  if (!depositsBody) {

    alert(message);

    return;
  }

  depositsBody.innerHTML = `
    <tr>
      <td
        colspan="7"
        style="
          text-align:center;
          padding:30px;
          color:#ef4444;
        "
      >
        ${escapeHtml(
          message
        )}
      </td>
    </tr>
  `;

  if (emptyState) {

    emptyState.style.display =
      'none';
  }
}

// ============================================================
// EXPOSER LES FONCTIONS
// ============================================================

window.verifyDeposit =
  verifyDeposit;

window.approveDeposit =
  approveDeposit;

window.openRejectModal =
  openRejectModal;

window.closeRejectModal =
  closeRejectModal;

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const token =
      getAdminToken();

    if (!token) {

      window.location.href =
        'login-admin.html';

      return;
    }

    loadDeposits();

    // Actualisation toutes les 60 secondes
    setInterval(
      () => {
        loadDeposits();
      },
      60000
    );
  }
);
