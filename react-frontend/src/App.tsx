import React, { useState } from 'react'
import { ApolloProvider } from '@apollo/client/react'
import { DynamicWalletProvider } from './providers/DynamicWalletProvider'
import { client } from './apollo/index'
import LoginButton from './components/LoginButton'
// import QuizList from './components/QuizList'
// import CreateQuizForm from './components/CreateQuizForm'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('quizzes');

  return (
    <DynamicWalletProvider>
      <ApolloProvider client={client}>
        <div className="app-container">
          <header className="app-header">
            <h1>Linera Quiz Application</h1>
            <LoginButton />
          </header>
          <nav className="app-nav">
            <button 
              className={`nav-button ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              测验列表
            </button>
            <button 
              className={`nav-button ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              创建测验
            </button>
          </nav>
          <main className="app-main">
            <section className="main-content">
              
              
            </section>
          </main>
        </div>
      </ApolloProvider>
    </DynamicWalletProvider>
  )
}

export default App
