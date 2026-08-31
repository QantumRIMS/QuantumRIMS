'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'model'
  text: string
}

export default function ChatWidget({ endpoint, title = 'AI Assistant' }: { endpoint: string, title?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // We only send the previous history, not including the current user message being sent
    // Actually, our API takes { message, history }, so we pass the current history
    const currentHistory = [...messages]
    
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMessage, history: currentHistory })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setMessages(prev => [...prev, { role: 'model', text: data.reply }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-50 flex items-center justify-center"
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50" style={{ height: '500px', maxHeight: '80vh' }}>
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-2xl">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare size={18} />
              {title}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-indigo-200 transition">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 rounded-b-2xl">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-full px-4 py-2 text-sm outline-none transition-all text-gray-800"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
