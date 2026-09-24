const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

/** Query string builder that skips empty/undefined values. */
function qs(params = {}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.set(key, String(value));
  }
  return q.toString();
}

/** Raw server messages → copy a person can act on. */
const FRIENDLY_MESSAGES = {
  'Failed to fetch users': 'We could not load the users. Please refresh the page and try again.',
  'Failed to fetch pending users': 'We could not load pending signups. Please refresh and try again.',
  'User not found': 'We could not find that user — they may have been removed. Please refresh the page.',
  'Failed to approve user': 'We could not approve this account. Please try again.',
  'Failed to reject user': 'We could not reject this account. Please try again.',
  'Account pending approval': "Your account is still waiting for admin approval. You'll receive an email as soon as it's reviewed.",
  'Account has been rejected': 'Your account was not approved. Please contact support if you have questions.',
  'Admin access required': 'This area is only available to administrators.',
  'Failed to fetch price data': 'We could not load live market data. Please try again in a moment.',
  'Failed to fetch klines data': 'We could not load the price chart. Please try again in a moment.',
  'Failed to fetch order book': 'We could not load the order book. Please try again in a moment.',
  'Failed to fetch market overview': 'We could not load the market overview. Please try again in a moment.',
  'Failed to fetch notifications': 'We could not load your notifications. Please refresh and try again.',
  'Failed to fetch unread count': 'We could not check for new notifications. Please refresh and try again.',
  'Failed to mark notification as read': 'We could not mark that notification as read. Please try again.',
  'Failed to mark all as read': 'We could not mark all notifications as read. Please try again.',
  'Failed to delete notification': 'We could not delete that notification. Please try again.',
  'Failed to clear notifications': 'We could not clear your notifications. Please try again.',
  'Failed to update profile': 'We could not save your profile. Please try again.',
  'Failed to change password': 'We could not change your password. Please try again.',
  'Failed to update two-factor settings': 'We could not update your two-factor settings. Please try again.',
  'Failed to update plan': 'We could not update your plan. Please try again.',
  'Failed to delete account': 'We could not delete your account. Please try again.',
  'Failed to fetch performance': 'We could not load your performance chart. Please refresh and try again.',
  'Failed to fetch allocation': 'We could not load your allocation. Please refresh and try again.',
  'Failed to fetch goals': 'We could not load your goals. Please refresh and try again.',
  'Failed to create goal': 'We could not create that goal. Please try again.',
  'Failed to update goal': 'We could not save that goal. Please try again.',
  'Failed to delete goal': 'We could not delete that goal. Please try again.',
  'Failed to add money to goal': 'We could not move money into that goal. Please try again.',
  'Failed to withdraw from goal': 'We could not move money out of that goal. Please try again.',
  'Invalid deadline date': "That deadline doesn't look right. Please pick another date.",
  'Failed to fetch accounts': 'We could not load your accounts. Please refresh and try again.',
  'Failed to fetch transactions': 'We could not load your transactions. Please refresh and try again.',
  'Failed to fetch portfolio': 'We could not load your portfolio. Please refresh and try again.',
  'Failed to send verification code': 'We could not send the code. Please check your connection and try again.',
  'Invalid or expired verification code': "That code isn't valid or has expired. Request a new one and try again.",
  'Failed to verify code': 'We could not verify that code. Please try again.',
  'Failed to create account': 'We could not create your account. Please try again.',
  'Failed to login': 'We could not sign you in right now. Please try again in a moment.',
  'Failed to process request': 'We could not process that request. Please try again.',
  'No token provided': 'Your session has expired. Please sign in again.',
  'Invalid token': 'Your session has expired. Please sign in again.',
  'No account found for that email': 'We could not find an account for that email. Double-check the address and try again.',
  'Failed to reset password': 'We could not reset your password. Please try again.',
  'Email already registered': 'That email is already registered — try signing in instead.',
  'Failed to load dashboard': 'We could not load your dashboard. Please refresh and try again.',
};

/** Turn raw server/network failures into copy a person can act on. */
function friendly(message) {
  if (!message) return 'Something went wrong. Please try again.';
  const direct = FRIENDLY_MESSAGES[message];
  if (direct) return direct;

  const lower = String(message).toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return "We couldn't reach the server. Check your internet connection and try again.";
  }
  if (lower.includes('invalid or expired token') || lower === 'no token provided' || lower === 'authentication required') {
    return 'Your session has expired. Please sign in again.';
  }
  if (lower.startsWith('failed to')) {
    return 'We could not complete that action. Please try again.';
  }
  if (lower.includes('json')) {
    return 'We hit a hiccup processing that response. Please try again.';
  }
  return message;
}

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  setToken(token) {
    localStorage.setItem('token', token);
  }

  clearToken() {
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      const err = new Error(friendly('failed to fetch'));
      err.status = 0;
      throw err;
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      // Empty/non-JSON body — fall through to the generic message below.
    }

    if (!response.ok) {
      const err = new Error(friendly(data.error || 'Request failed'));
      err.status = response.status;
      throw err;
    }

    return data;
  }

  // Auth endpoints
  async requestOtp(email, type = 'SIGNUP') {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    });
  }

  async verifyOtp(email, code, type = 'SIGNUP') {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code, type }),
    });
  }

  async signup(data) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyLoginOtp(email, code) {
    return this.request('/auth/verify-login', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async resetPassword(email, password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/users/me');
  }

  async getDashboard() {
    return this.request('/users/dashboard');
  }

  async getPerformance() {
    return this.request('/users/portfolio/performance');
  }

  async getAllocation() {
    return this.request('/users/portfolio/allocation');
  }

  async getGoals() {
    return this.request('/users/goals');
  }

  async createGoal(data) {
    return this.request('/users/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAccounts() {
    return this.request('/users/accounts');
  }

  async getTransactions(params = {}) {
    const query = qs(params);
    return this.request(`/users/transactions${query ? `?${query}` : ''}`);
  }

  async getPortfolio() {
    return this.request('/users/portfolio');
  }

  async getMonetraDashboard() {
    return this.request('/users/monetra');
  }

  // Profile & settings
  async updateProfile(data) {
    return this.request('/users/me', { method: 'PUT', body: JSON.stringify(data) });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async setTwoFactor(enabled) {
    return this.request('/users/2fa', { method: 'POST', body: JSON.stringify({ enabled }) });
  }

  async setPlan(plan) {
    return this.request('/users/plan', { method: 'PUT', body: JSON.stringify({ plan }) });
  }

  async deleteAccount(password) {
    return this.request('/users/me', { method: 'DELETE', body: JSON.stringify({ password }) });
  }

  // Goals
  async updateGoal(id, data) {
    return this.request(`/users/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteGoal(id) {
    return this.request(`/users/goals/${id}`, { method: 'DELETE' });
  }

  async addToGoal(id, amount) {
    return this.request(`/users/goals/${id}/deposit`, { method: 'POST', body: JSON.stringify({ amount }) });
  }

  async withdrawFromGoal(id, amount) {
    return this.request(`/users/goals/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ amount }) });
  }

  // Payments
  async getPayments() {
    return this.request('/payments');
  }

  async getDepositAddresses() {
    return this.request('/payments/addresses');
  }

  async getMyRequests(params = {}) {
    const query = qs(params);
    return this.request(`/payments/requests${query ? `?${query}` : ''}`);
  }

  async deposit(amount, addressId, txHash) {
    return this.request('/payments/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, addressId, txHash, method: 'crypto' }),
    });
  }

  async withdraw(amount, method = 'bank') {
    return this.request('/payments/withdraw', { method: 'POST', body: JSON.stringify({ amount, method }) });
  }

  async transfer(recipientEmail, amount, note) {
    return this.request('/payments/transfer', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail, amount, note }),
    });
  }

  async requestPayment(toEmail, amount, note) {
    return this.request('/payments/request', {
      method: 'POST',
      body: JSON.stringify({ toEmail, amount, note }),
    });
  }

  async getHoldings() {
    return this.request('/payments/holdings');
  }

  async trade(order) {
    return this.request('/payments/trade', { method: 'POST', body: JSON.stringify(order) });
  }

  // Cards
  async getCards() {
    return this.request('/payments/cards');
  }

  async createCard(label, spendLimit) {
    return this.request('/payments/cards', {
      method: 'POST',
      body: JSON.stringify({ label, spendLimit }),
    });
  }

  async updateCard(id, data) {
    return this.request(`/payments/cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteCard(id) {
    return this.request(`/payments/cards/${id}`, { method: 'DELETE' });
  }

  async revealCard(id) {
    return this.request(`/payments/cards/${id}/reveal`, { method: 'POST' });
  }

  async fundCard(id, amount, addressId, txHash) {
    return this.request(`/payments/cards/${id}/fund`, {
      method: 'POST',
      body: JSON.stringify({ amount, addressId, txHash }),
    });
  }

  async cardToWallet(id, amount) {
    return this.request(`/payments/cards/${id}/to-wallet`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async cardSend(id, recipientEmail, amount, note) {
    return this.request(`/payments/cards/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ recipientEmail, amount, note }),
    });
  }

  // Investments
  async getInvestmentPlans() {
    return this.request('/investments/plans');
  }

  async getInvestments() {
    return this.request('/investments');
  }

  async invest(planId, amount) {
    return this.request('/investments', {
      method: 'POST',
      body: JSON.stringify({ planId, amount }),
    });
  }

  async claimInvestment(id) {
    return this.request(`/investments/${id}/claim`, { method: 'POST' });
  }

  // Admin endpoints
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAdminUsers(params = {}) {
    const query = qs(params);
    return this.request(`/admin/users${query ? `?${query}` : ''}`);
  }

  async getPendingUsers() {
    return this.request('/admin/pending');
  }

  async approveUser(id) {
    return this.request(`/admin/approve/${id}`, { method: 'POST' });
  }

  async rejectUser(id) {
    return this.request(`/admin/reject/${id}`, { method: 'POST' });
  }

  async suspendUser(id) {
    return this.request(`/admin/users/${id}/suspend`, { method: 'POST' });
  }

  async unsuspendUser(id) {
    return this.request(`/admin/users/${id}/unsuspend`, { method: 'POST' });
  }

  async deleteUser(id) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  // Admin — approval queue
  async getAdminRequests(params = {}) {
    const query = qs(params);
    return this.request(`/admin/requests${query ? `?${query}` : ''}`);
  }

  async getAdminCardTransactions(params = {}) {
    const query = qs(params);
    return this.request(`/admin/card-transactions${query ? `?${query}` : ''}`);
  }

  async approveRequest(id, note) {
    return this.request(`/admin/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: note || undefined }),
    });
  }

  async rejectRequest(id, note) {
    return this.request(`/admin/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note: note || undefined }),
    });
  }

  // Admin — investment plans
  async getAdminPlans() {
    return this.request('/admin/plans');
  }

  async createAdminPlan(data) {
    return this.request('/admin/plans', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAdminPlan(id, data) {
    return this.request(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAdminPlan(id) {
    return this.request(`/admin/plans/${id}`, { method: 'DELETE' });
  }

  // Admin — crypto deposit addresses
  async getAdminAddresses() {
    return this.request('/admin/addresses');
  }

  async createAdminAddress(data) {
    return this.request('/admin/addresses', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAdminAddress(id, data) {
    return this.request(`/admin/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAdminAddress(id) {
    return this.request(`/admin/addresses/${id}`, { method: 'DELETE' });
  }

  // Notification endpoints
  async getNotifications(params = {}) {
    const query = qs(params);
    return this.request(`/notifications${query ? `?${query}` : ''}`);
  }

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PATCH' });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }

  async clearAllNotifications() {
    return this.request('/notifications', { method: 'DELETE' });
  }

  // Market endpoints
  async getMarketPairs() {
    return this.request('/market/pairs');
  }

  async getMarketPrice(symbol) {
    return this.request(`/market/price/${symbol}`);
  }

  async getMarketKlines(symbol, interval = '1h', limit = '200') {
    return this.request(`/market/klines/${symbol}?interval=${interval}&limit=${limit}`);
  }

  async getMarketDepth(symbol, limit = '20') {
    return this.request(`/market/depth/${symbol}?limit=${limit}`);
  }

  async getMarketExchanges(symbol = 'ETHUSDT') {
    return this.request(`/market/exchanges?symbol=${symbol}`);
  }

  async getMarketOverview() {
    return this.request('/market/overview');
  }
}

export const api = new ApiClient();
export default api;
