import { useState, useEffect, useRef } from "react";
import logger from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Search, Loader2, User, Briefcase, X, TrendingUp } from "lucide-react";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

export const SearchBar = ({ 
  placeholder = "Search projects and providers...", 
  className = "",
  autoFocus = false,
  value,
  onValueChange = null,
  onSearch = null, // Optional callback for custom search handling
  showAutocomplete = true,
  size = "default" // "default" | "large"
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (typeof value === "string" && value !== query) {
      setQuery(value);
    }
  }, [value, query]);

  useEffect(() => {
    // Click outside to close dropdown
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (!showAutocomplete) return;

    // Debounce autocomplete requests
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/search/autocomplete`, {
        params: { q: query, limit: 8 },
        withCredentials: true
      });
      setSuggestions(response.data.suggestions || []);
      setShowDropdown(true);
    } catch (error) {
      logger.error("Autocomplete error:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    
    setShowDropdown(false);
    setSuggestions([]);
    
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'provider') {
      navigate(`/providers/${suggestion.id}`);
    } else if (suggestion.type === 'project') {
      navigate(`/projects/${suggestion.id}`);
    } else {
      // Generic suggestion, perform search
      setQuery(suggestion.text);
      onValueChange?.(suggestion.text);
      handleSearch(suggestion.text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const clearSearch = () => {
    setQuery("");
    onValueChange?.("");
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'provider':
        return <User className="w-4 h-4" />;
      case 'project':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'provider':
        return "border border-primary/12 bg-primary/10 text-primary";
      case 'project':
        return "border border-emerald-600/12 bg-emerald-600/10 text-emerald-700";
      default:
        return "border border-border/80 bg-background text-foreground/72";
    }
  };

  const inputSizeClasses = size === "large" 
    ? "h-16 rounded-[1.35rem] border-border/80 bg-background/94 pl-14 pr-12 text-base shadow-[0_22px_56px_-36px_rgba(15,23,42,0.14)]" 
    : "h-12 rounded-[1.05rem] border-border/80 bg-background/92 pl-11 pr-10 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)]";

  const iconSizeClasses = size === "large"
    ? "w-6 h-6 left-4"
    : "w-5 h-5 left-3";

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${iconSizeClasses}`} />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onValueChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          autoFocus={autoFocus}
          className={inputSizeClasses}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/88 p-1 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <Card className="absolute top-full z-50 mt-3 max-h-[28rem] w-full overflow-y-auto rounded-[1.45rem] border border-border/80 bg-background/96 p-2 shadow-[0_26px_80px_-52px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.id || index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left transition-all duration-200 ${
                  index === selectedIndex
                    ? "bg-accent/90 text-foreground shadow-sm"
                    : "hover:bg-muted/65"
                }`}
              >
                <div className={`rounded-xl p-2 shadow-sm ${getTypeColor(suggestion.type)}`}>
                  {getTypeIcon(suggestion.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {suggestion.text}
                  </div>
                  {suggestion.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.subtitle}
                    </div>
                  )}
                </div>

                {suggestion.category && (
                  <Badge variant="outline" className="text-xs">
                    {suggestion.category}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
