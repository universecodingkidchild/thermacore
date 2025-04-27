// Mobile menu toggle (used on all pages)
document.querySelector('.mobile-menu-btn').addEventListener('click', () => {
    document.querySelector('.main-nav').classList.toggle('active');
  });
  
  // Notification system (optional)
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }