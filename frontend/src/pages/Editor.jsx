import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Loading, ErrorState } from '../components/State.jsx';

const SUGGESTED_TAGS = ['Architecture', 'Security', 'Databases', 'Serverless', 'Career'];
const MAX_BODY = 20000;

export default function Editor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', tag: '', body: '' });
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api.getPost(id)
      .then(({ post }) => setForm({ title: post.title, tag: post.tag || '', body: post.body }))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (loading) return <Loading label="Loading story" />;
  if (loadError) return <ErrorState message={loadError} />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const post = editing ? await api.updatePost(id, form) : await api.createPost(form);
      navigate(`/post/${post.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="editor" onSubmit={submit}>
      <Link to={editing ? `/post/${id}` : '/'} className="back">Cancel</Link>
      <h1 className="editor-heading">{editing ? 'Edit story' : 'New story'}</h1>

      <label htmlFor="title" className="field-label">Title</label>
      <input id="title" className="input input-title" maxLength={120} placeholder="What is this story about?"
        value={form.title} onChange={set('title')} required />

      <label htmlFor="tag" className="field-label">Topic <span className="muted">(optional)</span></label>
      <input id="tag" className="input input-short" list="tags" maxLength={24} placeholder="e.g. Architecture"
        value={form.tag} onChange={set('tag')} />
      <datalist id="tags">{SUGGESTED_TAGS.map((t) => <option key={t} value={t} />)}</datalist>

      <label htmlFor="body" className="field-label">Story</label>
      <textarea id="body" className="input input-body" rows={16} maxLength={MAX_BODY}
        placeholder="Write in plain text. Leave a blank line between paragraphs."
        value={form.body} onChange={set('body')} required />

      <div className="form-row">
        {error ? <span className="error" role="alert">{error}</span>
          : <span className="muted">{form.body.length.toLocaleString()} / {MAX_BODY.toLocaleString()} characters</span>}
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Publish story'}
        </button>
      </div>
    </form>
  );
}
