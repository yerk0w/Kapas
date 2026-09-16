// Kapas API Client with dynamic backend URL support

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kapas_api_url');
    if (saved) return saved.trim().replace(/\/+$/, '');
  }
  return (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
}

export function setApiBase(url) {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('kapas_api_url');
    } else {
      localStorage.setItem('kapas_api_url', url.trim().replace(/\/+$/, ''));
    }
  }
}

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  
  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    throw new Error(`Не удалось подключиться к серверу (${url}). Проверьте подключение или запустите бэкенд.`);
  }

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Бэкенд не найден (404 на ${path}). Сервер Kapas (FastAPI) не запущен по этому адресу.`);
    }
    const errorText = await res.text();
    throw new Error(`Ошибка сервера (${res.status}): ${errorText.slice(0, 100)}`);
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Сервер вернул HTML вместо JSON. Убедитесь, что бэкенд запущен на Render, VPS или локально.');
  }

  return res.json();
}
