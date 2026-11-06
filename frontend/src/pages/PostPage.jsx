import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatDate } from '../util.js';
import Avatar from '../components/Avatar.jsx';
import { Loading, ErrorState } from '../components/State.jsx';

export default function PostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    api.getPost(id).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading label="Loading story" />;

  const { post, comments } = data;
  const canModify = (item) => user && (user.isAdmin || user.sub === item.authorId);

  async function removePost() {
    if (!window.confirm('Delete this story and all its comments? This cannot be undone.')) return;
    try {
      await api.deletePost(id);
      navigate('/');
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      const comment = await api.addComment(id, text);
      setData({ post, comments: [...comments, comment] });
      setText('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(commentId) {
    try {
      await api.deleteComment(id, commentId);
      setData({ post, comments: comments.filter((c) => c.id !== commentId) });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <article className="article">
      <Link to="/" className="back">Back to all stories</Link>
      {post.tag && <span className="chip">{post.tag}</span>}
      <h1 className="article-title">{post.title}</h1>
      <div className="byline byline-lg">
        <Avatar name={post.authorName} seed={post.authorId} size={40} />
        <div>
          <strong>{post.authorName}</strong>
          <div className="muted">
            {formatDate(post.createdAt)}
            {post.updatedAt && ` (edited ${formatDate(post.updatedAt)})`}, {post.readMins} min read
          </div>
        </div>
        {canModify(post) && (
          <div className="byline-actions">
            <Link className="btn btn-quiet" to={`/edit/${post.id}`}>Edit</Link>
            <button className="btn btn-danger" onClick={removePost}>Delete</button>
          </div>
        )}
      </div>

      <div className="prose">
        {post.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
      </div>

      <section className="comments" aria-labelledby="comments-h">
        <h2 id="comments-h">{comments.length === 0 ? 'Comments' : `Comments (${comments.length})`}</h2>

        {user ? (
          <form onSubmit={submitComment} className="comment-form">
            <label htmlFor="comment" className="sr-only">Add a comment</label>
            <textarea id="comment" className="input" rows={3} maxLength={1000} placeholder="Add to the conversation"
              value={text} onChange={(e) => setText(e.target.value)} required />
            <div className="form-row">
              {formError ? <span className="error" role="alert">{formError}</span> : <span className="muted">{text.length}/1000</span>}
              <button className="btn btn-primary" disabled={busy || !text.trim()}>{busy ? 'Posting...' : 'Post comment'}</button>
            </div>
          </form>
        ) : (
          <p className="callout">
            <Link to="/auth">Sign in</Link> or <Link to="/auth?mode=signup">create an account</Link> to join the conversation.
          </p>
        )}

        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <Avatar name={c.authorName} seed={c.authorId} size={32} />
              <div className="comment-main">
                <div className="comment-head">
                  <strong>{c.authorName}</strong>
                  <span className="muted">{formatDate(c.createdAt)}</span>
                  {canModify(c) && (
                    <button className="link-btn" onClick={() => removeComment(c.id)}>
                      {user.sub === c.authorId ? 'Delete' : 'Remove as moderator'}
                    </button>
                  )}
                </div>
                <p>{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
