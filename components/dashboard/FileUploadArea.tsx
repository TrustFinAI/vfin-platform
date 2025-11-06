import React, { useRef, useState } from 'react';

type StatementType = 'balanceSheet' | 'incomeStatement' | 'cashFlow';

interface FileUploadAreaProps {
  onFilesReady: (statements: { balanceSheet: string; incomeStatement: string; cashFlow: string }) => void;
  isLoading: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFilesReady, isLoading }) => {
  const [files, setFiles] = useState<Record<StatementType, { name: string; content: string } | null>>({
    balanceSheet: null,
    incomeStatement: null,
    cashFlow: null,
  });

  const fileInputRefs = {
    balanceSheet: useRef<HTMLInputElement>(null),
    incomeStatement: useRef<HTMLInputElement>(null),
    cashFlow: useRef<HTMLInputElement>(null),
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: StatementType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFiles(prev => ({ ...prev, [type]: { name: file.name, content } }));
    };
    reader.readAsText(file);
  };

  const handleUploadClick = (type: StatementType) => {
    fileInputRefs[type].current?.click();
  };
  
  const allFilesUploaded = files.balanceSheet && files.incomeStatement && files.cashFlow;

  const handleAnalyzeClick = () => {
    if (allFilesUploaded) {
      onFilesReady({
        balanceSheet: files.balanceSheet.content,
        incomeStatement: files.incomeStatement.content,
        cashFlow: files.cashFlow.content,
      });
    }
  };

  const renderUploadBox = (type: StatementType, title: string) => (
    <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all duration-300 ${files[type] ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary'}`}>
      <input type="file" ref={fileInputRefs[type]} onChange={(e) => handleFileChange(e, type)} className="hidden" accept=".txt,.csv" />
      {files[type] ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-700">{title}</p>
          <p className="text-xs text-gray-500 truncate max-w-full px-2">{files[type]?.name}</p>
          <button onClick={() => handleUploadClick(type)} className="mt-2 text-xs text-primary hover:underline">Change file</button>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-700">{title}</p>
          <button onClick={() => handleUploadClick(type)} className="mt-2 text-primary font-semibold hover:text-secondary">
            Upload File
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="text-center bg-white p-8 sm:p-12 rounded-lg shadow-lg animate-fade-in">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-2">Start a New Financial Analysis</h2>
        <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload your three core financial statements to begin. Our AI will analyze them together to provide a comprehensive view of your business's health.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {renderUploadBox('balanceSheet', 'Balance Sheet')}
            {renderUploadBox('incomeStatement', 'Income Statement (P&L)')}
            {renderUploadBox('cashFlow', 'Cash Flow Statement')}
        </div>
        <button
            onClick={handleAnalyzeClick}
            disabled={!allFilesUploaded || isLoading}
            className="w-full md:w-auto inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-medium rounded-full shadow-sm text-white bg-accent hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
        >
            {isLoading ? 'Analyzing...' : 'Analyze Financials'}
        </button>
    </div>
  );
};

export default FileUploadArea;
