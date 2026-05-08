'use client';
import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Bot, X, Send, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMsg,
        config: {
          systemInstruction: 'You are RecruitAI assistant. You help recruiters and hiring managers streamline the process of finding the right candidates. Answer questions and give advice based on their queries. Keep answers concise.',
        }
      });

      if (response.text) {
        setMessages(prev => [...prev, { role: 'bot', text: response.text as string }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: 'I could not generate a response. Please try again.' }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I encountered an error. Make sure your API key is configured properly.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl flex items-center justify-center p-0 z-50 bg-primary hover:bg-primary/90 transition-transform hover:scale-105"
        >
          <Bot className="h-6 w-6 text-primary-foreground" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] max-h-[80vh] flex flex-col bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl z-50 overflow-hidden transform transition-all duration-300 ease-out translate-y-0 opacity-100">
          {/* Header */}
          <div className="flex justify-between items-center bg-primary text-primary-foreground p-4 shadow-sm z-10">
            <div className="flex items-center space-x-2">
              <div className="bg-primary-foreground/20 p-2 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium leading-none">RecruitAI Assistant</h3>
                <p className="text-xs text-primary-foreground/80 mt-1">Powered by Gemini</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-muted/30" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <Bot className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Ask me anything about recruiting!</p>
                <p className="text-xs text-muted-foreground/80 max-w-[200px]">e.g., "Give me 5 interview questions for a React developer."</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words", msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card text-card-foreground border rounded-tl-sm")}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start w-full">
                    <div className="bg-card text-card-foreground border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-background border-t">
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me a question..."
                className="flex h-12 w-full rounded-full border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-12 focus:border-primary/50"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isLoading}
                className="absolute right-1 top-1 bottom-1 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all border border-transparent flex items-center justify-center p-0 m-0"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
