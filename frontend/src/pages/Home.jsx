import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatDate } from '../util.js';
import Avatar from '../components/Avatar.jsx';
import { Loading, ErrorState } from '../components/State.jsx';

function Byline({ post }) {
  return (
    <div className="byline">
      <Avatar name={post.authorName} seed={post.authorId} size={24} />
      <span>{post.authorName}</span>
      <span className="muted">{formatDate(post.createdAt)}</span>
      <span className="muted">{post.readMins} min read</span>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [mine, setMine] = useState(false);

  const load = useCallback(() => {
    setError('');
    setPosts(null);
    api.listPosts().then(setPosts).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const tags = useMemo(() => [...new Set((posts || []).map((p) => p.tag).filter(Boolean))], [posts]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (posts || []).filter(
      (p) =>
        (!tag || p.tag === tag) &&
        (!mine || p.authorId === user?.sub) &&
        (!q || `${p.title} ${p.excerpt} ${p.authorName}`.toLowerCase().includes(q))
    );
  }, [posts, query, tag, mine, user]);

  return (
    <>
      <section className="masthead">
        <h1>Notes from people who build things.</h1>
        <p className="lede">Short, honest write-ups on architecture, security and the decisions behind them.</p>
      </section>

      <section className="toolbar" aria-label="Filter stories">
        <input
          type="search"
          className="input search"
          placeholder="Search stories or authors"
          aria-label="Search stories or authors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filters" role="group" aria-label="Topics">
          <button className={`pill ${!tag ? 'is-on' : ''}`} onClick={() => setTag('')}>All</button>
          {tags.map((t) => (
            <button key={t} className={`pill ${tag === t ? 'is-on' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>{t}</button>
          ))}
          {user && (
            <button className={`pill pill-mine ${mine ? 'is-on' : ''}`} onClick={() => setMine(!mine)} aria-pressed={mine}>
              My stories
            </button>
          )}
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !posts && <Loading label="Loading stories" />}

      {posts && visible.length === 0 && (
        <div className="state">
          <p>{posts.length === 0 ? 'No stories yet.' : 'No stories match those filters.'}</p>
          {user ? <Link className="btn btn-primary" to="/write">Write the first story</Link> : <Link className="btn btn-primary" to="/auth?mode=signup">Create an account to write</Link>}
        </div>
      )}

      <div className="feed">
        {visible.map((p, i) => (
          <article key={p.id} className={`entry ${i === 0 && !query && !tag && !mine ? 'entry-lead' : ''}`}>
            {p.tag && <span className="chip">{p.tag}</span>}
            <h2><Link to={`/post/${p.id}`}>{p.title}</Link></h2>
            <p className="excerpt">{p.excerpt}</p>
            <Byline post={p} />
          </article>
        ))}
      </div>
    </>
  );
}
