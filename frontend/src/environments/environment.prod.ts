export const environment = {
  production: true,
  // Для Android приложения используем ngrok URL
  apiUrl: 'https://1e53debf9f5f.ngrok-free.app/api',
  authUrl: 'https://1e53debf9f5f.ngrok-free.app/api/auth/login',
  appName: 'Coffee Admin Panel',
  demo: false,
};

// ВАЖНО: При сборке для Android/iOS убедитесь, что:
// 1. Бэкенд запущен и доступен по указанному IP
// 2. Порт 3001 открыт в firewall
// 3. Запросы идут именно на порт 3001, а не 4000!

// For ngrok demo:
// apiUrl: 'https://1e53debf9f5f.ngrok-free.app/api',
// authUrl: 'https://1e53debf9f5f.ngrok-free.app/api/auth/login',
// appName: 'Coffee Admin Panel Demo',
// demo: true,
