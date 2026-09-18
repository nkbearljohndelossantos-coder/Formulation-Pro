import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

/**
 * Modern SearchableSelect Dropdown
 * 
 * Features:
 * - Live real-time search across label, sublabel/code, or custom fields
 * - Positioned with fixed coordinates so it NEVER gets clipped by overflow-x / table containers
 * - Auto-focuses search input when opened
 * - Keyboard navigation (Up/Down/Enter/Escape)
 * - Click-outside detection
 * - Clean UI with option badges & selection checks
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  getOptionValue = (opt) => opt?.id ?? opt?.value,
  getOptionLabel = (opt) => opt?.name ?? opt?.label ?? String(opt ?? ''),
  getOptionSublabel = (opt) => opt?.code ?? opt?.sublabel ?? '',
  placeholder = '-- Select --',
  searchPlaceholder = 'Search material or code...',
  className = '',
  disabled = false,
  emptyMessage = 'No matching items found',
  widthClass = 'w-64',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280 });

  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Find currently selected option object
  const selectedOption = options.find(
    (opt) => String(getOptionValue(opt)) === String(value)
  );

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const label = String(getOptionLabel(opt) || '').toLowerCase();
    const sub = String(getOptionSublabel(opt) || '').toLowerCase();
    return label.includes(term) || sub.includes(term);
  });

  // Calculate fixed screen coordinates to prevent table clipping
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const popoverHeight = 280;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < popoverHeight && rect.top > popoverHeight;

        const popWidth = Math.max(rect.width, 280);
        let leftPos = rect.left;
        if (leftPos + popWidth > window.innerWidth - 10) {
          leftPos = window.innerWidth - popWidth - 10;
        }

        setCoords({
          top: openUpwards ? rect.top - popoverHeight - 4 : rect.bottom + 4,
          left: Math.max(10, leftPos),
          width: popWidth,
        });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev <= 0 ? (filteredOptions.length || 1) - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightIndex]) {
        selectOption(filteredOptions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const selectOption = (opt) => {
    const val = getOptionValue(opt);
    onChange(val, opt);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative inline-block ${widthClass}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={
          className ||
          `w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-medium flex items-center justify-between gap-1.5 shadow-2xs hover:border-slate-400 focus:outline-none focus:border-blue-600 transition text-left ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
          }`
        }
      >
        <div className="truncate flex items-center gap-1.5 min-w-0">
          {selectedOption ? (
            <>
              {getOptionSublabel(selectedOption) && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                  {getOptionSublabel(selectedOption)}
                </span>
              )}
              <span className="truncate font-semibold text-slate-900">
                {getOptionLabel(selectedOption)}
              </span>
            </>
          ) : (
            <span className="text-slate-400 italic truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Floating Popover Search Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-300 rounded-xl shadow-2xl p-2 space-y-2 text-xs font-sans text-slate-900 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  if (inputRef.current) inputRef.current.focus();
                }}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtered Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs italic">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = getOptionValue(opt);
                const optLabel = getOptionLabel(opt);
                const optSub = getOptionSublabel(opt);
                const isSelected = String(optVal) === String(value);
                const isHighlighted = idx === highlightIndex;

                return (
                  <button
                    key={optVal || idx}
                    type="button"
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`w-full text-left px-2.5 py-2 text-xs flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-1.5">
                        {optSub && (
                          <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold shrink-0">
                            {optSub}
                          </span>
                        )}
                        <span className="truncate">{optLabel}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Counter */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-0.5 border-t border-slate-100 font-medium">
            <span>{filteredOptions.length} available</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
