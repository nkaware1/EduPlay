import { Route, Routes } from 'react-router-dom';
import Layout from './Layout.jsx';
import { RequireAuth } from './components.jsx';
import HomePage from './pages/HomePage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import PlayPage from './pages/PlayPage.jsx';
import MyActivitiesPage from './pages/MyActivitiesPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import ClassesPage from './pages/ClassesPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LiveHostPage from './pages/LiveHostPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import { Empty } from './ui.jsx';
import { Link } from 'react-router-dom';

const TEACH = ['teacher', 'admin'];

export default function App() {
  return (
    <Routes>
      <Route path="/play/:id" element={<PlayPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/join/:pin" element={<JoinPage />} />
      <Route path="/live/host/:activityId" element={<RequireAuth roles={TEACH}><LiveHostPage /></RequireAuth>} />
      <Route path="/editor/:id" element={<RequireAuth roles={TEACH}><EditorPage /></RequireAuth>} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="my" element={<RequireAuth roles={TEACH}><MyActivitiesPage /></RequireAuth>} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="activity/:id" element={<ActivityPage />} />
        <Route path="activity/:id/results" element={<RequireAuth roles={TEACH}><ResultsPage /></RequireAuth>} />
        <Route path="classes" element={<RequireAuth><ClassesPage /></RequireAuth>} />
        <Route path="login" element={<AuthPage />} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth roles={['admin']}><AdminPage /></RequireAuth>} />
        <Route path="*" element={<Empty icon="🧭" title="الصفحة غير موجودة"><Link className="btn primary" to="/">العودة للرئيسية</Link></Empty>} />
      </Route>
    </Routes>
  );
}
