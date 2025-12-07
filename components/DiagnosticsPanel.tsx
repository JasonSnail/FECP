
import React, { useState, useRef, useEffect } from 'react';
import { MOCK_LOGS, MOCK_FOUPS } from '../constants';
import { analyzeSystemState } from '../services/geminiService';
import { ChatMessage, DiagnosticLog, Machine } from '../types';
import { IconBot, IconDatabase } from './Icons';

interface DiagnosticsPanelProps {
    selectedMachine: Machine;
}

const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ selectedMachine }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter logs for selected machine
  const activeLogs = MOCK_LOGS.filter(l => l.machineId === selectedMachine.id);
  const activeFoups = MOCK_FOUPS.filter(f => f.machineId === selectedMachine.id);

  // Initialize chat when machine changes
  useEffect(() => {
    setMessages([
        { 
            id: 'init', 
            role: 'model', 
            content: `FECP Agent initialized for ${selectedMachine.name} (${selectedMachine.model}).\nStatus: ${selectedMachine.state}\nActive logs: ${activeLogs.length}\n\nHow can I help you with this machine?`, 
            timestamp: new Date() 
        }
    ]);
  }, [selectedMachine.id]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Call Gemini API (simulated via service)
    // We pass filtered logs and foups relevant to the selected machine
    const responseText = await analyzeSystemState(userMsg.content, activeLogs, activeFoups);

    const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left: Chat Interface */}
      <div className="flex-1 flex flex-col bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-3 bg-slate-900 border-b border-slate-700 flex items-center space-x-2">
            <IconBot className="text-teal-400 w-5 h-5" />
            <h3 className="font-semibold text-white text-sm">Agent Copilot - {selectedMachine.name}</h3>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm leading-relaxed ${
                        msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-700 text-slate-100 border border-slate-600'
                    }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-[10px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                            {msg.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-700 rounded-lg p-3 text-sm text-slate-300 border border-slate-600 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-slate-900 border-t border-slate-700">
            <div className="relative">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask about ${selectedMachine.name}...`}
                    className="w-full bg-slate-800 text-white rounded-md border border-slate-600 pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-12"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading}
                    className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>
        </div>
      </div>

      {/* Right: Live Log Stream */}
      <div className="w-1/3 bg-slate-900 rounded-lg border border-slate-700 flex flex-col hidden md:flex">
         <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center space-x-2">
            <IconDatabase className="text-amber-400 w-4 h-4" />
            <h3 className="font-semibold text-white text-sm">System Events ({selectedMachine.name})</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-0">
            {activeLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No recent logs found for this machine.</div>
            ) : (
                <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 font-medium bg-slate-800/50 sticky top-0">
                        <tr>
                            <th className="px-3 py-2">Time</th>
                            <th className="px-3 py-2">Level</th>
                            <th className="px-3 py-2">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {activeLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/30 transition">
                                <td className="px-3 py-2 text-slate-400 font-mono whitespace-nowrap">{log.timestamp}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        log.level === 'INFO' ? 'bg-blue-500/10 text-blue-400' :
                                        log.level === 'WARN' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-red-500/10 text-red-400'
                                    }`}>
                                        {log.level}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-slate-300">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
