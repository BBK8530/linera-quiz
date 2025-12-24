import React from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_QUIZZES } from '../graphql/quizQueries';
import { REGISTER_FOR_QUIZ } from '../graphql/quizMutations';
import { useDynamicContext } from '@dynamic-labs/sdk-react';
import { useDynamicSigner } from '../providers/DynamicSigner';
import { lineraAdapter } from '../providers/LineraAdapter';

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  creator_nickname: string;
  is_started: boolean;
  is_ended: boolean;
  registered_count: number;
}

const QuizList: React.FC = () => {
  const { loading, error, data, refetch } = useQuery(GET_QUIZZES);
  const { user, primaryWallet } = useDynamicContext();
  const { signer } = useDynamicSigner();
  
  const [registerForQuiz, { loading: registering }] = useMutation(REGISTER_FOR_QUIZ, {
    onCompleted: () => {
      refetch(); // 刷新测验列表
    },
    onError: (err) => {
      console.error('注册测验失败:', err);
      alert(`注册测验失败: ${err.message}`);
    },
  });

  if (loading) return <div className="quiz-list">加载测验列表中...</div>;
  if (error) return <div className="quiz-list error">加载测验失败: {error.message}</div>;

  const handleRegister = async (quizId: string) => {
    if (!user || !primaryWallet) {
      alert('请先登录');
      return;
    }

    if (!signer) {
      alert('无法获取签名者');
      return;
    }

    try {
      lineraAdapter.setSigner(signer);
      
      await registerForQuiz({
        variables: { quizId },
      });
      
      alert('注册成功！');
    } catch (err: unknown) {
      console.error('注册测验失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      alert(`注册测验失败: ${errorMessage}`);
    }
  };

  return (
    <div className="quiz-list">
      <h2>可用测验</h2>
      
      {data.quizzes.length === 0 ? (
        <p>暂无可用测验</p>
      ) : (
        <div className="quiz-grid">
          {data.quizzes.map((quiz: Quiz) => (
            <div key={quiz.id} className="quiz-card">
              <h3>{quiz.title}</h3>
              <p>{quiz.description}</p>
              <div className="quiz-meta">
                <span>时长: {quiz.duration}分钟</span>
                <span>创建者: {quiz.creator_nickname}</span>
                <span>已注册: {quiz.registered_count}人</span>
              </div>
              <div className="quiz-status">
                {quiz.is_ended && <span className="status ended">已结束</span>}
                {quiz.is_started && !quiz.is_ended && <span className="status started">进行中</span>}
                {!quiz.is_started && !quiz.is_ended && <span className="status pending">待开始</span>}
              </div>
              <button 
                className="register-button"
                onClick={() => handleRegister(quiz.id)}
                disabled={registering || quiz.is_ended}
              >
                {registering ? '注册中...' : quiz.is_ended ? '已结束' : '注册'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizList;
