import React, { useState, useContext, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { AuthContext } from './context/AuthContext';
import backgroundImage from './assets/background.jpg'; 
import './App.css'; 
import { 
  Sparkles, Send, ChevronRight, Clock, BarChart3, LogOut, 
  Upload, Mic, MicOff, Menu, RefreshCcw, 
  Award, CheckCircle2, UserPlus, LogIn, XCircle, Trash2, Settings, Loader2, TrendingUp,
  BrainCircuit, MessageSquare, Play, Download, FileText
} from 'lucide-react';

import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// --- CRITICAL DYNAMIC URL CONFIG ---
const VERCEL_URL = import.meta.env.VITE_API_URL;
const API_URL = VERCEL_URL ? `${VERCEL_URL}/api/interview` : "http://localhost:5000/api/interview";
const AUTH_URL = VERCEL_URL ? `${VERCEL_URL}/api/auth` : "http://localhost:5000/api/auth";

function App() {
  const { token, logout, user, setToken, setUser } = useContext(AuthContext);
  
  const [view, setView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [numQuestions, setNumQuestions] = useState(10);
  const [topic, setTopic] = useState('');
  const [fileName, setFileName] = useState('');
  const [resumeText, setResumeText] = useState('');
  
  const [interviewId, setInterviewId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [history, setHistory] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const authHeader = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const downloadReport = () => {
    window.print();
  };

  const startSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      setUserAnswer(prev => prev + " " + event.results[0][0].transcript);
    };
    recognition.start();
  };

  useEffect(() => { 
    if (token) fetchStats(); 
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`, authHeader);
      setHistory(res.data);
    } catch (err) { console.error("Stats Fetch Error:", err); }
  };

  const startInterview = async (mode) => {
    const finalTopic = mode === 'resume' ? `RESUME_MODE: ${resumeText}` : topic;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/generate`, { topic: finalTopic, count: parseInt(numQuestions) }, authHeader);
      setQuestions(res.data.questions);
      setInterviewId(res.data.interviewId);
      setAnalysisData(res.data.analysis); 
      setCurrentStep(0);
      setEvaluation(null);
      setUserAnswer('');
      setView('interview');
      setShowAnalysis(true);
    } catch (err) { alert("Interview generation failed. Check backend connection."); }
    finally { setLoading(false); }
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const pdf = await pdfjsLib.getDocument(new Uint8Array(ev.target.result)).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(" ");
      }
      setResumeText(text);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/evaluate`, { interviewId, question: questions[currentStep], userAnswer }, authHeader);
      setEvaluation(res.data);
    } catch (err) { alert("Evaluation failed."); }
    finally { setLoading(false); }
  };

  const handleNext = () => {
    if (currentStep + 1 < questions.length) {
      setCurrentStep(s => s + 1);
      setEvaluation(null);
      setUserAnswer('');
    } else {
      setView('dashboard');
      fetchStats();
    }
  };

  const chartConfig = useMemo(() => {
    const last7 = [...history].reverse().slice(-7);
    return {
      labels: last7.map(h => new Date(h.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})),
      datasets: [{
        label: 'Performance',
        data: last7.map(h => {
          const s = h.results?.map(r => r.score) || [];
          return s.length ? (s.reduce((a,b)=>a+b,0)/s.length).toFixed(1) : 0;
        }),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderWidth: 2
      }]
    };
  }, [history]);

  const readinessScore = useMemo(() => {
    if (!history || history.length === 0) return 0;
    const allScores = history.flatMap(h => h.results?.map(r => r.score) || []);
    if (allScores.length === 0) return 0;
    const sum = allScores.reduce((a, b) => a + b, 0);
    return ((sum / allScores.length) * 10).toFixed(0);
  }, [history]);

  if (!token) {
    return (
      <AuthScreen 
        backgroundImage={backgroundImage} 
        AUTH_URL={AUTH_URL} 
        setToken={setToken} 
        setUser={setUser} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden print:h-auto print:overflow-visible">
      {/* Hidden Print Report */}
      <div className="hidden print:block print:p-10 print:w-full print:bg-white">
          <h1 className="text-3xl font-black mb-4">SmartPrep Assessment Report</h1>
          <p className="text-slate-500 mb-8 font-bold">Generated for: {user?.name} on {new Date().toLocaleDateString()}</p>
          <hr className="mb-8"/>
          <div className="mb-10">
              <h2 className="text-xl font-bold mb-4 uppercase text-indigo-600">Performance Summary</h2>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-4xl font-black">{readinessScore}% Readiness</p>
                  <p className="text-slate-500 mt-2 italic">Calculated across {history.length} practice sessions.</p>
              </div>
          </div>
          {analysisData && (
              <div className="space-y-6">
                  <h2 className="text-xl font-bold uppercase text-indigo-600">AI Skill Analysis</h2>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="font-bold mb-2">Detailed Summary:</p>
                      <p className="leading-relaxed">{analysisData.summary}</p>
                  </div>
              </div>
          )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[999] flex flex-col items-center justify-center print:hidden">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
            <Loader2 className="text-indigo-600 animate-spin mb-4" size={40} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Processing Request...</p>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-500 print:hidden ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen && <span className="font-extrabold text-2xl tracking-tighter text-slate-900">SmartPrep<span className="text-indigo-600">.</span></span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl bg-slate-50"><Menu size={20}/></button>
        </div>
        <nav className="flex-1 px-6 space-y-3 mt-4">
          <SidebarItem active={view === 'dashboard'} icon={<BarChart3 size={20}/>} label="Overview" onClick={() => setView('dashboard')} isOpen={isSidebarOpen}/>
          <SidebarItem active={view === 'history'} icon={<Clock size={20}/>} label="History" onClick={() => { setView('history'); fetchStats(); }} isOpen={isSidebarOpen}/>
          <SidebarItem active={view === 'settings'} icon={<Settings size={20}/>} label="Settings" onClick={() => setView('settings')} isOpen={isSidebarOpen}/>
        </nav>
        <div className="p-6 border-t border-slate-100">
          <button onClick={logout} className="w-full flex items-center gap-4 p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all font-bold text-sm">
            <LogOut size={20}/> {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 print:hidden">
        {view === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome, {user?.name?.split(' ')[0]}</h1>
                <p className="text-slate-500 font-medium mt-1">Ready to master your next technical interview?</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Growth Analytics</h3>
                     <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Live Data</div>
                  </div>
                  <div className="h-[250px]"><Line data={chartConfig} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 10, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} /></div>
               </div>
               
               <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <BrainCircuit size={48} className="text-indigo-400 mb-6 opacity-80"/>
                    <h3 className="text-indigo-200 font-bold uppercase text-[10px] tracking-[0.2em] mb-2">Readiness Score</h3>
                    <p className="text-6xl font-black italic">{readinessScore}<span className="text-2xl text-indigo-400">%</span></p>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full blur-[80px] opacity-20"></div>
                  <button onClick={() => setView('history')} className="relative z-10 w-full bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-xs font-bold transition-all backdrop-blur-sm">View Full Report</button>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Play size={20}/></div>
                    <h2 className="text-xl font-black text-slate-800">Start New Practice Session</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <label className="block">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Question Count: {numQuestions}</span>
                            <input type="range" min="5" max="30" step="5" value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg accent-indigo-600 mt-4"/>
                        </label>
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                            <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><Upload size={18} className="text-indigo-600"/> Interview via Resume</h3>
                            <input type="file" id="cv-upload" hidden onChange={onFileChange} accept=".pdf"/>
                            <div onClick={() => document.getElementById('cv-upload').click()} className="cursor-pointer py-4 px-6 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-400">
                                {fileName || "Click to upload PDF resume"}
                            </div>
                            {resumeText && <button onClick={() => startInterview('resume')} className="w-full mt-4 bg-indigo-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all">Scan & Start</button>}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                            <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><Sparkles size={18} className="text-emerald-500"/> Specific Topic Drill</h3>
                            <input type="text" placeholder="e.g. React, Python..." className="w-full p-4 rounded-xl border border-slate-200 text-sm font-medium outline-none mb-4" value={topic} onChange={(e) => setTopic(e.target.value)}/>
                            <button onClick={() => startInterview('topic')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Launch Drill</button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {view === 'interview' && (
          <div className="max-w-4xl mx-auto pb-20 animate-in slide-in-from-bottom-10 duration-500">
            {showAnalysis ? (
              <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl relative">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Skill Assessment</h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Personalized matching result</p>
                  </div>
                  <div className="w-24 h-24 rounded-full border-[8px] border-indigo-50 flex items-center justify-center">
                    <span className="text-2xl font-black text-indigo-600">{analysisData?.score || 0}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Strong Skills</h4>
                    {analysisData?.strengths?.map((s, i) => <div key={i} className="bg-emerald-50 p-4 rounded-2xl text-xs font-bold text-emerald-800 border border-emerald-100">{s}</div>)}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Potential Gaps</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisData?.missingKeywords?.map((k, i) => <span key={i} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black border border-rose-100 uppercase">{k}</span>)}
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-lg mb-10">
                   <p className="text-sm font-medium leading-relaxed italic opacity-90">"{analysisData?.summary}"</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowAnalysis(false)} className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all">Begin Simulation</button>
                    <button onClick={downloadReport} className="bg-indigo-50 text-indigo-600 p-6 rounded-3xl hover:bg-indigo-100 transition-all"><Download/></button>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                  <div className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Stage {currentStep + 1} of {questions.length}</div>
                  <button onClick={() => setView('dashboard')} className="text-slate-400 font-bold text-xs uppercase hover:text-rose-500 transition-all flex items-center gap-2"><XCircle size={18}/> Cancel</button>
                </div>
                <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-900 mb-10 leading-tight">{questions[currentStep]}</h2>
                  {!evaluation ? (
                    <div className="space-y-6">
                      <div className="relative">
                        <textarea className="w-full p-8 bg-slate-50 border-2 border-transparent rounded-[2.5rem] h-64 font-medium text-slate-700 outline-none focus:border-indigo-100 transition-all resize-none" placeholder="Type or speak response..." value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} />
                        <button onClick={startSpeech} className={`absolute bottom-6 right-6 p-4 rounded-2xl ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-indigo-600'}`}>
                          {isListening ? <Mic size={24}/> : <MicOff size={24}/>}
                        </button>
                      </div>
                      <button onClick={handleEvaluate} disabled={!userAnswer.trim()} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl">Submit for Evaluation</button>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className={`p-4 rounded-2xl ${evaluation.score >= 7 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}><Award size={32}/></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p><p className="text-3xl font-black text-slate-900">{evaluation.score} <span className="text-lg text-slate-400">/ 10</span></p></div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-indigo-600 tracking-widest">AI Feedback</h4>
                        <p className="text-base font-medium text-slate-700 leading-relaxed bg-indigo-50/30 p-6 rounded-2xl">{evaluation.feedback}</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={handleNext} className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all">{currentStep + 1 === questions.length ? "Complete Session" : "Next Question"}</button>
                        <button onClick={downloadReport} className="bg-indigo-50 text-indigo-600 p-6 rounded-3xl hover:bg-indigo-100 transition-all"><Download/></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Session History</h1>
            <div className="grid gap-4">
              {history.length === 0 ? (
                  <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
                      <Clock className="mx-auto text-slate-200 mb-4" size={48}/><p className="text-slate-400 font-bold uppercase text-xs">No sessions yet.</p>
                  </div>
              ) : history.map((h, i) => (
                <div key={i} className="group bg-white p-8 rounded-3xl border border-slate-200 flex justify-between items-center hover:border-indigo-300 transition-all cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-all"><MessageSquare size={24}/></div>
                    <div><p className="font-extrabold text-slate-900 uppercase text-sm">{h.topic?.startsWith('RESUME_MODE') ? "Resume Analysis" : h.topic}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(h.createdAt).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                     {h.resumeAnalysis?.score && <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black">{h.resumeAnalysis.score}% MATCH</div>}
                     <button onClick={(e) => { e.stopPropagation(); downloadReport(); }} className="p-3 text-slate-400 hover:text-indigo-600"><Download size={18}/></button>
                     <ChevronRight className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-10">Settings</h1>
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6"><Trash2 className="text-rose-500" size={20}/><h3 className="text-rose-500 font-black text-sm uppercase">Danger Zone</h3></div>
              <button onClick={async () => { if(window.confirm("Permanently delete everything?")){ await axios.delete(`${API_URL}/history/clear`, authHeader); setHistory([]); alert("System wiped."); } }} className="w-full bg-rose-50 text-rose-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">Clear All User Data</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SidebarItem({ active, icon, label, onClick, isOpen }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
      {icon} {isOpen && <span className="text-xs font-bold tracking-tight">{label}</span>}
    </button>
  );
}

function AuthScreen({ backgroundImage, AUTH_URL, setToken, setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [data, setData] = useState({ name: '', email: '', password: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const endpoint = isLogin ? 'login' : 'register';
      const res = await axios.post(`${AUTH_URL}/${endpoint}`, data);
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) { 
      console.error("Auth Error:", err);
      alert(err.response?.data?.message || "Authentication failed."); 
    }
    finally { setAuthLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center relative" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="absolute inset-0 bg-[#0F172A]/70 backdrop-blur-sm"></div>
      <div className="bg-white/95 backdrop-blur-xl p-12 rounded-[3.5rem] w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">SmartPrep<span className="text-indigo-600">.</span></h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{isLogin ? "Welcome Back" : "Register Here !"}</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</label>
                <input type="text" placeholder="John Doe" required className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:ring-2 ring-indigo-100 outline-none transition-all" onChange={e => setData({...data, name: e.target.value})}/>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email Address</label>
            <input type="email" placeholder="name@company.com" required className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:ring-2 ring-indigo-100 outline-none transition-all" onChange={e => setData({...data, email: e.target.value})}/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Password</label>
            <input type="password" placeholder="••••••••" required className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:ring-2 ring-indigo-100 outline-none transition-all" onChange={e => setData({...data, password: e.target.value})}/>
          </div>
          <button className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center">
            {authLoading ? <RefreshCcw className="animate-spin"/> : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-8 text-[10px] font-black text-slate-400 uppercase text-center tracking-widest hover:text-indigo-600 transition-all">
          {isLogin ? "New here? Create account" : "Already a member? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default App;
