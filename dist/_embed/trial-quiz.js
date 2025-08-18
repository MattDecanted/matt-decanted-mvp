// Embeddable Daily Trial Quiz Widget
(function() {
  'use strict';

  // Widget configuration
  const WIDGET_CONFIG = {
    apiBaseUrl: 'https://mvpmattdecanted.netlify.app',
    version: '1.0.0'
  };

  // CSS styles for the widget
  const widgetCSS = `
    .md-trial-quiz {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      line-height: 1.5;
    }
    
    .md-quiz-header {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white;
      padding: 24px;
      text-align: center;
    }
    
    .md-quiz-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
    }
    
    .md-quiz-subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    
    .md-quiz-content {
      padding: 24px;
    }
    
    .md-quiz-loading {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
    }
    
    .md-quiz-spinner {
      border: 3px solid #e5e7eb;
      border-top: 3px solid #6366f1;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .md-quiz-question {
      margin-bottom: 20px;
    }
    
    .md-quiz-question h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .md-quiz-options {
      display: grid;
      gap: 12px;
    }
    
    .md-quiz-option {
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }
    
    .md-quiz-option:hover {
      border-color: #6366f1;
      background: #f8faff;
    }
    
    .md-quiz-option.selected {
      border-color: #6366f1;
      background: #6366f1;
      color: white;
    }
    
    .md-quiz-progress {
      background: #f3f4f6;
      height: 6px;
      border-radius: 3px;
      margin: 20px 0;
      overflow: hidden;
    }
    
    .md-quiz-progress-bar {
      background: #6366f1;
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 3px;
    }
    
    .md-quiz-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }
    
    .md-quiz-info {
      font-size: 14px;
      color: #6b7280;
    }
    
    .md-quiz-btn {
      background: #6366f1;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .md-quiz-btn:hover {
      background: #5b5bd6;
    }
    
    .md-quiz-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    
    .md-quiz-results {
      text-align: center;
      padding: 20px 0;
    }
    
    .md-quiz-score {
      font-size: 48px;
      font-weight: 700;
      color: #6366f1;
      margin: 16px 0;
    }
    
    .md-quiz-cta {
      background: #f8faff;
      border: 2px solid #6366f1;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }
    
    .md-quiz-cta h4 {
      margin: 0 0 8px 0;
      color: #6366f1;
      font-size: 18px;
    }
    
    .md-quiz-cta p {
      margin: 0 0 16px 0;
      color: #6b7280;
      font-size: 14px;
    }
    
    @media (max-width: 640px) {
      .md-trial-quiz {
        border-radius: 0;
        margin: 0;
      }
      
      .md-quiz-header,
      .md-quiz-content {
        padding: 20px 16px;
      }
    }
  `;

  class TrialQuizWidget {
    constructor(container, options = {}) {
      this.container = container;
      this.options = { locale: 'en', ...options };
      this.quiz = null;
      this.currentQuestion = 0;
      this.answers = [];
      this.showResults = false;
      
      this.init();
    }

    async init() {
      // Inject CSS
      if (!document.getElementById('md-trial-quiz-styles')) {
        const style = document.createElement('style');
        style.id = 'md-trial-quiz-styles';
        style.textContent = widgetCSS;
        document.head.appendChild(style);
      }

      this.render();
      await this.loadQuiz();
    }

    async loadQuiz() {
      try {
        const response = await fetch(
          `${WIDGET_CONFIG.apiBaseUrl}/.netlify/functions/trial-quiz-today?locale=${this.options.locale}`
        );
        
        if (response.ok) {
          this.quiz = await response.json();
          this.render();
          
          // Track load event
          if (window.gtag) {
            window.gtag('event', 'tq_load', { source: 'embed' });
          }
        } else {
          this.renderError('Quiz not available today');
        }
      } catch (error) {
        console.error('Failed to load quiz:', error);
        this.renderError('Failed to load quiz');
      }
    }

    render() {
      if (!this.quiz) {
        this.container.innerHTML = `
          <div class="md-trial-quiz">
            <div class="md-quiz-header">
              <h2 class="md-quiz-title">Daily Brain Challenge</h2>
              <p class="md-quiz-subtitle">Test your knowledge and earn points</p>
            </div>
            <div class="md-quiz-loading">
              <div class="md-quiz-spinner"></div>
              <p>Loading today's quiz...</p>
            </div>
          </div>
        `;
        return;
      }

      if (this.showResults) {
        this.renderResults();
        return;
      }

      const question = this.quiz.questions[this.currentQuestion];
      const progress = ((this.currentQuestion + 1) / this.quiz.questions.length) * 100;

      this.container.innerHTML = `
        <div class="md-trial-quiz">
          <div class="md-quiz-header">
            <h2 class="md-quiz-title">${this.quiz.title}</h2>
            <p class="md-quiz-subtitle">Question ${this.currentQuestion + 1} of ${this.quiz.questions.length}</p>
          </div>
          
          <div class="md-quiz-content">
            <div class="md-quiz-progress">
              <div class="md-quiz-progress-bar" style="width: ${progress}%"></div>
            </div>
            
            <div class="md-quiz-question">
              <h3>${question.question}</h3>
              <div class="md-quiz-options">
                ${question.options.map((option, index) => `
                  <div class="md-quiz-option ${this.answers[this.currentQuestion] === index ? 'selected' : ''}" 
                       onclick="window.mdTrialQuizWidgets[${this.getId()}].selectAnswer(${index})">
                    ${option}
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="md-quiz-nav">
              <div class="md-quiz-info">
                <span>⏰ ~2 min remaining</span>
              </div>
              <button class="md-quiz-btn" 
                      onclick="window.mdTrialQuizWidgets[${this.getId()}].nextQuestion()"
                      ${this.answers[this.currentQuestion] === undefined ? 'disabled' : ''}>
                ${this.currentQuestion === this.quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    renderResults() {
      const correctCount = this.calculateCorrectCount();
      const totalQuestions = this.quiz.questions.length;
      const scorePercent = Math.round((correctCount / totalQuestions) * 100);
      
      this.container.innerHTML = `
        <div class="md-trial-quiz">
          <div class="md-quiz-header">
            <h2 class="md-quiz-title">Quiz Complete!</h2>
            <p class="md-quiz-subtitle">Great job on today's challenge</p>
          </div>
          
          <div class="md-quiz-content">
            <div class="md-quiz-results">
              <div class="md-quiz-score">${scorePercent}%</div>
              <p>You got <strong>${correctCount}</strong> out of <strong>${totalQuestions}</strong> questions correct</p>
              
              <div class="md-quiz-cta">
                <h4>🎉 Save Your Progress!</h4>
                <p>Sign up to preserve your ${correctCount * 5} points and unlock all games</p>
                <a href="${WIDGET_CONFIG.apiBaseUrl}/account" class="md-quiz-btn" target="_parent">
                  Start Free Trial
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      // Track completion
      if (window.gtag) {
        window.gtag('event', 'tq_complete', {
          source: 'embed',
          score: scorePercent,
          correct_count: correctCount
        });
      }
    }

    renderError(message) {
      this.container.innerHTML = `
        <div class="md-trial-quiz">
          <div class="md-quiz-header">
            <h2 class="md-quiz-title">Daily Brain Challenge</h2>
            <p class="md-quiz-subtitle">Come back tomorrow for a new quiz!</p>
          </div>
          <div class="md-quiz-content">
            <div class="md-quiz-loading">
              <p style="color: #ef4444;">${message}</p>
              <a href="${WIDGET_CONFIG.apiBaseUrl}" class="md-quiz-btn" target="_parent">
                Visit Full Site
              </a>
            </div>
          </div>
        </div>
      `;
    }

    selectAnswer(answerIndex) {
      this.answers[this.currentQuestion] = answerIndex;
      this.render();
    }

    nextQuestion() {
      if (this.answers[this.currentQuestion] === undefined) return;

      if (this.currentQuestion < this.quiz.questions.length - 1) {
        this.currentQuestion++;
        this.render();
      } else {
        this.showResults = true;
        this.render();
      }
    }

    calculateCorrectCount() {
      return this.quiz.questions.reduce((count, question, index) => {
        return count + (this.answers[index] === question.correct ? 1 : 0);
      }, 0);
    }

    getId() {
      if (!this._id) {
        this._id = Date.now() + Math.random();
      }
      return this._id;
    }
  }

  // Global widget registry
  window.mdTrialQuizWidgets = window.mdTrialQuizWidgets || {};

  // Main API
  window.MDTrialQuiz = {
    mount: function(selector, options) {
      const container = typeof selector === 'string' 
        ? document.querySelector(selector) 
        : selector;
        
      if (!container) {
        console.error('MDTrialQuiz: Container not found:', selector);
        return;
      }

      const widget = new TrialQuizWidget(container, options);
      window.mdTrialQuizWidgets[widget.getId()] = widget;
      return widget;
    },
    
    version: WIDGET_CONFIG.version
  };

})();