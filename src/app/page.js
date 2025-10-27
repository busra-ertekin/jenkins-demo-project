'use client'

import { useState } from 'react'

export default function Home() {
  const [count, setCount] = useState(0)
  const [todos, setTodos] = useState([
    { id: 1, text: 'Jenkins kurulumu yap', completed: true },
    { id: 2, text: 'Next.js projesi oluştur', completed: true },
    { id: 3, text: 'GitHub\'a push et', completed: false }
  ])
  const [newTodo, setNewTodo] = useState('')

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: newTodo,
        completed: false
      }])
      setNewTodo('')
    }
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-indigo-600">
            🚀 Jenkins Demo Project
          </h1>
          <p className="text-gray-600 mt-2">
            Next.js + Jenkins + Otomatik Versiyonlama
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📊 Sayaç
            </h2>
            <div className="text-center">
              <div className="text-6xl font-bold text-indigo-600 mb-8">
                {count}
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setCount(count - 1)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ➖ Azalt
                </button>
                <button
                  onClick={() => setCount(0)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  🔄 Sıfırla
                </button>
                <button
                  onClick={() => setCount(count + 1)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ➕ Artır
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              ✅ Yapılacaklar Listesiii
            </h2>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Yeni görev ekle..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addTodo}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Ekle
              </button>
            </div>

            <div className="space-y-3">
              {todos.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {todo.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {todos.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                Henüz görev yok. Yukarıdan ekleyebilirsin! 🎯
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="font-bold text-gray-800 mb-2">Next.js</h3>
            <p className="text-gray-600">Modern React framework ile geliştirildi</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="font-bold text-gray-800 mb-2">Jenkins</h3>
            <p className="text-gray-600">Otomatik build ve deployment</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-bold text-gray-800 mb-2">Versiyonlama</h3>
            <p className="text-gray-600">Her commit otomatik versiyon oluşturur</p>
          </div>
        </div>
      </main>

      <footer className="bg-white mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>Made with ❤️ by Busra Ertekin</p>
          <p className="text-sm mt-2">Jenkins Demo Project - 2024</p>
        </div>
      </footer>
    </div>
  )
}
