import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const DEFAULT_CATEGORY_SETS = {
  all: [
    "Plumbing", "Electrical", "HVAC", "Cleaning", "Carpet Cleaning", "Painting",
    "Carpentry", "Handyman", "AC Repair", "Appliance Repair", "Gardening",
    "Roofing", "Flooring", "Remodeling", "Pest Control",
    "Junk Removal", "Window Cleaning", "Gutter Cleaning", "Pressure Washing",
    "Lawn Care", "Tree Services", "Snow Removal", "Fence & Deck",
    "Moving", "Smart Home / Security", "TV Mounting"
  ],
  project_posting: [
    "Plumbing",
    "Electrical",
    "HVAC",
    "Cleaning",
    "Lawn Care",
    "Handyman",
    "Junk Removal",
    "Gutter Cleaning",
    "Window Cleaning",
    "Pressure Washing",
    "Carpet Cleaning",
    "Painting"
  ]
};

// Module-level cache so all components share a single fetch per scope.
let _cacheByScope = {};
let _promiseByScope = {};

export function useCategories({ includeAll = false, scope = "all" } = {}) {
  const normalizedScope = scope === "project_posting" ? "project_posting" : "all";
  const fallbackCategories = DEFAULT_CATEGORY_SETS[normalizedScope] ?? DEFAULT_CATEGORY_SETS.all;
  const base = _cacheByScope[normalizedScope] ?? fallbackCategories;
  const [categories, setCategories] = useState(includeAll ? ["All", ...base] : base);

  useEffect(() => {
    if (_cacheByScope[normalizedScope]) {
      setCategories(includeAll ? ["All", ..._cacheByScope[normalizedScope]] : _cacheByScope[normalizedScope]);
      return;
    }
    if (!_promiseByScope[normalizedScope]) {
      const params = normalizedScope === "all" ? undefined : { scope: normalizedScope };
      _promiseByScope[normalizedScope] = axios
        .get(`${API_URL}/categories`, { withCredentials: false, params })
        .then((res) => {
          _cacheByScope[normalizedScope] = res.data.categories;
          return _cacheByScope[normalizedScope];
        })
        .catch(() => {
          _cacheByScope[normalizedScope] = fallbackCategories;
          return _cacheByScope[normalizedScope];
        });
    }
    _promiseByScope[normalizedScope].then((cats) => setCategories(includeAll ? ["All", ...cats] : cats));
  }, [includeAll, normalizedScope, fallbackCategories]);

  return categories;
}
