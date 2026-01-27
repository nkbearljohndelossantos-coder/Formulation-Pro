const toggleButton = document.getElementById('toggle-btn')
const sidebar = document.getElementById('sidebar')

function toggleSidebar() {
  sidebar.classList.toggle('close')
  toggleButton.classList.toggle('rotate')

  closeAllSubMenus()
}

function toggleSubMenu(button) {

  if (!button.nextElementSibling.classList.contains('show')) {
    closeAllSubMenus()
  }

  button.nextElementSibling.classList.toggle('show')
  button.classList.toggle('rotate')

  if (sidebar.classList.contains('close') && window.innerWidth > 800) {
    sidebar.classList.toggle('close')
    toggleButton.classList.toggle('rotate')
  }
}

function toggleMobileSidebar() {
  sidebar.classList.toggle('mobile-open');
  document.querySelector('.sidebar-overlay').classList.toggle('active');
}

// Auto-close overlay on resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 800) {
    if (sidebar) sidebar.classList.remove('mobile-open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
  }
});

// Highlight active mobile bottom nav link
function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.mobile-bottom-nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === 'javascript:void(0)') return;

    // Check for exact match or category matches
    if (href === currentPath ||
      (currentPath.includes('cosmetics') && !currentPath.includes('s-') && href === 'cosmetics.html') ||
      (currentPath.includes('s-') && href.includes('s-'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  initializeSidebarProfile();
  initializeNotifications();
});

/**
 * Notifications System Manager
 */
async function initializeNotifications() {
  // 1. Create and Inject Notification Bell UI
  const profileTrigger = document.getElementById('profile-trigger');
  if (!profileTrigger) return;

  const bellContainer = document.createElement('div');
  bellContainer.id = 'notification-bell-container';
  bellContainer.className = 'nav-action-item';
  bellContainer.innerHTML = `
    <div id="notification-bell" class="bell-icon-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
        <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/>
      </svg>
      <div id="notification-badge" class="notif-badge" style="display: none;">0</div>
    </div>
    <div id="notification-dropdown" class="notif-dropdown">
      <div class="notif-header">
        <h3>Notifications</h3>
        <button id="mark-all-read">Mark all as read</button>
      </div>
      <div id="notif-list" class="notif-list">
        <div class="notif-empty">No new notifications</div>
      </div>
    </div>
  `;

  // Insert before profile trigger
  profileTrigger.parentNode.insertBefore(bellContainer, profileTrigger);

  const bell = document.getElementById('notification-bell');
  const dropdown = document.getElementById('notification-dropdown');
  const markReadBtn = document.getElementById('mark-all-read');

  // 2. Event Listeners
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
    // Hide chat container if open (optional but good for UX)
    const chatContainer = document.getElementById('floating-chat-container');
    if (chatContainer) chatContainer.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (!bellContainer.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  markReadBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.dbOperations.markAllNotificationsAsRead();
    refreshNotifications();
  });

  // 3. Real-time Subscription
  const user = await window.supabaseClient.getCurrentUser();
  if (user) {
    window.supabaseClient.supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        refreshNotifications();
      })
      .subscribe();
  }

  // 4. Initial Load
  refreshNotifications();
}

async function refreshNotifications() {
  const notifs = await window.dbOperations.listNotifications(10);
  const listEl = document.getElementById('notif-list');
  const badgeEl = document.getElementById('notification-badge');

  const unreadCount = notifs.filter(n => !n.is_read).length;

  if (unreadCount > 0) {
    badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badgeEl.style.display = 'flex';
  } else {
    badgeEl.style.display = 'none';
  }

  if (notifs.length === 0) {
    listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }

  listEl.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.is_read ? 'read' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.link || '#'}')">
      <div class="notif-icon ${n.type}">
        ${n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'i'}
      </div>
      <div class="notif-content">
        <div class="notif-title">${n.title}</div>
        <div class="notif-message">${n.message}</div>
        <div class="notif-time">${window.supabaseClient.formatTimestamp(n.created_at)}</div>
      </div>
    </div>
  `).join('');
}

window.handleNotifClick = async (id, link) => {
  await window.dbOperations.markNotificationAsRead(id);
  if (link && link !== '#') {
    window.location.href = link;
  } else {
    refreshNotifications();
  }
};

async function initializeSidebarProfile() {
  // Wait for auth to be available with retry logic
  let retries = 0;
  const maxRetries = 10;

  while ((!window.auth || !window.auth.getCurrentUserWithProfile) && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (!window.auth || !window.auth.getCurrentUserWithProfile) {
    console.error('Auth module not available after retries');
    return;
  }

  try {
    const userWithProfile = await window.auth.getCurrentUserWithProfile();
    if (!userWithProfile) {
      console.warn('No user profile found');
      return;
    }

    const profile = userWithProfile.profile;

    // SAFETY CHECK: Force logout of dummy accounts if they still exist in session
    if (profile.email === 'earlj@formulation.pro' || profile.email === 'email@formulation.pro') {
      console.warn('Dummy account detected. Forcing logout.');
      await window.auth.signOut();
      return;
    }

    // 1. Standard Sidebar Profile (Admin Pages)
    const userNameEl = document.querySelector('.user-name');
    const userEmailEl = document.querySelector('.user-email');
    const userAvatarEl = document.querySelector('.user-avatar-container img');

    if (userNameEl) {
      userNameEl.textContent = profile.full_name || 'User';
      console.log('Updated sidebar username to:', profile.full_name);
    }
    if (userEmailEl) userEmailEl.textContent = profile.email;
    if (userAvatarEl) {
      if (profile.avatar_url) {
        userAvatarEl.src = profile.avatar_url;
      } else {
        const initials = (profile.full_name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        userAvatarEl.src = `https://ui-avatars.com/api/?name=${initials}\u0026background=5e63ff\u0026color=fff\u0026bold=true`;
      }
      userAvatarEl.onerror = () => { userAvatarEl.src = 'https://ui-avatars.com/api/?name=U\u0026background=5e63ff\u0026color=fff'; };
    }

    // 2. Dropdown Profile (Compounding Pages)
    const dropdownNameEl = document.getElementById('dropdown-full-name');
    const dropdownEmailEl = document.getElementById('dropdown-user-email');
    const dropdownAvatarEl = document.getElementById('dropdown-avatar-img');

    if (dropdownNameEl) dropdownNameEl.textContent = profile.full_name || 'User';
    if (dropdownEmailEl) dropdownEmailEl.textContent = profile.email;
    if (dropdownAvatarEl) {
      if (profile.avatar_url) {
        dropdownAvatarEl.src = profile.avatar_url;
      } else {
        const initials = (profile.full_name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        dropdownAvatarEl.src = `https://ui-avatars.com/api/?name=${initials}\u0026background=5e63ff\u0026color=fff\u0026bold=true`;
      }
      dropdownAvatarEl.onerror = () => { dropdownAvatarEl.src = 'https://ui-avatars.com/api/?name=U\u0026background=5e63ff\u0026color=fff'; };
    }

    // Global Sidebar Logout Logic
    const sidebarLinks = document.querySelectorAll('.sub-menu a, .dropdown-link');
    sidebarLinks.forEach(link => {
      if (link.textContent.trim() === 'Logout') {
        link.href = 'javascript:void(0)';
        // Clone and Replace to prevent double listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', async (e) => {
          e.preventDefault();
          if (confirm('Do you want to log out?')) {
            await window.auth.signOut();
          }
        });
      }
    });
  } catch (err) {
    console.error('Error initializing global profile:', err);
  }
}

function closeAllSubMenus() {
  if (!sidebar) return;
  Array.from(sidebar.getElementsByClassName('show')).forEach(ul => {
    ul.classList.remove('show')
    ul.previousElementSibling.classList.remove('rotate')
  })
}

// Custom Button, Card & Table Hover Effect
const interactiveElements = document.querySelectorAll('.button, .stat-card, .table-container');
interactiveElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    document.body.classList.add('hover');
  });

  el.addEventListener('mouseleave', () => {
    document.body.classList.remove('hover');
  });
});

// --- Full Page Background Animation Logic ---
let bgCanvas, bgCtx;
let bgAtoms = [];
const mouse = { x: null, y: null, radius: 150 };

function initBackgroundAnimation() {
  let existingCanvas = document.getElementById('chem-canvas');
  if (existingCanvas && existingCanvas.tagName !== 'CANVAS') {
    existingCanvas.remove();
    existingCanvas = null;
  }

  if (!existingCanvas) {
    bgCanvas = document.createElement('canvas');
    bgCanvas.id = 'chem-canvas';
    // Insert as first child of body to be behind everything
    document.body.insertBefore(bgCanvas, document.body.firstChild);
  } else {
    bgCanvas = existingCanvas;
  }

  bgCtx = bgCanvas.getContext('2d');
  initBgCanvas();
  initBgAtoms();
  animateBg();

  // Mouse tracking
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
  });

  window.addEventListener('resize', () => {
    initBgCanvas();
    initBgAtoms();
  });
}

function initBgCanvas() {
  if (!bgCanvas) return;
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

class Atom {
  constructor() {
    this.x = Math.random() * bgCanvas.width;
    this.y = Math.random() * bgCanvas.height;
    this.size = Math.random() * 2 + 1; // Standard size
    this.speedX = (Math.random() - 0.5) * 0.5; // Slow floating
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.color = 'rgba(212, 175, 55, 0.5)'; // Gold
  }

  draw() {
    bgCtx.beginPath();
    bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    bgCtx.fillStyle = this.color;
    bgCtx.fill();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x > bgCanvas.width || this.x < 0) this.speedX *= -1;
    if (this.y > bgCanvas.height || this.y < 0) this.speedY *= -1;

    // Mouse interaction
    if (mouse.x != null) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouse.radius - distance) / mouse.radius;
        const directionX = forceDirectionX * force * 5;
        const directionY = forceDirectionY * force * 5;

        this.x -= directionX;
        this.y -= directionY;
      }
    }
  }
}

function initBgAtoms() {
  if (!bgCanvas) return;
  bgAtoms = [];
  const numberOfAtoms = (bgCanvas.width * bgCanvas.height) / 10000; // Density
  for (let i = 0; i < numberOfAtoms; i++) {
    bgAtoms.push(new Atom());
  }
}

function connectAtoms() {
  let opacityValue = 1;
  for (let a = 0; a < bgAtoms.length; a++) {
    for (let b = a; b < bgAtoms.length; b++) {
      let dx = bgAtoms[a].x - bgAtoms[b].x;
      let dy = bgAtoms[a].y - bgAtoms[b].y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 120) {
        opacityValue = 1 - (distance / 120);
        bgCtx.strokeStyle = 'rgba(212, 175, 55,' + opacityValue * 0.2 + ')';
        bgCtx.lineWidth = 1;
        bgCtx.beginPath();
        bgCtx.moveTo(bgAtoms[a].x, bgAtoms[a].y);
        bgCtx.lineTo(bgAtoms[b].x, bgAtoms[b].y);
        bgCtx.stroke();
      }
    }
  }
}

function animateBg() {
  if (!bgCanvas) return;
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  for (let i = 0; i < bgAtoms.length; i++) {
    bgAtoms[i].update();
    bgAtoms[i].draw();
  }
  connectAtoms();
  requestAnimationFrame(animateBg);
}

// Formulation Table Logic
function addRow() {
  const tbody = document.getElementById('formula-body');
  const row = document.createElement('tr');
  row.setAttribute('data-decimal-places', '2');
  row.setAttribute('data-rounding-mode', 'round');
  row.innerHTML = `
        <td><input type="text" placeholder="Ingredient Name"></td>
        <td><input type="number" step="0.01" class="percent-input" oninput="calculateWeights()"></td>
        <td><span class="weight-label">0.00</span></td>
        <td>
            <div class="row-action-menu">
                <button class="ellipsis-btn" onclick="toggleRowMenu(this)">⋮</button>
                <div class="row-action-dropdown">
                    <div class="menu-item delete" onclick="deleteRow(this)">Delete Row</div>
                    <div class="menu-divider"></div>
                    <div class="submenu-header">Decimal Places</div>
                    <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 0)">0 decimals</div>
                    <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 1)">1 decimal</div>
                    <div class="menu-item decimal-option active" onclick="setDecimalPlaces(this, 2)">2 decimals</div>
                    <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 3)">3 decimals</div>
                    <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 4)">4 decimals</div>
                    <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 5)">5 decimals</div>
                    <div class="menu-divider"></div>
                    <div class="submenu-header">Rounding Mode</div>
                    <div class="menu-item rounding-option active" onclick="setRoundingMode(this, 'round')">Round</div>
                    <div class="menu-item rounding-option" onclick="setRoundingMode(this, 'truncate')">Truncate</div>
                </div>
            </div>
        </td>
    `;
  tbody.appendChild(row);
}

function addPart(defaultValue = '') {
  const tbody = document.getElementById('formula-body');
  const row = document.createElement('tr');
  row.className = 'part-row';
  row.innerHTML = `
        <td colspan="3"><input type="text" placeholder="PART NAME/PHASE..." value="${defaultValue}" style="width: 100%; border: none; font-weight: bold;"></td>
        <td><button class="remove-row-btn" onclick="this.closest('tr').remove()">✕</button></td>
    `;
  tbody.appendChild(row);
}

function addLabel() {
  const tbody = document.getElementById('formula-body');
  const row = document.createElement('tr');
  row.className = 'label-row';
  row.innerHTML = `
        <td colspan="3"><input type="text" placeholder="Add custom label or instruction..." style="width: 100%; border: none; font-style: italic;"></td>
        <td><button class="remove-row-btn" onclick="this.closest('tr').remove()">✕</button></td>
    `;
  tbody.appendChild(row);
}

function clearFormula() {
  if (confirm('Are you sure you want to clear the entire formula?')) {
    document.getElementById('formula-body').innerHTML = '';
    const existingBody = document.getElementById('existing-body');
    if (existingBody) existingBody.innerHTML = '';
    calculateWeights();
  }
}

// Existing Weight Table Logic
function addExistingRow() {
  const tbody = document.getElementById('existing-body');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
        <td><input type="text" placeholder="Existing Ingredient Name"></td>
        <td><input type="number" step="0.01" class="existing-weight-input" placeholder="0.00" oninput="calculateWeights()"></td>
        <td><button class="table-btn" onclick="deleteExistingRow(this)"><span class="mask"></span><span>✕</span></button></td>
    `;
  tbody.appendChild(row);
}

function deleteExistingRow(btn) {
  btn.closest('tr').remove();
  calculateWeights();
}

// Row Action Menu Functions
function toggleRowMenu(button) {
  const menu = button.closest('.row-action-menu');
  const allMenus = document.querySelectorAll('.row-action-menu');

  // Close all other menus
  allMenus.forEach(m => {
    if (m !== menu) m.classList.remove('active');
  });

  // Toggle current menu
  menu.classList.toggle('active');

  // Close menu when clicking outside
  if (menu.classList.contains('active')) {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.classList.remove('active');
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 10);
  }
}

function deleteRow(element) {
  const row = element.closest('tr');
  row.remove();
  calculateWeights();
}

function setDecimalPlaces(element, places) {
  const row = element.closest('tr');
  const menu = element.closest('.row-action-menu');

  // Update active state
  menu.querySelectorAll('.decimal-option').forEach(opt => opt.classList.remove('active'));
  element.classList.add('active');

  // Store decimal places in row data
  row.setAttribute('data-decimal-places', places);

  // Recalculate to apply new decimal places
  calculateWeights();

  // Close menu
  menu.classList.remove('active');
}

function setRoundingMode(element, mode) {
  const row = element.closest('tr');
  const menu = element.closest('.row-action-menu');

  // Update active state
  menu.querySelectorAll('.rounding-option').forEach(opt => opt.classList.remove('active'));
  element.classList.add('active');

  // Store rounding mode in row data
  row.setAttribute('data-rounding-mode', mode);

  // Recalculate to apply new rounding mode
  calculateWeights();

  // Close menu
  menu.classList.remove('active');
}

function calculateWeights() {
  const totalWeight = parseFloat(document.getElementById('total-weight').value) || 0;
  rowSelector = '#formula-body tr:not(.part-row):not(.label-row)';
  const rows = document.querySelectorAll(rowSelector);

  let totalPercent = 0;
  let totalWeightSum = 0;

  rows.forEach(row => {
    const percentInput = row.querySelector('.percent-input');
    const weightLabel = row.querySelector('.weight-label');
    const percent = parseFloat(percentInput.value) || 0;

    const calculatedWeight = totalWeight * (percent / 100);

    // Get decimal places and rounding mode from row data attributes
    let decimalPlaces = parseInt(row.getAttribute('data-decimal-places'));
    if (isNaN(decimalPlaces)) decimalPlaces = 2; // Default to 2 only if missing/invalid
    const roundingMode = row.getAttribute('data-rounding-mode') || 'round';

    let finalWeight;
    if (roundingMode === 'truncate') {
      // Truncate (floor) to specified decimal places
      const multiplier = Math.pow(10, decimalPlaces);
      finalWeight = Math.floor(calculatedWeight * multiplier) / multiplier;
    } else {
      // Round to specified decimal places
      // Use toFixed to round correctly, then parse back to number for summation
      finalWeight = parseFloat(calculatedWeight.toFixed(decimalPlaces));
    }

    // Format with specified decimal places
    const formatted = finalWeight.toFixed(decimalPlaces);
    weightLabel.textContent = formatted;

    // Add to totals
    totalPercent += percent;
    totalWeightSum += finalWeight;
  });

  // Add Existing Weights if toggle is ON
  const existingToggle = document.getElementById('existing-toggle');
  if (existingToggle && existingToggle.checked) {
    const existingInputs = document.querySelectorAll('.existing-weight-input');
    existingInputs.forEach(input => {
      totalWeightSum += (parseFloat(input.value) || 0);
    });
  }

  // Update totals in footer
  const totalPercentEl = document.getElementById('total-percent');
  const totalWeightSumEl = document.getElementById('total-weight-sum');

  if (totalPercentEl) {
    totalPercentEl.textContent = totalPercent.toFixed(2) + '%';
  }
  if (totalWeightSumEl) {
    totalWeightSumEl.textContent = totalWeightSum.toFixed(2);
  }
}

window.addEventListener('load', () => {
  const loader = document.getElementById('loader-wrapper');
  if (loader) {
    loader.classList.add('loaded');
  }

  // Init Full Page Background Animation
  initBackgroundAnimation();

  // Initialize Search and Filter Logic
  initTableFilters();

  // Initialize formulation table with Part and Ingredient row
  if (document.getElementById('formula-body')) {
    addPart('PHASE A');
    addRow();

    // Enable Excel Paste
    const formulaBody = document.getElementById('formula-body');
    formulaBody.addEventListener('paste', handleExcelPaste);

    // Initialize toggle switch
    const existingToggle = document.getElementById('existing-toggle');
    const toggleStatus = document.getElementById('toggle-status');

    if (existingToggle && toggleStatus) {
      const existingContainer = document.getElementById('existing-table-container');
      existingToggle.addEventListener('change', function () {
        if (this.checked) {
          toggleStatus.textContent = 'ON';
          toggleStatus.classList.add('on');
          if (existingContainer) existingContainer.classList.add('active');
          // Add first row if empty
          const existingBody = document.getElementById('existing-body');
          if (existingBody && existingBody.children.length === 0) {
            addExistingRow();
          }
        } else {
          toggleStatus.textContent = 'OFF';
          toggleStatus.classList.remove('on');
          if (existingContainer) existingContainer.classList.remove('active');
        }
        calculateWeights();
      });
    }
  }
});

function handleExcelPaste(e) {
  e.preventDefault();
  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedData = clipboardData.getData('Text');
  let rows = pastedData.split(/\r\n|\n|\r/);

  // Trim trailing empty rows to avoid extra phases at the end
  while (rows.length > 0 && rows[rows.length - 1].trim() === '') {
    rows.pop();
  }

  const tbody = document.getElementById('formula-body');

  // Helper to get next phase letter
  const getNextPhaseLetter = () => {
    const existingParts = Array.from(document.querySelectorAll('.part-row input'));
    let lastLetter = '@'; // Before 'A'
    existingParts.forEach(input => {
      const match = input.value.match(/PHASE\s+([A-Z])/i);
      if (match) {
        const letter = match[1].toUpperCase();
        if (letter > lastLetter) lastLetter = letter;
      }
    });
    return String.fromCharCode(lastLetter.charCodeAt(0) + 1);
  };

  rows.forEach(rowText => {
    if (rowText.trim() === '') {
      // Empty row in Excel = Next Phase Row
      const newPhaseName = `PHASE ${getNextPhaseLetter()}`;
      const emptyPartRow = findEmptyRow('.part-row');
      if (emptyPartRow) {
        emptyPartRow.querySelector('input').value = newPhaseName;
      } else {
        addPart(newPhaseName);
      }
    } else {
      const columns = rowText.split('\t');
      const firstCol = columns[0] ? columns[0].trim() : '';
      const secondCol = columns[1] ? columns[1].trim() : '';

      const isPercent = secondCol !== '' && !isNaN(parseFloat(secondCol.replace('%', '')));

      if (columns.length >= 2 && isPercent) {
        const percent = secondCol.replace('%', '');
        const emptyIngRow = findEmptyRow('tr:not(.part-row):not(.label-row)');
        if (emptyIngRow) {
          emptyIngRow.querySelector('input[placeholder="Ingredient Name"]').value = firstCol;
          emptyIngRow.querySelector('.percent-input').value = percent;
        } else {
          const row = document.createElement('tr');
          row.setAttribute('data-decimal-places', '2');
          row.setAttribute('data-rounding-mode', 'round');
          row.innerHTML = `
              <td><input type="text" placeholder="Ingredient Name" value="${firstCol}"></td>
              <td><input type="number" step="0.01" class="percent-input" value="${percent}" oninput="calculateWeights()"></td>
              <td><span class="weight-label">0.00</span></td>
              <td>
                  <div class="row-action-menu">
                      <button class="ellipsis-btn" onclick="toggleRowMenu(this)">⋮</button>
                      <div class="row-action-dropdown">
                          <div class="menu-item delete" onclick="deleteRow(this)">Delete Row</div>
                          <div class="menu-divider"></div>
                          <div class="submenu-header">Decimal Places</div>
                          <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 0)">0 decimals</div>
                          <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 1)">1 decimal</div>
                          <div class="menu-item decimal-option active" onclick="setDecimalPlaces(this, 2)">2 decimals</div>
                          <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 3)">3 decimals</div>
                          <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 4)">4 decimals</div>
                          <div class="menu-item decimal-option" onclick="setDecimalPlaces(this, 5)">5 decimals</div>
                          <div class="menu-divider"></div>
                          <div class="submenu-header">Rounding Mode</div>
                          <div class="menu-item rounding-option active" onclick="setRoundingMode(this, 'round')">Round</div>
                          <div class="menu-item rounding-option" onclick="setRoundingMode(this, 'truncate')">Truncate</div>
                      </div>
                  </div>
              </td>
          `;
          tbody.appendChild(row);
        }
      } else {
        // One column OR two with no valid percent -> Part OR Label
        if (firstCol.toLowerCase().includes('phase') || (firstCol.length === 1 && /^[A-Z]$/i.test(firstCol))) {
          const emptyPartRow = findEmptyRow('.part-row');
          if (emptyPartRow) {
            emptyPartRow.querySelector('input').value = firstCol.toUpperCase();
          } else {
            addPart(firstCol.toUpperCase());
          }
        } else {
          // It's a Label (Special row with cyan-ish border/bg)
          const emptyLabRow = findEmptyRow('.label-row');
          if (emptyLabRow) {
            emptyLabRow.querySelector('input').value = firstCol;
          } else {
            const row = document.createElement('tr');
            row.className = 'label-row';
            row.innerHTML = `
                <td colspan="3"><input type="text" placeholder="Add custom label..." value="${firstCol}" style="width: 100%; border: none; font-style: italic;"></td>
                <td><button class="remove-row-btn" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
          }
        }
      }
    }
  });

  calculateWeights();
}

function findEmptyRow(selector) {
  const rows = Array.from(document.querySelectorAll(`#formula-body ${selector}`));
  return rows.find(row => {
    const inputs = Array.from(row.querySelectorAll('input'));
    return inputs.every(input => !input.value || input.value.trim() === '');
  });
}

function initTableFilters() {
  const searchInput = document.querySelector('.search-input');
  const filterSelect = document.querySelector('.filter-select');
  const tableRows = document.querySelectorAll('.data-table tbody tr');

  if (!searchInput && !filterSelect) return;

  const filterTable = () => {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const filterValue = filterSelect ? filterSelect.value.toLowerCase() : '';

    tableRows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const statusBadge = row.querySelector('.badge');
      const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';

      const matchesSearch = text.includes(searchTerm);
      const matchesFilter = filterValue === '' || text.includes(filterValue) || status.includes(filterValue);

      if (matchesSearch && matchesFilter) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', filterTable);
  }
  if (filterSelect) {
    filterSelect.addEventListener('change', filterTable);
  }
}

/**
 * Handle user logout
 */
async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await window.auth.signOut();
  }
}

// Global listener for logout links
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'A' && e.target.textContent === 'Logout') {
    e.preventDefault();
    handleLogout();
  }
});

/**
 * Generate a unique code based on timestamp
 * @param {string} prefix - Prefix for the code (e.g., 'LOT-' or 'RND-')
 * @returns {string} Unique code string
 */
function generateUniqueCode(prefix = 'LOT-') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${prefix}${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// --- Global Chat Widget Loader ---
(function () {
  if (document.getElementById('floating-chat-btn')) return;
  const chatScript = document.createElement('script');
  chatScript.src = 'chat-widget.js';
  chatScript.async = true;
  document.body.appendChild(chatScript);
})();