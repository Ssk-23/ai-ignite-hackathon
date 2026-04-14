const registrationsBodyEl = document.getElementById('registrationsBody');
const searchInputEl = document.getElementById('searchInput');
const refreshBtnEl = document.getElementById('refreshBtn');
const resultCountEl = document.getElementById('resultCount');
const totalTeamsEl = document.getElementById('totalTeams');
const totalParticipantsEl = document.getElementById('totalParticipants');
const lastUpdatedEl = document.getElementById('lastUpdated');
const errorBoxEl = document.getElementById('errorBox');

let allRegistrations = [];

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString();
}

async function parseApiResponse(response) {
  const responseText = await response.text();
  if (!responseText) {
    throw new Error(`Empty response from server (status ${response.status})`);
  }

  const parsed = JSON.parse(responseText);
  if (!response.ok) {
    throw new Error(parsed.error || `Request failed with status ${response.status}`);
  }

  return parsed;
}

function buildMembersCell(memberNames, fallbackName) {
  const normalizedMembers = Array.isArray(memberNames)
    ? memberNames.map((name) => String(name).trim()).filter(Boolean)
    : [];

  if (!normalizedMembers.length) {
    return `<span>${fallbackName || '-'}</span>`;
  }

  return `<ul class="member-list">${normalizedMembers.map((member) => `<li>${member}</li>`).join('')}</ul>`;
}

function renderTable(items) {
  if (!items.length) {
    registrationsBodyEl.innerHTML = '<tr><td colspan="9" class="empty-cell">No registrations found.</td></tr>';
    resultCountEl.textContent = '0 records';
    return;
  }

  registrationsBodyEl.innerHTML = items
    .map((entry, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${entry.teamName || '-'}</td>
          <td>${entry.teamSize || '-'}</td>
          <td>${buildMembersCell(entry.memberNames, entry.name)}</td>
          <td>${entry.name || '-'}</td>
          <td>${entry.email || '-'}</td>
          <td>${entry.phone || '-'}</td>
          <td>${entry.college || '-'}</td>
          <td>${formatDateTime(entry.createdAt)}</td>
        </tr>
      `;
    })
    .join('');

  resultCountEl.textContent = `${items.length} record${items.length === 1 ? '' : 's'}`;
}

function updateStats(items) {
  totalTeamsEl.textContent = String(items.length);

  const participants = items.reduce((sum, entry) => {
    const size = Number.parseInt(entry.teamSize, 10);
    return sum + (Number.isInteger(size) ? size : 0);
  }, 0);

  totalParticipantsEl.textContent = String(participants);
  lastUpdatedEl.textContent = new Date().toLocaleTimeString();
}

function applySearch() {
  const term = searchInputEl.value.trim().toLowerCase();
  if (!term) {
    renderTable(allRegistrations);
    updateStats(allRegistrations);
    return;
  }

  const filtered = allRegistrations.filter((entry) => {
    const memberNames = Array.isArray(entry.memberNames) ? entry.memberNames.join(' ') : '';
    const searchable = [
      entry.teamName,
      entry.name,
      entry.email,
      entry.phone,
      entry.college,
      memberNames,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(term);
  });

  renderTable(filtered);
  updateStats(filtered);
}

function showError(message) {
  errorBoxEl.hidden = false;
  errorBoxEl.textContent = message;
}

function clearError() {
  errorBoxEl.hidden = true;
  errorBoxEl.textContent = '';
}

async function loadRegistrations() {
  registrationsBodyEl.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading registrations...</td></tr>';
  clearError();

  try {
    const response = await fetch('/api/registrations');
    const registrations = await parseApiResponse(response);

    allRegistrations = Array.isArray(registrations) ? registrations : [];
    renderTable(allRegistrations);
    updateStats(allRegistrations);
  } catch (error) {
    console.error(error);
    registrationsBodyEl.innerHTML = '<tr><td colspan="9" class="empty-cell">Unable to load registrations.</td></tr>';
    showError(error.message || 'Failed to load registrations');
    updateStats([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadRegistrations();
  searchInputEl.addEventListener('input', applySearch);
  refreshBtnEl.addEventListener('click', loadRegistrations);
});
