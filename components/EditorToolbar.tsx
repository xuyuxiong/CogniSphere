
import React from 'react';
import { 
  Bold, Italic, List, ListOrdered, CheckSquare, 
  Code, Quote, Link, Image, Table, 
  GitBranch, Activity, LayoutTemplate, Workflow
} from 'lucide-react';

interface EditorToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsert }) => {
  
  const tools = [
    { icon: Bold, label: '加粗', action: () => onInsert('**加粗文本**', 2) },
    { icon: Italic, label: '斜体', action: () => onInsert('*斜体文本*', 1) },
    { separator: true },
    { icon: List, label: '无序列表', action: () => onInsert('\n- 列表项') },
    { icon: ListOrdered, label: '有序列表', action: () => onInsert('\n1. 列表项') },
    { icon: CheckSquare, label: '任务列表', action: () => onInsert('\n- [ ] 待办事项') },
    { separator: true },
    { icon: Code, label: '代码块', action: () => onInsert('\n```javascript\nconsole.log("Hello");\n```\n', 4) },
    { icon: Quote, label: '引用', action: () => onInsert('\n> 引用内容') },
    { icon: Table, label: '表格', action: () => onInsert('\n| 标题1 | 标题2 | 标题3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |\n', 0) },
    { separator: true },
    { icon: Link, label: '链接', action: () => onInsert('[链接文字](url)', 1) },
    { icon: Image, label: '图片', action: () => onInsert('![图片描述](url)', 2) },
  ];

  const diagrams = [
    { icon: GitBranch, label: '流程图', template: '\n```mermaid\ngraph TD\n    A[开始] --> B{判断}\n    B -->|是| C[执行]\n    B -->|否| D[结束]\n    C --> D\n```\n' },
    { icon: Activity, label: '时序图', template: '\n```mermaid\nsequenceDiagram\n    Alice->>John: Hello John, how are you?\n    John-->>Alice: Great!\n    Alice-)John: See you later!\n```\n' },
    { icon: LayoutTemplate, label: '类图', template: '\n```mermaid\nclassDiagram\n    Animal <|-- Duck\n    Animal <|-- Fish\n    Animal : +int age\n    Animal : +String gender\n    Animal: +isMammal()\n    Animal: +mate()\n```\n' },
    { icon: Workflow, label: '思维导图', template: '\n```mermaid\nmindmap\n  root((核心主题))\n    起源\n      长期演变\n      流行文化\n    用途\n      创意写作\n      项目规划\n```\n' },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-dark-card flex-wrap">
      {tools.map((tool, idx) => (
        tool.separator ? (
          <div key={idx} className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        ) : (
          <button
            key={idx}
            onClick={tool.action}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
            title={tool.label}
          >
            {tool.icon && <tool.icon size={16} />}
          </button>
        )
      ))}
      
      <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
      <span className="text-[10px] text-gray-400 font-bold px-1 uppercase">画板</span>
      
      {diagrams.map((d, idx) => (
         <button
            key={`diag-${idx}`}
            onClick={() => onInsert(d.template)}
            className="p-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-colors"
            title={d.label}
          >
            <d.icon size={16} />
          </button>
      ))}
    </div>
  );
};
