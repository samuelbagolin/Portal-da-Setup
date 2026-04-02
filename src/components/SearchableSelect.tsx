import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  cnpj?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  label,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.cnpj && opt.cnpj.includes(searchTerm))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 border rounded-lg cursor-pointer flex items-center justify-between bg-white transition-all ${
          isOpen ? 'ring-2 ring-primary border-transparent' : 'border-gray-300 hover:border-gray-400'
        } ${!label ? 'bg-gray-50 border-gray-200' : ''}`}
      >
        <span className={`truncate text-sm ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex flex-col ${
                    value === option.id ? 'bg-primary/5 text-primary' : 'text-gray-700'
                  }`}
                >
                  <span className="font-medium">{option.name}</span>
                  {option.cnpj && (
                    <span className="text-xs text-gray-400">{option.cnpj}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Nenhum cliente encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
