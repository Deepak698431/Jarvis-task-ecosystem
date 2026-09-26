"use client";
import React, { useState, useEffect, useRef } from 'react';

// Strict 3-Tier Sorting (Date -> Start Time -> End Time)
const sortTasks = (taskList: any[]) => {
  return [...taskList].sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const startA = a.start_time || 0;
    const startB = b.start_time || 0;
    if (startA !== startB) {
      return startA - startB;
    }
    const endA = a.end_time || 0;
    const endB = b.end_time || 0;
    return endA - endB;
  });
};

export default function ClientDashboard({ initialTasks }: { initialTasks: any[] }) {
  // --- AUTH STATES ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  // --- TASK STATES ---
  const [tasks, setTasks] = useState(() => sortTasks(initialTasks || []));
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    priority: 'P3'
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const aiInputRef = useRef<HTMLInputElement>(null);

  // --- AUTHENTICATION & INITIALIZATION ---

  useEffect(() => {
    const savedUser = localStorage.getItem('jarvis_user');
    const savedPass = localStorage.getItem('jarvis_pass');

    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
      setIsAuthorized(true);
      fetchUserTasks(savedUser, savedPass);
    } else {
      setAuthLoading(false);
    }
  }, []);

  const fetchUserTasks = async (user: string, pass: string) => {
    try {
      const res = await fetch('/api/Tasks', {
        headers: {
          'x-username': user,
          'x-app-password': pass
        }
      });
      if (res.ok) {
        const json = await res.json();
        setTasks(sortTasks(json.data || []));
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setLoginError("Please enter both Operator Name and System Passcode.");
      return;
    }

    try {
      const res = await fetch('/api/Tasks', {
        headers: {
          'x-username': cleanUser,
          'x-app-password': cleanPass
        }
      });

      if (res.ok) {
        localStorage.setItem('jarvis_user', cleanUser);
        localStorage.setItem('jarvis_pass', cleanPass);
        setIsAuthorized(true);
        const json = await res.json();
        setTasks(sortTasks(json.data || []));
      } else if (res.status === 401) {
        setLoginError("Invalid System Passcode.");
      } else {
        setLoginError("Connection failed. Check network or server status.");
      }
    } catch (err) {
      setLoginError("Network error. Could not reach server.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jarvis_user');
    localStorage.removeItem('jarvis_pass');
    setUsername("");
    setPassword("");
    setTasks([]);
    setIsAuthorized(false);
  };

  // --- TIME FORMATTERS ---

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "--:--";
    const d = new Date(timestamp * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const unixToInputTime = (timestamp: number) => {
    if (!timestamp) return "09:00";
    const d = new Date(timestamp * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const timeToUnix = (timeStr: string, dateStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const [year, month, day] = dateStr.split('-');
    
    const d = new Date();
    d.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return Math.floor(d.getTime() / 1000);
  };

  // --- STRICT CRUD OPERATIONS (WITH AUTH HEADERS) ---

  const toggleTaskComplete = async (taskId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const previousTasks = [...tasks];
    
    setTasks(prev => sortTasks(prev.map(t => t.id === taskId ? { ...t, isCompleted: newStatus } : t)));
    
    try {
      const res = await fetch('/api/Tasks', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-username': username,
          'x-app-password': password 
        },
        body: JSON.stringify({ id: taskId, isCompleted: newStatus }) 
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
    } catch (err: any) {
      alert("Failed to update task: " + err.message);
      setTasks(previousTasks); 
    }
  };

  const deleteTask = async (taskId: number) => {
    const previousTasks = [...tasks];
    setTasks(prev => sortTasks(prev.filter(t => t.id !== taskId))); 
    
    try {
      const res = await fetch(`/api/Tasks?id=${taskId}`, { 
        method: 'DELETE',
        headers: {
          'x-username': username,
          'x-app-password': password
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
      setTasks(previousTasks); 
    }
  };

  const openCreateModal = () => {
    setEditingTaskId(null);
    setFormData({ 
      description: '', 
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00', 
      end_time: '10:00', 
      priority: 'P3' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: any) => {
    setEditingTaskId(task.id);
    let taskDate = task.date;
    if (!taskDate && task.start_time) {
      const d = new Date(task.start_time * 1000);
      taskDate = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    }

    setFormData({
      description: task.description,
      date: taskDate || new Date().toISOString().split('T')[0],
      start_time: unixToInputTime(task.start_time),
      end_time: unixToInputTime(task.end_time),
      priority: task.priority || 'P3'
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formData.description.trim()) return;
    setIsSubmitting(true);

    const start_time_unix = timeToUnix(formData.start_time, formData.date);
    const end_time_unix = timeToUnix(formData.end_time, formData.date);

    if (editingTaskId) {
      const previousTasks = [...tasks];
      setTasks(prev => sortTasks(prev.map(t => t.id === editingTaskId ? {
        ...t,
        description: formData.description,
        date: formData.date,
        start_time: start_time_unix,
        end_time: end_time_unix,
        priority: formData.priority
      } : t)));

      try {
        const res = await fetch('/api/Tasks', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-username': username,
            'x-app-password': password 
          },
          body: JSON.stringify({
            id: editingTaskId,
            description: formData.description,
            date: formData.date,
            start_time: start_time_unix,
            end_time: end_time_unix,
            priority: formData.priority
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);
      } catch (err: any) {
        alert("Failed to edit task: " + err.message);
        setTasks(previousTasks);
      }
    } else {
      const customNumericId = Date.now(); 
      const newTask = {
        id: customNumericId,
        description: formData.description,
        priority: formData.priority,
        date: formData.date,
        start_time: start_time_unix,
        end_time: end_time_unix,
        isCompleted: false
      };

      try {
        const res = await fetch('/api/Tasks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-username': username,
            'x-app-password': password 
          },
          body: JSON.stringify(newTask)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);
        setTasks(prev => sortTasks([...prev, newTask]));
      } catch (error: any) {
        alert("Could not save task: " + error.message);
      }
    }

    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  // --- GEMINI J.A.R.V.I.S. HYBRID PIPELINE ---

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition && window.isSecureContext) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      setAiStatus("🎙️ Listening... Speak your task now.");
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiPrompt((prev) => prev ? prev + " " + transcript : transcript);
        setAiStatus("Dictation captured. Press send!");
      };

      recognition.onerror = () => {
        if (aiInputRef.current) aiInputRef.current.focus();
        setAiStatus("Mic access denied. Use your keyboard mic instead.");
      };
    } else {
      if (aiInputRef.current) {
        aiInputRef.current.focus();
      }
      setAiStatus("Dictation ready: Tap the Mic on your keyboard.");
    }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiProcessing) return;

    setIsAiProcessing(true);
    setAiStatus("Parsing schedule with Gemini...");

    try {
      const todayString = new Date().toISOString().split('T')[0];

      // Assuming /api/ai also needs auth headers to process the request
      const aiResponse = await fetch('/api/ai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-username': username,
          'x-app-password': password 
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentDate: todayString
        })
      });

      const aiJson = await aiResponse.json();
      if (!aiResponse.ok || !aiJson.success) {
        throw new Error(aiJson.error || "AI could not process request");
      }

      const aiData = aiJson.data;
      const parsedDateStr = aiData.date || todayString;

      const [year, month, day] = parsedDateStr.split('-');
      
      const startDateObj = new Date();
      startDateObj.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      startDateObj.setHours(aiData.start_h ?? 9, aiData.start_m ?? 0, 0, 0);
      const start_unix = Math.floor(startDateObj.getTime() / 1000);

      const endDateObj = new Date();
      endDateObj.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      endDateObj.setHours(aiData.end_h ?? 10, aiData.end_m ?? 0, 0, 0);
      const end_unix = Math.floor(endDateObj.getTime() / 1000);

      const newTask = {
        id: Date.now(),
        description: aiData.description,
        priority: aiData.priority || "P3",
        date: parsedDateStr,
        start_time: start_unix,
        end_time: end_unix,
        isCompleted: false
      };

      setAiStatus("Saving task to schedule...");

      const taskRes = await fetch('/api/Tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-username': username,
          'x-app-password': password 
        },
        body: JSON.stringify(newTask)
      });

      const taskJson = await taskRes.json();
      if (!taskRes.ok || !taskJson.success) {
        throw new Error(taskJson.error || "Failed saving to database");
      }

      setTasks(prev => sortTasks([...prev, newTask]));
      setAiStatus(`Added: "${newTask.description}" for ${parsedDateStr}`);
      setAiPrompt('');

      setTimeout(() => {
        setIsAiModalOpen(false);
        setAiStatus(null);
      }, 1400);

    } catch (err: any) {
      setAiStatus(`Error: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- RENDER BLOCK ---

  if (authLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-950">
        <div className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">Initializing Uplink...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="relative h-[100dvh] w-full bg-gray-950 text-white font-sans overflow-hidden flex flex-col items-center justify-center p-4">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none -translate-x-1/4 -translate-y-1/4 z-0" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none translate-x-1/4 translate-y-1/4 z-0" />

        <div className="relative z-10 w-full max-w-sm bg-gray-900/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">J.A.R.V.I.S. Gateway</h1>
          <p className="text-xs text-center text-white/40 mb-8 uppercase tracking-widest">Operator Authentication</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text"
                placeholder="Operator Name (e.g. Deepak)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors text-sm"
              />
            </div>
            <div>
              <input 
                type="password"
                placeholder="System Passcode"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors text-sm"
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 py-2 rounded-xl">
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full mt-2 bg-white text-black font-bold text-sm rounded-2xl py-3.5 active:scale-[0.98] transition-transform cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Establish Uplink
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-gray-950 text-white font-sans select-none overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-96 h-96 bg-lime-400/20 rounded-full blur-3xl pointer-events-none -translate-x-1/4 -translate-y-1/4 z-0" />
      <div className="absolute top-[30%] right-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none translate-x-1/4 z-0" />
      <div className="absolute bottom-0 left-[10%] w-80 h-80 bg-green-400/20 rounded-full blur-3xl pointer-events-none translate-y-1/4 z-0" />

      <header className="flex-none pt-12 landscape:pt-4 pb-3 landscape:pb-1 px-6 landscape:px-10 relative z-30 bg-gray-950/40 backdrop-blur-xl border-b border-white/10 transition-all flex justify-between items-end">
        <div>
          <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-1">Welcome back, {username}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Schedule</h1>
        </div>
        <button onClick={handleLogout} className="mb-1 text-[10px] font-bold tracking-widest uppercase text-white/40 hover:text-red-400 transition-colors cursor-pointer">
          Disconnect
        </button>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-auto px-6 landscape:px-10 pt-5 landscape:pt-4 pb-[140px] landscape:pb-[100px] relative z-10 transition-all">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-center opacity-60">
            <svg className="w-16 h-16 mb-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-lg font-medium tracking-wide">Your day is perfectly clear.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape:grid-cols-2 gap-4">
            {tasks.map((task) => {
              const isDone = task.isCompleted; 
              return (
                <div key={task.id} className={`relative overflow-hidden rounded-3xl p-5 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-xl transition-all duration-300 ease-out ${isDone ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                  <div className="relative z-10 flex items-start gap-4">
                    
                    <button onClick={() => toggleTaskComplete(task.id, isDone)} className="mt-1 w-6 h-6 rounded-full border-2 border-white/40 flex-shrink-0 flex items-center justify-center cursor-pointer active:bg-white/20 transition-all">
                      <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${isDone ? 'bg-white' : 'bg-transparent'}`} />
                    </button>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        
                        <div className="flex flex-col gap-0.5">
                          <span suppressHydrationWarning className={`text-[9px] font-black tracking-widest uppercase ${isDone ? 'text-white/30' : 'text-cyan-400/80'}`}>
                            {task.date}
                          </span>
                          <span suppressHydrationWarning className={`text-xs font-bold tracking-wider transition-colors ${isDone ? 'text-white/50' : 'text-white'}`}>
                            {formatTime(task.start_time)} - {formatTime(task.end_time)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] mr-1 font-black tracking-widest px-2.5 py-1 rounded-md bg-white/10 border border-white/10 transition-colors ${isDone ? 'text-gray-400' : (task.priority === 'P1' ? 'text-red-300' : task.priority === 'P2' ? 'text-yellow-300' : 'text-cyan-300')}`}>
                            {task.priority || "P3"}
                          </span>
                          
                          <button onClick={() => openEditModal(task)} className="p-1.5 text-white/40 hover:text-blue-400 active:scale-90 cursor-pointer transition-all">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>

                          <button onClick={() => deleteTask(task.id)} className="p-1.5 text-white/40 hover:text-red-400 active:scale-90 cursor-pointer transition-all">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      <p className={`font-medium text-[16px] leading-snug tracking-wide pr-2 transition-all mt-0.5 ${isDone ? 'text-white/40 line-through' : 'text-white'}`}>
                        {task.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <nav className="absolute bottom-0 w-full bg-gray-950/50 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] z-30 transition-all">
        <div className="flex justify-around items-center h-[88px] landscape:h-[72px] px-4 landscape:px-10">
          <button className="flex flex-col items-center justify-center w-16 h-16 active:opacity-50 transition-opacity text-white">
            <svg className="w-6 h-6 mb-1.5 landscape:mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <span className="text-[10px] font-bold tracking-wider">TASKS</span>
          </button>
          
          <button onClick={openCreateModal} className="flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full active:scale-90 transition-all duration-300 -translate-y-5 shadow-lg relative z-50 cursor-pointer">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          
          <button onClick={() => { setAiStatus(null); setIsAiModalOpen(true); }} className="flex flex-col items-center justify-center w-16 h-16 active:opacity-50 transition-opacity text-white/50 hover:text-cyan-400">
            <svg className="w-6 h-6 mb-1.5 landscape:mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
            <span className="text-[10px] font-bold tracking-wider">J.A.R.V.I.S.</span>
          </button>
        </div>
      </nav>

      {/* Manual Task Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900/95 backdrop-blur-3xl border border-white/20 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white">
                {editingTaskId ? "Edit Task" : "New Task"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-white/50 active:scale-90 bg-white/5 rounded-full cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-lime-400/50 transition-colors" placeholder="Task description..." />
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
                <div className="flex justify-between items-center px-4 py-3">
                  <label className="text-[13px] font-semibold text-white/70 tracking-wide">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-white/10 rounded-lg px-3 py-1.5 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-lime-400/50 [color-scheme:dark]" />
                </div>

                <div className="flex justify-between items-center px-4 py-3">
                  <label className="text-[13px] font-semibold text-white/70 tracking-wide">Start</label>
                  <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="bg-white/10 rounded-lg px-3 py-1.5 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-lime-400/50 [color-scheme:dark]" />
                </div>
                
                <div className="flex justify-between items-center px-4 py-3">
                  <label className="text-[13px] font-semibold text-white/70 tracking-wide">End</label>
                  <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="bg-white/10 rounded-lg px-3 py-1.5 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-lime-400/50 [color-scheme:dark]" />
                </div>

                <div className="flex justify-between items-center px-4 py-3">
                  <label className="text-[13px] font-semibold text-white/70 tracking-wide">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="bg-white/10 rounded-lg px-3 py-1.5 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-lime-400/50 appearance-none text-right">
                    <option value="P1" className="bg-gray-900 text-red-400">P1 - High</option>
                    <option value="P2" className="bg-gray-900 text-yellow-400">P2 - Medium</option>
                    <option value="P3" className="bg-gray-900 text-cyan-400">P3 - Low</option>
                  </select>
                </div>
              </div>

              <button onClick={handleSaveTask} disabled={isSubmitting || !formData.description.trim()} className="w-full mt-4 bg-white text-black font-bold text-lg rounded-2xl py-3.5 active:scale-[0.97] transition-transform disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {isSubmitting ? 'Saving...' : (editingTaskId ? 'Update Task' : 'Save Task')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* J.A.R.V.I.S. AI Modal */}
      {isAiModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900/95 backdrop-blur-3xl border border-cyan-500/30 rounded-[32px] p-6 shadow-2xl shadow-cyan-900/20 animate-in slide-in-from-bottom-8 fade-in duration-300">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                <h2 className="text-xl font-bold text-white tracking-wide">J.A.R.V.I.S. Core</h2>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="p-2 text-white/50 active:scale-90 bg-white/5 rounded-full cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-cyan-950/40 border border-cyan-500/20 rounded-2xl text-xs text-cyan-200/80 leading-relaxed font-mono min-h-[50px] flex items-center">
                {aiStatus || "Describe any task naturally (e.g., 'Study C++ graphs tomorrow from 5 to 7 PM as P1')."}
              </div>
              
              <div className="relative">
                <input 
                  ref={aiInputRef}
                  type="text" 
                  value={aiPrompt}
                  disabled={isAiProcessing}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-24 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors disabled:opacity-50 text-[15px]" 
                  placeholder="Ask J.A.R.V.I.S. to schedule..." 
                />
                
                <button 
                  onClick={handleMicClick}
                  disabled={isAiProcessing}
                  className="absolute right-12 top-2 p-2 text-cyan-400/60 hover:text-cyan-400 active:scale-90 transition-all disabled:opacity-30 cursor-pointer"
                  title="Use OS Dictation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <button 
                  onClick={handleAiSubmit}
                  disabled={isAiProcessing || !aiPrompt.trim()}
                  className="absolute right-2 top-2 p-2 bg-cyan-500/20 text-cyan-400 rounded-xl active:scale-90 transition-all hover:bg-cyan-500/30 disabled:opacity-30 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}