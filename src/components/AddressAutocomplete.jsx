import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import logger from "@/utils/logger";
import { Input } from "./ui/input";
import { MapPin } from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

export const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onZipCodeChange,  // New callback for zip code
  suggestionType = "address",
  placeholder = "Enter your address",
  className = "",
  testId = "address-input"
}) => {
  const inputRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!value || value.trim().length < 3 || !isFocused) {
      setSuggestions([]);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/locations/autocomplete`, {
          params: {
            q: value.trim(),
            suggestion_type: suggestionType,
          },
        });

        if (!cancelled) {
          setSuggestions(response.data?.suggestions || []);
        }
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
        }
        logger.error("Error fetching location suggestions:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isFocused, suggestionType, value]);

  useEffect(() => () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
  }, []);

  const showSuggestions = useMemo(
    () => isFocused && suggestions.length > 0,
    [isFocused, suggestions.length]
  );

  const handleSelect = async (suggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setIsFocused(false);

    if (!onZipCodeChange || !suggestion.place_id) {
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/locations/details/${suggestion.place_id}`);
      const zipCode = response.data?.zip_code;
      if (zipCode) {
        onZipCodeChange(zipCode);
      }
      if (response.data?.formatted_address) {
        onChange(response.data.formatted_address);
      }
    } catch (error) {
      logger.error("Error fetching location details:", error);
    }
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className={`pl-10 ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (blurTimeoutRef.current) {
            window.clearTimeout(blurTimeoutRef.current);
          }
          setIsFocused(true);
        }}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => setIsFocused(false), 150);
        }}
        data-testid={testId}
        autoComplete="off"
      />
      {showSuggestions && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(suggestion)}
            >
              <span className="text-sm font-medium text-foreground">{suggestion.primary_text}</span>
              {suggestion.secondary_text ? (
                <span className="text-xs text-muted-foreground">{suggestion.secondary_text}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      {isFocused && isLoading && !showSuggestions ? (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-lg">
          Searching locations...
        </div>
      ) : null}
    </div>
  );
};
