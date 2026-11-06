import { getToken } from './auth.jsx';

const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status}).`);
  return data;
}

export const api = {
  listPosts: () => request('/api/posts').then((d) => d.posts),
  getPost: (id) => request(`/api/posts/${id}`),
  createPost: (post) => request('/api/posts', { method: 'POST', body: post }).then((d) => d.post),
  updatePost: (id, post) => request(`/api/posts/${id}`, { method: 'PUT', body: post }).then((d) => d.post),
  deletePost: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
  addComment: (id, text) => request(`/api/posts/${id}/comments`, { method: 'POST', body: { text } }).then((d) => d.comment),
  deleteComment: (id, commentId) => request(`/api/posts/${id}/comments/${commentId}`, { method: 'DELETE' }),
};
