const DISCORD_TOKEN_KEY = 'discord_token';
const DISCORD_API_BASE = 'https://discord.com/api/v9';
const {
  sanitizeToken,
  isValidDiscordToken,
  mapHouseId,
  getAvatarUrl,
  getCurrentBadge,
} = window.HypeSquadLogic;

class HypeSquadManager {
  constructor() {
    this.selectedHouse = null;
    this.token = '';
    this.statusTimeout = null;
    this.loading = false;
    this.elements = {
      minimizeWindowBtn: document.getElementById('minimizeWindowBtn'),
      maximizeWindowBtn: document.getElementById('maximizeWindowBtn'),
      closeWindowBtn: document.getElementById('closeWindowBtn'),
      maximizeIconExpand: document.querySelector('.maximize-icon-expand'),
      maximizeIconRestore: document.querySelector('.maximize-icon-restore'),
      loginSection: document.getElementById('loginSection'),
      profileSection: document.getElementById('profileSection'),
      tokenInput: document.getElementById('token'),
      toggleToken: document.getElementById('toggleToken'),
      desktopLoginBtn: document.getElementById('desktopLoginBtn'),
      avatar: document.getElementById('userAvatar'),
      username: document.getElementById('username'),
      usernameWrap: document.querySelector('.username-wrap'),
      logoutBtn: document.getElementById('logoutBtn'),
      badgeOptions: Array.from(document.querySelectorAll('.badge-option')),
      setBadge: document.getElementById('setBadge'),
      removeBadge: document.getElementById('removeBadge'),
      status: document.getElementById('status'),
      loading: document.getElementById('loading'),
    };
  }

  init() {
    this.bindEvents();
    if (window.electronAPI) {
      console.info('Electron bridge detected.');
    }
    if (window.AppSquircle) {
      window.AppSquircle.bindSquircles();
    }
    this.restoreSavedSession();
    this.loadSavedTokenIntoInput();
    this.syncWindowState();
  }

  bindEvents() {
    this.elements.badgeOptions.forEach((option) => {
      option.addEventListener('click', () => {
        this.selectBadge(option);
      });
    });

    this.elements.setBadge.addEventListener('click', () => {
      this.addBadge();
    });

    this.elements.removeBadge.addEventListener('click', () => {
      this.removeBadge();
    });

    this.elements.tokenInput.addEventListener('input', (event) => {
      const sanitizedInput = sanitizeToken(event.target.value);
      this.token = sanitizedInput;
      localStorage.setItem(DISCORD_TOKEN_KEY, sanitizedInput);
      this.updateAddButtonState();
    });

    if (this.elements.desktopLoginBtn && window.electronAPI?.loginWithDiscord) {
      this.elements.desktopLoginBtn.addEventListener('click', () => {
        this.loginWithDiscord();
      });
    }

    this.elements.toggleToken.addEventListener('click', () => {
      const isPassword = this.elements.tokenInput.type === 'password';
      const nextType = isPassword ? 'text' : 'password';
      this.elements.tokenInput.type = nextType;
      const showIcon = this.elements.toggleToken.querySelector('.toggle-icon-show');
      const hideIcon = this.elements.toggleToken.querySelector('.toggle-icon-hide');
      showIcon?.classList.toggle('hidden', isPassword);
      hideIcon?.classList.toggle('hidden', !isPassword);
      this.elements.toggleToken.setAttribute('aria-label', isPassword ? 'Hide token' : 'Show token');
    });

    this.elements.logoutBtn.addEventListener('click', () => {
      this.logout();
    });

    if (window.electronAPI?.minimizeWindow && this.elements.minimizeWindowBtn) {
      this.elements.minimizeWindowBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
      });
    }

    if (window.electronAPI?.toggleMaximizeWindow && this.elements.maximizeWindowBtn) {
      this.elements.maximizeWindowBtn.addEventListener('click', async () => {
        const isMaximized = await window.electronAPI.toggleMaximizeWindow();
        this.updateMaximizeButton(Boolean(isMaximized));
      });
    }

    if (window.electronAPI?.closeWindow && this.elements.closeWindowBtn) {
      this.elements.closeWindowBtn.addEventListener('click', () => {
        window.electronAPI.closeWindow();
      });
    }

    if (window.electronAPI?.onWindowMaximizedChange) {
      this.removeWindowMaximizedListener = window.electronAPI.onWindowMaximizedChange((isMaximized) => {
        this.updateMaximizeButton(Boolean(isMaximized));
      });
    }
  }

  async syncWindowState() {
    if (!window.electronAPI?.isWindowMaximized) {
      return;
    }

    const isMaximized = await window.electronAPI.isWindowMaximized();
    this.updateMaximizeButton(Boolean(isMaximized));
  }

  updateMaximizeButton(isMaximized) {
    this.elements.maximizeWindowBtn?.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
    this.elements.maximizeIconExpand?.classList.toggle('hidden', isMaximized);
    this.elements.maximizeIconRestore?.classList.toggle('hidden', !isMaximized);
  }

  isValidDiscordToken(token) {
    return isValidDiscordToken(token);
  }

  async loginWithDiscord() {
    if (!window.electronAPI?.loginWithDiscord) {
      return;
    }

    try {
      const capturedToken = await window.electronAPI.loginWithDiscord();
      if (!capturedToken) {
        this.showStatus('Login cancelled or failed.', 'info');
        return;
      }

      const sanitizedToken = sanitizeToken(capturedToken);
      this.token = sanitizedToken;
      localStorage.setItem(DISCORD_TOKEN_KEY, sanitizedToken);
      this.elements.tokenInput.value = sanitizedToken;
      this.updateAddButtonState();
      this.showStatus('Logged in successfully!', 'success');
      await this.fetchProfile();
    } catch (error) {
      this.showStatus('Login error occurred.', 'error');
    }
  }

  restoreSavedSession() {
    const savedToken = localStorage.getItem(DISCORD_TOKEN_KEY);
    if (!savedToken) {
      this.updateAddButtonState();
      return;
    }

    this.token = sanitizeToken(savedToken);
    this.elements.tokenInput.value = this.token;
    this.fetchProfile();
  }

  loadSavedTokenIntoInput() {
    const savedToken = localStorage.getItem(DISCORD_TOKEN_KEY);
    if (!savedToken) {
      return;
    }

    this.elements.tokenInput.value = sanitizeToken(savedToken);
  }

  selectBadge(option) {
    this.elements.badgeOptions.forEach((badgeOption) => {
      badgeOption.classList.remove('selected');
    });

    option.classList.add('selected');
    this.selectedHouse = Number(option.dataset.house);
    this.updateAddButtonState();
  }

  updateAddButtonState() {
    this.elements.setBadge.disabled = this.loading || !this.token || this.selectedHouse === null;
    this.elements.removeBadge.disabled = this.loading;
  }

  setLoading(isLoading) {
    this.loading = isLoading;
    this.elements.loading?.classList.toggle('hidden', !isLoading);
    this.updateAddButtonState();
  }

  showStatus(message, type = 'info') {
    if (this.statusTimeout) {
      window.clearTimeout(this.statusTimeout);
    }

    if (!this.elements.status) {
      return;
    }

    this.elements.status.textContent = message;

    this.statusTimeout = window.setTimeout(() => {
      if (this.elements.status) {
        this.elements.status.textContent = '';
      }
    }, 5000);
  }

  getAuthHeaders(extraHeaders = {}) {
    return {
      Authorization: this.token,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...extraHeaders,
    };
  }

  renderProfile(user) {
    const badge = getCurrentBadge(user.flags || user.public_flags);
    this.elements.avatar.src = getAvatarUrl(user);
    this.elements.username.textContent = user.username;

    const existingBadge = this.elements.usernameWrap.querySelector('.current-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    if (badge) {
      const badgeIcon = document.createElement('img');
      badgeIcon.src = badge.icon;
      badgeIcon.alt = `${badge.name} badge`;
      badgeIcon.className = 'current-badge';
      this.elements.usernameWrap.appendChild(badgeIcon);
    }

    this.elements.loginSection.classList.add('hidden');
    this.elements.profileSection.classList.remove('hidden');
    window.AppSquircle?.applySquircles();
    this.updateAddButtonState();
  }

  async fetchProfile() {
    if (!this.token) {
      return;
    }

    try {
      const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        await this.logout({ showStatus: false });
        this.showStatus('Session expired. Please login again.', 'error');
        return;
      }

      const user = await response.json();
      this.renderProfile(user);
    } catch (error) {
      this.showStatus('Could not fetch profile.', 'error');
    }
  }

  async addBadge() {
    if (!this.token || this.selectedHouse === null) {
      this.showStatus('Token and badge selection are required!', 'error');
      return;
    }

    this.setLoading(true);

    try {
      const mappedHouseId = mapHouseId(this.selectedHouse);
      const response = await fetch(`${DISCORD_API_BASE}/hypesquad/online`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ house_id: mappedHouseId }),
      });

      if (response.ok) {
        const selectedOption = this.elements.badgeOptions.find((option) => Number(option.dataset.house) === this.selectedHouse);
        const selectedName = selectedOption?.querySelector('span')?.textContent || 'selected';
        this.showStatus(`HypeSquad badge updated to ${selectedName}!`, 'success');
        await this.fetchProfile();
        return;
      }

      await this.handleApiError(response);
    } catch (error) {
      this.showStatus('Connection error! Please check your internet.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async removeBadge() {
    if (!this.token) {
      this.showStatus('Token is required!', 'error');
      return;
    }

    this.setLoading(true);

    try {
      const response = await fetch(`${DISCORD_API_BASE}/hypesquad/online`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (response.ok || response.status === 204) {
        this.elements.badgeOptions.forEach((badgeOption) => {
          badgeOption.classList.remove('selected');
        });
        this.selectedHouse = null;
        this.showStatus('HypeSquad badge removed successfully!', 'success');
        await this.fetchProfile();
        return;
      }

      await this.handleApiError(response);
    } catch (error) {
      this.showStatus('Connection error! Please check your internet.', 'error');
    } finally {
      this.setLoading(false);
      this.updateAddButtonState();
    }
  }

  async handleApiError(response) {
    if (response.status === 401) {
      this.showStatus('Invalid token! Please check your token.', 'error');
      return;
    }

    if (response.status === 429) {
      let retryAfter = 'few';

      try {
        const errorData = await response.json();
        if (typeof errorData.retry_after === 'number') {
          retryAfter = String(Math.ceil(errorData.retry_after));
        }
      } catch (error) {
        // Keep the fallback message when the rate-limit payload is unavailable.
      }

      this.showStatus(`Rate limited! Please wait ${retryAfter} seconds.`, 'error');
      return;
    }

    try {
      const errorData = await response.json();
      this.showStatus(errorData.message || 'Unknown error', 'error');
    } catch (error) {
      this.showStatus('Unknown error', 'error');
    }
  }

  async logout(options = {}) {
    const { showStatus = true, clearElectron = true } = options;

    this.loading = false;
    this.token = '';
    this.selectedHouse = null;
    localStorage.removeItem(DISCORD_TOKEN_KEY);

    if (clearElectron && window.electronAPI?.logout) {
      try {
        await window.electronAPI.logout();
      } catch (error) {
        // Session clearing failure should not block local logout.
      }
    }

    this.elements.loginSection.classList.remove('hidden');
    this.elements.profileSection.classList.add('hidden');
    this.elements.badgeOptions.forEach((badgeOption) => {
      badgeOption.classList.remove('selected');
    });
    this.elements.tokenInput.value = '';
    this.elements.avatar.src = '';
    this.elements.username.textContent = '';
    const existingBadge = this.elements.usernameWrap.querySelector('.current-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    window.AppSquircle?.applySquircles();
    this.updateAddButtonState();

    if (showStatus) {
      this.showStatus('Logged out.', 'info');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new HypeSquadManager();
  app.init();
});
