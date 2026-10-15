import React from 'react';
import { Sparkles, Code2, PenTool, Globe, Lightbulb, Compass, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      category: 'Coding & Development',
      icon: <Code2 className="w-4 h-4 text-emerald-500" />,
      items: [
        {
          title: 'TypeScript Debounce',
          subtitle: 'Create a clean, reusable debounce function with generic types',
          prompt: 'Write a modern TypeScript debounce utility function with clear types and an example usage.',
        },
        {
          title: 'Full-stack Architecture',
          subtitle: 'Compare REST vs GraphQL vs tRPC for modern web apps',
          prompt: 'Compare REST, GraphQL, and tRPC in a table highlighting speed, type-safety, and best use cases.',
        },
      ],
    },
    {
      category: 'Hindi & Hinglish (हिंदी / हिंग्लिश)',
      icon: <Globe className="w-4 h-4 text-amber-500" />,
      items: [
        {
          title: 'Hinglish AI Explanation',
          subtitle: 'Machine Learning kaise kaam karta hai simple bhasha mein',
          prompt: 'Bhai, Hinglish mein aasan bhasha mein samjhao ki Large Language Models aur AI kaise seekhte hain?',
        },
        {
          title: 'हिंदी अध्ययन और सारांश',
          subtitle: 'जीवन में समय प्रबंधन के 5 मुख्य सिद्धांत',
          prompt: 'समय प्रबंधन (Time Management) के 5 सबसे प्रभावी सिद्धांत हिंदी में विस्तार से बताएं।',
        },
      ],
    },
    {
      category: 'Writing & Analysis',
      icon: <PenTool className="w-4 h-4 text-indigo-500" />,
      items: [
        {
          title: 'Client Pitch Email',
          subtitle: 'Draft a high-converting freelance proposal email',
          prompt: 'Draft an engaging, professional proposal email to a prospective client offering web development services.',
        },
        {
          title: 'Critical Thinking',
          subtitle: 'Break down complex concepts with clear analogies',
          prompt: 'Explain how Quantum Computing works using a simple, intuitive real-world analogy.',
        },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full text-center">
      {/* Brand Hero Badge */}
      <div className="relative mb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10 transition-transform hover:scale-105 duration-300">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/40 shadow-sm">
          3.8 FLASH
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        AI Chat Pro
      </h1>
      <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-md">
        Ask Anything. Learn Everything.
      </p>

      {/* Multi-language pill */}
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Fluent in English • हिंदी • Hinglish</span>
      </div>

      {/* Suggestions Grid */}
      <div className="mt-8 sm:mt-10 w-full grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 text-left">
        {suggestions.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {group.icon}
              <span>{group.category}</span>
            </div>

            {group.items.map((item, itemIdx) => (
              <button
                key={itemIdx}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group relative p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.subtitle}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
