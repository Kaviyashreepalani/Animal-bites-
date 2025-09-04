import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  ClipboardList, 
  MessageCircle, 
  Plus, 
  Activity, 
  TrendingUp, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  User,
  Calendar,
  Clock,
  Edit,
  BookOpen,
  X,
  Send
} from 'lucide-react'

// Helper function to get current date
const getCurrentDate = () => {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return timestamp || 'N/A'
  }
}

// Sidebar Component
const Sidebar = ({ activeSection, setActiveSection, stats }) => {
  const menuItems = [
    {
      id: 'unanswered',
      label: 'Unanswered Questions',
      icon: ClipboardList,
      count: stats?.pending_questions || 0,
      color: 'red'
    },
    {
      id: 'queries',
      label: 'User Queries',
      icon: MessageCircle,
      count: stats?.total_queries || 0,
      color: 'blue'
    },
    {
      id: 'add-qa',
      label: 'Add Q&A',
      icon: Plus,
      color: 'green'
    },
    {
      id: 'solved-questions',
      label: 'Questions Solved',
      icon: BookOpen,
      color: 'purple'
    }
  ]

  const getCountBadge = (count, color) => {
    if (!count) return null
    
    const colorClasses = {
      red: 'bg-red-100 text-red-600 border-red-200',
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      green: 'bg-green-100 text-green-600 border-green-200',
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
    }

    return (
      <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold border ${colorClasses[color]}`}>
        {count}
      </span>
    )
  }

  return (
    <div className="w-80 bg-white/90 backdrop-blur-md border-r border-slate-200/60 shadow-xl">
      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-slate-200/60">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              MediDash
            </h2>
            <p className="text-sm text-slate-500 font-medium">Animal Bite Console</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6 space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-700">{stats?.resolved_today || 0}</p>
              <p className="text-sm text-green-600 font-medium">Resolved Today</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center px-6 py-4">
                <div className={`p-2 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-white/20' 
                    : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <Icon className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`} />
                </div>
                <span className="ml-4 font-medium text-base">
                  {item.label}
                </span>
                {getCountBadge(item.count, item.color)}
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-transparent" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-white">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
            <div>
              <p className="font-medium text-sm">System Status</p>
              <p className="text-xs text-slate-300">All services operational</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal Component for editing questions
const EditModal = ({ isOpen, onClose, question, onSave, loading }) => {
  const [editedQuestion, setEditedQuestion] = useState('')
  const [editedAnswer, setEditedAnswer] = useState('')

  useEffect(() => {
    if (question) {
      setEditedQuestion(question.question || '')
      setEditedAnswer(question.answer || '')
    }
  }, [question])

  const handleSave = () => {
    onSave(question.id, editedQuestion.trim(), editedAnswer.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Edit className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Edit Question & Answer</h3>
              <p className="text-slate-600">Modify the question and answer pair</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Question Field */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold text-slate-700">
                Question
              </label>
              <textarea
                value={editedQuestion}
                onChange={(e) => setEditedQuestion(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 placeholder-slate-400 text-slate-700"
                rows="4"
                placeholder="Enter the question..."
              />
            </div>

            {/* Answer Field */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold text-slate-700">
                Answer
              </label>
              <textarea
                value={editedAnswer}
                onChange={(e) => setEditedAnswer(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 placeholder-slate-400 text-slate-700"
                rows="8"
                placeholder="Enter the answer..."
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 rounded-2xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !editedQuestion.trim() || !editedAnswer.trim()}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-400 text-white rounded-2xl font-medium shadow-lg transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// UnansweredQuestions Component
const UnansweredQuestions = ({ onRefreshNeeded }) => {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submittingAnswer, setSubmittingAnswer] = useState({})
  const [answers, setAnswers] = useState({})

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('http://localhost:5000/api/dashboard/unanswered-questions')
      
      if (response.data.success) {
        const fetchedQuestions = response.data.unanswered_questions || []
        // Filter out casual conversations and questions that were forwarded to doctor
        const filteredQuestions = fetchedQuestions.filter(q => 
          !q.question.includes("doctor has been notified")
        )
        setQuestions(filteredQuestions)
      } else {
        setError('Failed to fetch unanswered questions')
      }
    } catch (err) {
      console.error('Error fetching unanswered questions:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleAnswerSubmit = async (question) => {
    const answer = answers[question]?.trim()
    if (!answer) {
      alert('Please enter an answer')
      return
    }

    try {
      setSubmittingAnswer(prev => ({ ...prev, [question]: true }))
      
      const response = await axios.post('http://localhost:5000/api/dashboard/submit-answer', {
        question,
        answer
      })

      if (response.data.success) {
        alert('✅ Answer submitted successfully!')
        setAnswers(prev => ({ ...prev, [question]: '' }))
        await fetchQuestions()
        onRefreshNeeded()
      } else {
        alert('❌ Failed to submit answer: ' + response.data.error)
      }
    } catch (err) {
      console.error('Error submitting answer:', err)
      alert('❌ Failed to submit answer')
    } finally {
      setSubmittingAnswer(prev => ({ ...prev, [question]: false }))
    }
  }

  const handleAnswerChange = (question, value) => {
    setAnswers(prev => ({ ...prev, [question]: value }))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-slate-600">Loading unanswered questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Questions</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchQuestions}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-700 mb-2">All Caught Up!</h3>
        <p className="text-green-600">No unanswered questions at the moment.</p>
        <button
          onClick={fetchQuestions}
          className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Unanswered Questions</h2>
          <p className="text-slate-600">Questions waiting for your expert response</p>
        </div>
        <button
          onClick={fetchQuestions}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Questions List */}
      <div className="max-h-[70vh] overflow-y-auto border rounded-2xl p-4">
        <div className="grid gap-6">
          {questions.map((questionObj, index) => {
            const question = questionObj.question
            const timestamp = questionObj.timestamp
            const isSubmitting = submittingAnswer[question]

            return (
              <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">Question #{index + 1}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimestamp(timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
                    Pending
                  </span>
                </div>

                {/* Question Content */}
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-slate-700 leading-relaxed">{question}</p>
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Your Answer
                  </label>
                  <textarea
                    value={answers[question] || ''}
                    onChange={(e) => handleAnswerChange(question, e.target.value)}
                    placeholder="Type your detailed answer here..."
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                    rows="4"
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAnswerSubmit(question)}
                      disabled={isSubmitting || !answers[question]?.trim()}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-400 text-white rounded-xl font-medium shadow-lg transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Submit Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// UserQueries Component
const UserQueries = () => {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchQueries = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('http://localhost:5000/api/dashboard/user-queries')
      
      if (response.data.success) {
        setQueries(response.data.user_queries || [])
      } else {
        setError('Failed to fetch user queries')
      }
    } catch (err) {
      console.error('Error fetching user queries:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueries()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-slate-600">Loading user queries...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Queries</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchQueries}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Queries</h2>
          <p className="text-slate-600">Recent conversations and interactions</p>
        </div>
        <button
          onClick={fetchQueries}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Scrollable Queries Container */}
      {queries.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center min-h-[300px]">
          <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Queries Found</h3>
          <p className="text-slate-500">No user queries available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 min-h-[300px] max-h-[70vh] overflow-y-auto border rounded-2xl p-4">
          {queries.map((query, index) => (
            <div key={query.id || index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              {/* Query Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimestamp(query.timestamp)}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  query.status === 'answered' ? 'bg-green-100 text-green-700' :
                  query.status === 'answered_by_doctor' ? 'bg-blue-100 text-blue-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {query.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
                </span>
              </div>

              {/* Question */}
              <div className="mb-4">
                <h4 className="font-medium text-slate-800 mb-2">Question:</h4>
                <p className="text-slate-600 bg-slate-50 rounded-lg p-3">{query.question}</p>
              </div>

              {/* Answer */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Answer:</h4>
                <p className="text-slate-600 bg-blue-50 rounded-lg p-3">{query.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// AddQA Component
const AddQA = ({ onRefreshNeeded }) => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!question.trim() || !answer.trim()) {
      alert('Please fill in both question and answer')
      return
    }

    try {
      setLoading(true)
      
      const response = await axios.post('http://localhost:5000/api/dashboard/add-qa', {
        question: question.trim(),
        answer: answer.trim()
      })

      if (response.data.success) {
        alert('✅ Question and answer added successfully!')
        setQuestion('')
        setAnswer('')
        onRefreshNeeded()
      } else {
        alert('❌ Failed to add Q&A: ' + response.data.error)
      }
    } catch (err) {
      console.error('Error adding Q&A:', err)
      alert('❌ Failed to add Q&A')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-h-[80vh] overflow-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Add New Q&A</h2>
        <p className="text-slate-600">Create new question-answer pairs for the chatbot knowledge base</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Input */}
          <div className="space-y-3">
            <label htmlFor="question" className="block text-lg font-semibold text-slate-700">
              Question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter the question that users might ask..."
              className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 placeholder-slate-400"
              rows="4"
              disabled={loading}
            />
          </div>

          {/* Answer Input */}
          <div className="space-y-3">
            <label htmlFor="answer" className="block text-lg font-semibold text-slate-700">
              Answer
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the detailed answer..."
              className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 placeholder-slate-400"
              rows="8"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !question.trim() || !answer.trim()}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-400 text-white rounded-2xl font-medium shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span>Add Q&A</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// SolvedQuestions Component
const SolvedQuestions = ({ onRefreshNeeded }) => {
  const [solvedQuestions, setSolvedQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState({ isOpen: false, question: null })
  const [actionLoading, setActionLoading] = useState({})

  const fetchSolvedQuestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('http://localhost:5000/api/dashboard/solved-questions')

      if (response.data.success) {
        setSolvedQuestions(response.data.solved_questions || [])
      } else {
        setError('Failed to fetch solved questions')
      }
    } catch (err) {
      console.error('Error fetching solved questions:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSolvedQuestions()
  }, [])

  const handleEdit = (question) => {
    setEditModal({ isOpen: true, question })
  }

  const handleSave = async (id, question, answer) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }))
      
      const response = await axios.post('http://localhost:5000/api/dashboard/update-solved-question', {
        id,
        question,
        answer
      })

      if (response.data.success) {
        await fetchSolvedQuestions()
        setEditModal({ isOpen: false, question: null })
        onRefreshNeeded()
        alert('✅ Question updated successfully!')
      } else {
        alert('❌ Failed to update question: ' + response.data.error)
      }
    } catch (err) {
      console.error('Error updating question:', err)
      alert('❌ Failed to update question')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id, question) => {
    if (!confirm(`Are you sure you want to delete this question?\n\n"${question}"`)) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, [id]: true }))
      
      const response = await axios.post('http://localhost:5000/api/dashboard/delete-solved-question', {
        id
      })

      if (response.data.success) {
        await fetchSolvedQuestions()
        onRefreshNeeded()
        alert('✅ Question deleted successfully!')
      } else {
        alert('❌ Failed to delete question: ' + response.data.error)
      }
    } catch (err) {
      console.error('Error deleting question:', err)
      alert('❌ Failed to delete question')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-slate-600">Loading solved questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Questions</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchSolvedQuestions}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Questions Solved</h2>
          <p className="text-slate-600">Manage all resolved question-answer pairs</p>
        </div>
        <button
          onClick={fetchSolvedQuestions}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Questions List */}
      {solvedQuestions.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Solved Questions</h3>
          <p className="text-slate-500">No solved questions available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {solvedQuestions.map((question, index) => {
            const isLoading = actionLoading[question.id]

            return (
              <div key={question.id || index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">Solved Question #{index + 1}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimestamp(question.timestamp)}</span>
                        {question.source && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{question.source.replace(/_/g, ' ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(question)}
                      disabled={isLoading}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id, question.question)}
                      disabled={isLoading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Question Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Question:</h4>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-slate-700 leading-relaxed">{question.question}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Answer:</h4>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-slate-700 leading-relaxed">{question.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      <EditModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, question: null })}
        question={editModal.question}
        onSave={handleSave}
        loading={editModal.question ? actionLoading[editModal.question.id] : false}
      />
    </div>
  )
}

// Main Dashboard Component
const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('unanswered')
  const [stats, setStats] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/dashboard/stats')
      if (response.data.success) {
        setStats(response.data.stats)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleRefreshNeeded = () => {
    setRefreshKey(prev => prev + 1)
    fetchStats()
  }

  useEffect(() => {
    fetchStats()
  }, [refreshKey])

  const renderContent = () => {
    switch (activeSection) {
      case 'unanswered':
        return <UnansweredQuestions key={refreshKey} onRefreshNeeded={handleRefreshNeeded} />
      case 'queries':
        return <UserQueries key={refreshKey} />
      case 'add-qa':
        return <AddQA key={refreshKey} onRefreshNeeded={handleRefreshNeeded} />
      case 'solved-questions':
        return <SolvedQuestions key={refreshKey} onRefreshNeeded={handleRefreshNeeded} />
      default:
        return <UnansweredQuestions key={refreshKey} onRefreshNeeded={handleRefreshNeeded} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex h-screen">
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
          stats={stats}
        />
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  Medical Dashboard
                </h1>
                <p className="text-slate-600 mt-1">{getCurrentDate()}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-medium text-sm">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}



export default Dashboard