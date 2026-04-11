// BUG: Multiple security vulnerabilities in auth module

const API_URL = 'https://api.example.com';

export class AuthService {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  // BUG: Token stored in localStorage (XSS vulnerable)
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // BUG: No CSRF token included in requests
  async login(username, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  // BUG: Using innerHTML with user input (XSS vulnerability)
  displayUserMessage(message) {
    const container = document.getElementById('message-container');
    container.innerHTML = `<div class="message">${message}</div>`;
  }

  // BUG: No token validation before use
  async fetchProtectedResource() {
    return fetch(`${API_URL}/protected`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
  }

  // BUG: Token visible in URL (logged by proxies/servers)
  async refreshToken() {
    return fetch(`${API_URL}/refresh?token=${this.token}`);
  }
}

// BUG: Global token variable accessible from console
window.authToken = null;
