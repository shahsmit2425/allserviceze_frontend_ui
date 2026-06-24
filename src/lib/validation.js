/**
 * Client-side field length/pattern constants that mirror the backend Pydantic constraints.
 * Keep in sync with backend/server.py field_validator definitions.
 */

export const LIMITS = {
  // Projects
  projectTitle: 100,
  projectDescription: 2000,

  // Bids
  bidProposal: 5000,

  // Reviews
  reviewComment: 3000,
  reviewReply: 2000,

  // Bookings
  bookingAddress: 500,
  bookingNotes: 1000,
  bookingCancelReason: 1000,

  // Portfolio
  portfolioTitle: 255,
  portfolioDescription: 3000,
  portfolioCategory: 100,
  portfolioLocation: 255,

  // Provider profile
  bio: 2000,
  providerFullName: 100,
  providerPhone: 20,
  providerLocation: 255,

  // Questions
  projectQuestion: 1000,
  questionAnswer: 2000,

  // Reviews (google)
  googleReviewerName: 100,
  googleReviewText: 3000,
};

export const PATTERNS = {
  // "YYYY-MM-DD"
  date: /^\d{4}-\d{2}-\d{2}$/,
  // "HH:MM" 24-hour
  time: /^([01]\d|2[0-3]):[0-5]\d$/,
};
