import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CREATE_QUIZ } from '../graphql/quizMutations';
import { useDynamicContext } from '@dynamic-labs/sdk-react';
import { useDynamicSigner } from '../providers/DynamicSigner';
import { lineraAdapter } from '../providers/LineraAdapter';

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
}

const CreateQuizForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(15);
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: '', options: ['', '', '', ''], correct_answer: '' }
  ]);
  
  const { user, primaryWallet } = useDynamicContext();
  const { signer } = useDynamicSigner();
  
  const [createQuiz, { loading }] = useMutation(CREATE_QUIZ, {
    onCompleted: (data) => {
      alert(`测验创建成功！测验ID: ${data.create_quiz.quiz_id}`);
      // 重置表单
      setTitle('');
      setDescription('');
      setDuration(15);
      setQuestions([{ question_text: '', options: ['', '', '', ''], correct_answer: '' }]);
    },
    onError: (err) => {
      console.error('创建测验失败:', err);
      alert(`创建测验失败: ${err.message}`);
    },
  });

  const handleQuestionChange = (index: number, field: keyof Question, value: string | string[]) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', '', '', ''], correct_answer: '' }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      setQuestions(updatedQuestions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('标题和描述不能为空');
      return;
    }

    if (duration <= 0) {
      alert('时长必须大于0');
      return;
    }

    // 检查所有问题是否都填写完整
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question_text.trim()) {
        alert(`第${i + 1}题的问题文本不能为空`);
        return;
      }

      for (let j = 0; j < question.options.length; j++) {
        if (!question.options[j].trim()) {
          alert(`第${i + 1}题的第${j + 1}个选项不能为空`);
          return;
        }
      }

      if (!question.correct_answer) {
        alert(`请为第${i + 1}题选择正确答案`);
        return;
      }
    }

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
      
      await createQuiz({
        variables: {
          title: title.trim(),
          description: description.trim(),
          duration,
          questions,
        },
      });
    } catch (err: unknown) {
      console.error('创建测验失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      alert(`创建测验失败: ${errorMessage}`);
    }
  };

  if (!user) {
    return (
      <div className="create-quiz-form">
        <h2>创建测验</h2>
        <p>请先登录以创建测验</p>
      </div>
    );
  }

  return (
    <div className="create-quiz-form">
      <h2>创建测验</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">测验标题</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入测验标题"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">测验描述</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入测验描述"
            required
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="duration">测验时长（分钟）</label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min="1"
            max="120"
            required
          />
        </div>

        <h3>问题</h3>
        {questions.map((question, index) => (
          <div key={index} className="question-group">
            <div className="question-header">
              <h4>问题 {index + 1}</h4>
              <button 
                type="button" 
                className="remove-question"
                onClick={() => removeQuestion(index)}
                disabled={questions.length <= 1}
              >
                删除
              </button>
            </div>

            <div className="form-group">
              <label htmlFor={`question-${index}`}>问题文本</label>
              <input
                type="text"
                id={`question-${index}`}
                value={question.question_text}
                onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                placeholder="输入问题文本"
                required
              />
            </div>

            <div className="options-group">
              <label>选项</label>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="option-item">
                  <input
                    type="radio"
                    id={`option-${index}-${optionIndex}`}
                    name={`correct-option-${index}`}
                    value={String.fromCharCode(65 + optionIndex)}
                    checked={question.correct_answer === String.fromCharCode(65 + optionIndex)}
                    onChange={(e) => handleQuestionChange(index, 'correct_answer', e.target.value)}
                    required
                  />
                  <label htmlFor={`option-${index}-${optionIndex}`}>
                    {String.fromCharCode(65 + optionIndex)}. 
                  </label>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + optionIndex)}`}
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button type="button" className="add-question" onClick={addQuestion}>
          添加问题
        </button>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '创建中...' : '创建测验'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuizForm;
