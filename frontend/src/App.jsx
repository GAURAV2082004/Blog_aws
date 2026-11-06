import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import PostPage from './pages/PostPage.jsx';
import Editor from './pages/Editor.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/write" element={<Editor />} />
          <Route path="/edit/:id" element={<Editor />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer wrap">
        <span>Margin</span>
        <span className="muted">Serverless on AWS: Cognito, API Gateway, Lambda, DynamoDB</span>
      </footer>
    </>
  );
}
