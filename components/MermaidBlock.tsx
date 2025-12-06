
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  chart: string;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif'
});

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Re-initialize theme when dark mode changes (MutationObserver could be better, but simple check here)
    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({ 
        startOnLoad: false, 
        theme: isDark ? 'dark' : 'default',
        themeVariables: isDark ? { darkMode: true, background: '#1e293b' } : {} 
    });
  }, [chart]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        setError(null);
        // Validating syntax somewhat by rendering
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (err) {
        console.error("Mermaid Render Error", err);
        setError("无法渲染图表，请检查语法。");
        // Mermaid leaves artifacts in the DOM on error sometimes
        const errorElement = document.querySelector(`#${id}`);
        if (errorElement) errorElement.remove();
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded text-xs font-mono">
        <p className="font-bold">图表渲染错误:</p>
        {error}
        <pre className="mt-2 text-[10px] text-red-400">{chart}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="mermaid-container my-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
