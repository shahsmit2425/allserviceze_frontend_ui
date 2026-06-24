export const isTruthyEnvFlag = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalizedValue);
};