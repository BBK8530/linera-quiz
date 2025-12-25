import { ApolloProvider } from '@apollo/client/react';
import { DynamicWalletProvider } from './providers/DynamicWalletProvider';
import { client } from './apollo/index';
import LoginButton from './components/LoginButton';
import UserInfo from './components/UserInfo';
import QuizList from './components/QuizList';
import MyQuizzes from './components/MyQuizzes';
import CreateQuizForm from './components/CreateQuizForm';
import QuizTakingPage from './components/QuizTakingPage';
import GlobalRankings from './components/GlobalRankings';
import QuizRankings from './components/QuizRankings';
import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import NotificationProvider from './components/NotificationContext';
import NotificationContainer from './components/NotificationContainer';
import './App.css';

// 创建Header组件
const Header: React.FC = () => {
  const { user, primaryWallet } = useDynamicContext();

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo-link">
          <h1>Quiz Challenge</h1>
        </Link>
        <nav className="main-nav">
          <Link to="/" className="nav-link">
            All Quizzes
          </Link>
          <Link to="/my-quizzes" className="nav-link">
            My Quizzes
          </Link>
          <Link to="/create" className="nav-link">
            Create Quiz
          </Link>
          <Link to="/rankings" className="nav-link">
            Leadboard
          </Link>
        </nav>
        {user && primaryWallet ? <UserInfo /> : <LoginButton />}
      </div>
    </header>
  );
};

// 创建Layout组件
const Layout: React.FC = () => {
  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>

      {/* Usage Guide */}
      <section className="usage-guide">
        <h2>How to Use</h2>
        <div className="usage-steps">
          <div className="usage-step">
            <div className="step-number">1</div>
            <h3>Create Quiz</h3>
            <p>
              Add questions and set points for each question to create your own
              quiz challenge
            </p>
          </div>
          <div className="usage-step">
            <div className="step-number">2</div>
            <h3>Share & Participate</h3>
            <p>
              Invite others to participate, the system will calculate scores
              based on answer speed and accuracy
            </p>
          </div>
          <div className="usage-step">
            <div className="step-number">3</div>
            <h3>View Rankings</h3>
            <p>
              Check real-time participant rankings to see the fastest and most
              accurate quiz masters
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

function App() {
  return (
    <DynamicWalletProvider>
      <ApolloProvider client={client}>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route
                  index
                  element={
                    <div className="content-wrapper">
                      <div className="content-header">
                        <h2>All Quizzes</h2>
                      </div>
                      <QuizList />
                    </div>
                  }
                />
                <Route
                  path="/my-quizzes"
                  element={
                    <div className="content-wrapper">
                      <div className="content-header">
                        <h2>My Quizzes</h2>
                      </div>
                      <MyQuizzes />
                    </div>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <div className="content-wrapper">
                      <div className="content-header">
                        <h2>Create Quiz</h2>
                      </div>
                      <CreateQuizForm />
                    </div>
                  }
                />
                <Route
                  path="/quiz/:quizId"
                  element={
                    <div className="content-wrapper">
                      <div className="content-header">
                        <h2>Take Quiz</h2>
                      </div>
                      <QuizTakingPage />
                    </div>
                  }
                />
                <Route
                  path="/quiz-rank/:quizId"
                  element={
                    <div className="content-wrapper">
                      <div className="content-header">
                        <h2>Quiz Rankings</h2>
                      </div>
                      <QuizRankings />
                    </div>
                  }
                />
                <Route
                  path="/rankings"
                  element={
                    <div className="content-wrapper">
                      <div className="content-header">
                        <h2>Leadboard</h2>
                      </div>
                      <GlobalRankings />
                    </div>
                  }
                />
              </Route>
            </Routes>
            <NotificationContainer />
          </BrowserRouter>
        </NotificationProvider>
      </ApolloProvider>
    </DynamicWalletProvider>
  );
}

export default App;
